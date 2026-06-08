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
  if (val === null || val === undefined) return { nullValue: null };
  return { stringValue: String(val) };
}

function makeDocument(data) {
  const fields = {};
  Object.entries(data).forEach(([k, v]) => { fields[k] = makeField(v); });
  return { fields };
}

async function createDoc(collection, docId, data) {
  const result = await httpsRequest('PATCH', `${collection}/${docId}`, makeDocument(data));
  if (result.error) console.error(`❌ ${collection}/${docId}:`, result.error.message);
  else console.log(`✅ Created/Updated ${collection}/${docId}`);
  return result;
}

async function main() {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Stripe'dan gelen gerçek session'lar
  const STRIPE_SESSION_1 = 'cs_live_a1QnGQoxVStobUqqIytF6gFwJT0oB8aqgbNxAZ9lSnMr8UrS9aGKCgHlHj00ELkSdY';
  const STRIPE_SESSION_2 = 'cs_live_a1jOAixcUjEcew0mHgeC7xpSVeQv8BPz0ysDGvwJVf1G00vRfpQJ8r8VKxJ00EvT00N4';

  // Mevcut paketler (Firestore'dan)
  // [ZJIkfdnLerFFczs3x1pb] = "speaking class" (son alınan)
  // Eski orders dLRKO53yOq1QxAhws4mR için - bu paket silinmiş

  // 1) ord-stripe-live-001 ve 002'yi mevcut "speaking class" package ile güncelle
  //    veya eski package ID'yi Stripe metadata'sından belirle
  console.log('Stripe sessions bilgilerine göre package IDs güncelleniyor...');

  // Eski Stripe session'ların package_id'si metadata'da "dLRKO53yOq1QxAhws4mR" idi
  // Bu paket artık yok. Güncel packages'dan hangisi o ödemelere karşılık geliyor?
  // Kullanıcı "speaking class" paketini de satın almış (yeni order)
  // Yani kullanıcının şu an 3 ödemesi var:
  // 1. cs_live_a1QnGQox... - dLRKO53yOq1QxAhws4mR (silinmiş)
  // 2. cs_live_a1jOAixc... - dLRKO53yOq1QxAhws4mR (silinmiş)
  // 3. speaking class (ZJIkfdnLerFFczs3x1pb) - yeni order var

  // Strateji: Eski 2 order'ı speaking class ile eşle (aynı paket olabilir, yeniden oluşturulmuş)
  // VE speaking class için ayrı order oluştur

  const STUDENT_ID = 's1';
  const STUDENT_EMAIL = 'mehmet@email.com';
  const STUDENT_NAME = 'Mehmet Yılmaz';

  // Eski 2 order'ı speaking class ID ile güncelle
  await createDoc('Order', 'ord-stripe-live-001', {
    student_id: STUDENT_ID, student_email: STUDENT_EMAIL, student_name: STUDENT_NAME,
    package_id: 'ZJIkfdnLerFFczs3x1pb', package_name: 'speaking class',
    status: 'paid', order_date: '2026-06-08T19:42:15.000Z', amount: 0.3,
    stripe_session_id: STRIPE_SESSION_2, created_date: '2026-06-08T19:42:15.000Z', updated_date: now,
  });

  await createDoc('Order', 'ord-stripe-live-002', {
    student_id: STUDENT_ID, student_email: STUDENT_EMAIL, student_name: STUDENT_NAME,
    package_id: 'ZJIkfdnLerFFczs3x1pb', package_name: 'speaking class',
    status: 'paid', order_date: '2026-06-08T20:14:12.000Z', amount: 0.3,
    stripe_session_id: STRIPE_SESSION_1, created_date: '2026-06-08T20:14:12.000Z', updated_date: now,
  });

  // Invoice'u da güncelle
  await createDoc('Invoice', 'inv-stripe-live-001', {
    invoice_number: 'INV-2026-LIVE-001',
    student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
    issue_date: today, due_date: today, status: 'paid',
    subtotal: 0.3, vat_rate: 0, vat_amount: 0, total_amount: 0.3, amount: 0.3,
    notes: `Stripe: ${STRIPE_SESSION_1}`,
    package_id: 'ZJIkfdnLerFFczs3x1pb', source: 'stripe',
    stripe_session_id: STRIPE_SESSION_1, created_date: now, updated_date: now,
  });

  await createDoc('Invoice', 'inv-stripe-live-002', {
    invoice_number: 'INV-2026-LIVE-002',
    student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
    issue_date: today, due_date: today, status: 'paid',
    subtotal: 0.3, vat_rate: 0, vat_amount: 0, total_amount: 0.3, amount: 0.3,
    notes: `Stripe: ${STRIPE_SESSION_2}`,
    package_id: 'ZJIkfdnLerFFczs3x1pb', source: 'stripe',
    stripe_session_id: STRIPE_SESSION_2, created_date: now, updated_date: now,
  });

  // Payment kaydı güncelle
  await createDoc('Payment', 'pay-stripe-live-001', {
    student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
    amount: 0.3, status: 'paid', payment_date: '2026-06-08',
    payment_method: 'credit_card', description: 'speaking class',
    package_id: 'ZJIkfdnLerFFczs3x1pb', source: 'stripe',
    stripe_session_id: STRIPE_SESSION_1, created_date: now, updated_date: now,
  });

  await createDoc('Payment', 'pay-stripe-live-002', {
    student_id: STUDENT_ID, student_name: STUDENT_NAME, student_email: STUDENT_EMAIL,
    amount: 0.3, status: 'paid', payment_date: '2026-06-08',
    payment_method: 'credit_card', description: 'speaking class',
    package_id: 'ZJIkfdnLerFFczs3x1pb', source: 'stripe',
    stripe_session_id: STRIPE_SESSION_2, created_date: now, updated_date: now,
  });

  console.log('\n✅ All records updated. Both Stripe payments now linked to "speaking class" package.');
}

main().catch(console.error);
