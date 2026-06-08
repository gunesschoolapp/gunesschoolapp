/**
 * Tüm ödenmemiş (Firestore'da Order'ı olmayan) Stripe session'larını
 * otomatik olarak Firestore'a sync eder.
 * 
 * Kullanım: node sync_all_stripe.js
 */

require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const https = require('https');

const PROJECT = 'gunes-english';

// ─── Firestore REST helpers ───────────────────────────────
function httpsRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function makeField(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(makeField) } };
  return { nullValue: null };
}

function makeDocument(data) {
  const fields = {};
  Object.entries(data).forEach(([k, v]) => { fields[k] = makeField(v); });
  return { fields };
}

function parseVal(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  return null;
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = {};
  Object.entries(doc.fields || {}).forEach(([k, v]) => { fields[k] = parseVal(v); });
  return { id, ...fields };
}

async function listCollection(col) {
  const result = await httpsRequest('GET', `${col}?pageSize=100`);
  return (result.documents || []).map(parseDoc);
}

async function createDoc(col, id, data) {
  const r = await httpsRequest('PATCH', `${col}/${id}`, makeDocument(data));
  if (r.error) { console.error(`  ❌ ${col}/${id}:`, r.error.message || JSON.stringify(r.error)); return false; }
  console.log(`  ✅ ${col}/${id}`);
  return true;
}

async function docExists(col, id) {
  const r = await httpsRequest('GET', `${col}/${id}`);
  return !r.error && !!r.name;
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('🔄 Stripe → Firestore Sync başlıyor...\n');

  // 1) Firestore'daki mevcut Order'ları çek
  const existingOrders = await listCollection('Order');
  const syncedSessions = new Set(existingOrders.map(o => o.stripe_session_id).filter(Boolean));
  console.log(`Firestore'da ${existingOrders.length} Order var (${syncedSessions.size} Stripe session kayıtlı)\n`);

  // 2) Firestore Package'larını çek (ID → name map)
  const packages = await listCollection('Package');
  const pkgMap = {};
  packages.forEach(p => { pkgMap[p.id] = p; });
  console.log(`Firestore'da ${packages.length} Package var\n`);

  // 3) Stripe'dan tüm başarılı session'ları çek
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const paidSessions = sessions.data.filter(s => s.payment_status === 'paid');
  console.log(`Stripe'da ${paidSessions.length} ödenmiş session var\n`);

  // 4) Firestore'da Order'ı olmayan session'ları sync et
  const toSync = paidSessions.filter(s => !syncedSessions.has(s.id));
  console.log(`Sync edilecek ${toSync.length} yeni session:\n`);

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  let synced = 0;

  for (const session of toSync) {
    const meta = session.metadata || {};
    const packageId = meta.packageId;
    const studentEmail = meta.studentEmail || session.customer_email;
    const studentName = meta.studentName || 'Bilinmeyen';
    const amount = (session.amount_total || 0) / 100;
    const sessionDate = new Date(session.created * 1000).toISOString();

    const pkg = pkgMap[packageId];
    const pkgName = pkg?.name || meta.packageName || 'Paket';

    console.log(`📦 ${session.id.slice(-20)}`);
    console.log(`   Paket: ${pkgName} (${packageId})`);
    console.log(`   Email: ${studentEmail} | Tutar: £${amount}`);

    // student_id'yi Firestore'dan bul
    const students = await listCollection('Student');
    const student = students.find(s => s.email === studentEmail);
    const studentId = student?.id || 's1';

    const orderId = `ord-stripe-${session.id.slice(-12)}`;
    const invId = `inv-stripe-${session.id.slice(-12)}`;
    const payId = `pay-stripe-${session.id.slice(-12)}`;
    const invNum = `INV-${new Date(session.created*1000).getFullYear()}-${session.id.slice(-6).toUpperCase()}`;

    // Order
    await createDoc('Order', orderId, {
      student_id: studentId, student_email: studentEmail, student_name: studentName,
      package_id: packageId, package_name: pkgName,
      status: 'paid', order_date: sessionDate, amount,
      stripe_session_id: session.id, created_date: sessionDate, updated_date: now,
    });

    // Invoice
    await createDoc('Invoice', invId, {
      invoice_number: invNum,
      student_id: studentId, student_name: studentName, student_email: studentEmail,
      issue_date: today, due_date: today, status: 'paid',
      subtotal: amount, vat_rate: 0, vat_amount: 0, total_amount: amount, amount,
      notes: `Stripe: ${session.id}`,
      package_id: packageId, source: 'stripe', stripe_session_id: session.id,
      created_date: sessionDate, updated_date: now,
    });

    // Payment
    await createDoc('Payment', payId, {
      student_id: studentId, student_name: studentName, student_email: studentEmail,
      amount, status: 'paid', payment_date: today,
      payment_method: 'credit_card', description: pkgName,
      package_id: packageId, source: 'stripe', stripe_session_id: session.id,
      created_date: sessionDate, updated_date: now,
    });

    synced++;
    console.log('');
  }

  if (synced === 0) {
    console.log('✅ Tüm Stripe ödemeleri zaten Firestore\'da kayıtlı!');
  } else {
    console.log(`\n✅ ${synced} yeni ödeme Firestore'a sync edildi.`);
  }
}

main().catch(console.error);
