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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); }
      });
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

async function createDoc(col, id, data) {
  const r = await httpsRequest('PATCH', `${col}/${id}`, makeDocument(data));
  if (r.error) console.error(`❌ ${col}/${id}:`, r.error.message);
  else console.log(`✅ ${col}/${id}`);
}

async function main() {
  const now = new Date().toISOString();
  const today = '2026-06-08';

  // Firestore'da mevcut "speaking class" paketi
  // (Stripe metadata'daki dLRKO53yOq1QxAhws4mR silinip yeniden oluşturulmuş olabilir)
  // Şu an Firestore'da speaking class = ZJIkfdnLerFFczs3x1pb
  const PKG_ID = 'ZJIkfdnLerFFczs3x1pb';
  const PKG_NAME = 'speaking class';

  const STUDENT_ID = 's1';
  const STUDENT_EMAIL = 'mehmet@email.com';
  const STUDENT_NAME = 'Mehmet Yılmaz';

  // 3 gerçek Stripe ödemesi
  const payments = [
    { session: 'cs_live_a1jOAixcUjEcew0mHgeC7xtsyyXSlsYl', amount: 1.0, date: '2026-06-08T19:42:15.000Z', orderId: 'ord-stripe-live-001', invId: 'inv-stripe-live-001', payId: 'pay-stripe-live-001' },
    { session: 'cs_live_a1QnGQoxVStobUqqIytF6g7SJSXaacon', amount: 0.3, date: '2026-06-08T20:14:12.000Z', orderId: 'ord-stripe-live-002', invId: 'inv-stripe-live-002', payId: 'pay-stripe-live-002' },
    { session: 'cs_live_a1xUcIDybNF4jinjJX6eIerqxDEhtQ87', amount: 0.3, date: '2026-06-08T20:24:46.000Z', orderId: 'ord-stripe-live-003', invId: 'inv-stripe-live-003', payId: 'pay-stripe-live-003' },
  ];

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const num = i + 1;

    await createDoc('Order', p.orderId, {
      student_id: STUDENT_ID, student_email: STUDENT_EMAIL, student_name: STUDENT_NAME,
      package_id: PKG_ID, package_name: PKG_NAME,
      status: 'paid', order_date: p.date, amount: p.amount,
      stripe_session_id: p.session, created_date: p.date, updated_date: now,
    });

    await createDoc('Invoice', p.invId, {
      invoice_number: `INV-2026-LIVE-00${num}`,
      student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
      issue_date: today, due_date: today, status: 'paid',
      subtotal: p.amount, vat_rate: 0, vat_amount: 0, total_amount: p.amount, amount: p.amount,
      notes: `Stripe: ${p.session.slice(0, 30)}`,
      package_id: PKG_ID, source: 'stripe', stripe_session_id: p.session,
      created_date: p.date, updated_date: now,
    });

    await createDoc('Payment', p.payId, {
      student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
      amount: p.amount, status: 'paid', payment_date: today,
      payment_method: 'credit_card', description: PKG_NAME,
      package_id: PKG_ID, source: 'stripe', stripe_session_id: p.session,
      created_date: p.date, updated_date: now,
    });
  }

  console.log('\n✅ All 3 Stripe payments synced to Firestore (Order + Invoice + Payment each)');
}

main().catch(console.error);
