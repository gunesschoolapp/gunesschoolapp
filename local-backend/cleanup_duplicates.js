/**
 * Firestore'daki sahte (manüel oluşturulan) Order/Invoice/Payment kayıtlarını siler.
 * Gerçek Stripe session ID'leri olan 4 kayıt korunur.
 */

const https = require('https');
const PROJECT = 'gunes-english';

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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function parseVal(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  return null;
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = {};
  Object.entries(doc.fields || {}).forEach(([k, v]) => { fields[k] = parseVal(v); });
  return { id, ...fields };
}

async function listCollection(col) {
  const r = await httpsRequest('GET', `${col}?pageSize=200`);
  return (r.documents || []).map(parseDoc);
}

async function deleteDoc(col, id) {
  const r = await httpsRequest('DELETE', `${col}/${id}`);
  if (r.error) { console.log(`  ❌ ${col}/${id}: ${r.error.message}`); return false; }
  console.log(`  🗑️  Deleted ${col}/${id}`);
  return true;
}

async function main() {
  // Gerçek Stripe session ID'leri (bunları tutan Order'lar korunacak)
  const REAL_STRIPE_SESSIONS = new Set([
    'cs_live_a1A83EXWKSbacgKf6Q93FYRPntQQaiTHlCsh4FjiBY6p0aHBsnOmCId9b6', // Talking Package
    'cs_live_a1QnGQoxVStobUqqIytF6g7SJSXaacon3x0Bvr4p4IVCyvJ0YMGQzjTbhwls', // 23:14
    'cs_live_a1jOAixcUjEcew0mHgeC7xtsyyXSlsYlS6Ik86f9kZRFuiodHf6IFfMUj00h8', // 22:42
    'cs_live_a1I6TKHg8rZSUWOqYVSoaifJt2J8aw4TMuAkYRJxbFAqOkjkxvqNKS0Bew', // extra
  ]);

  // suffix'e göre gerçek olanlar (son 12 karakter)
  const REAL_SUFFIXES = new Set([
    'HBsnOmCId9b6',  // Talking Package
    'j4193v2ruCRS',  // 23:24
    'NdgpyCNAPF1L',  // 23:14
    'I6TKHg8rZSUW',  // 22:42
  ]);

  console.log('=== Mevcut Orders ===');
  const orders = await listCollection('Order');
  orders.forEach(o => {
    const suffix = o.id.replace('ord-stripe-', '');
    const isReal = REAL_SUFFIXES.has(suffix);
    console.log(`  ${isReal ? '✅' : '❌'} [${o.id}] pkg:${o.package_id?.slice(-10)} session:${(o.stripe_session_id||'none').slice(-12)}`);
  });

  console.log('\n=== Silinecekler ===');
  // Silme: live-001, live-002, live-003 ve bunların inv/pay karşılıkları
  const FAKE_IDS = ['live-001', 'live-002', 'live-003'];

  for (const suffix of FAKE_IDS) {
    await deleteDoc('Order', `ord-stripe-${suffix}`);
    await deleteDoc('Invoice', `inv-stripe-${suffix}`);
    await deleteDoc('Payment', `pay-stripe-${suffix}`);
  }

  console.log('\n=== Kalan Orders (doğrulama) ===');
  const remaining = await listCollection('Order');
  remaining.forEach(o => {
    console.log(`  ✅ [${o.id}] email:${o.student_email} | pkg_id:${o.package_id?.slice(-10)} | amount:${o.amount}`);
  });
  console.log(`  Toplam: ${remaining.length} (beklenen: 4)`);
}

main().catch(console.error);
