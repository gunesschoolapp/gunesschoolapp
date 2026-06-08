/**
 * Firebase Firestore'a Stripe ödemeleri için Order, Invoice, Payment kaydı yazar.
 * Firebase Web SDK (browser uyumlu fetch API kullanır)
 */

const https = require('https');

const PROJECT = 'gunes-english';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Gerçek Stripe session bilgileri
const REAL_PACKAGE_ID = 'dLRKO53yOq1QxAhws4mR';
const REAL_PACKAGE_NAME = 'deneme';
const REAL_PRICE = 1200;
const STUDENT_ID = 's1';
const STUDENT_EMAIL = 'mehmet@email.com';
const STUDENT_NAME = 'Mehmet Yılmaz';

const STRIPE_SESSION_1 = 'cs_live_a1QnGQoxVStobUqqIytF6gFwJT0oB8aqgbNxAZ9lSnMr8UrS9aGKCgHlHj00ELkSdY';
const STRIPE_SESSION_2 = 'cs_live_a1jOAixcUjEcew0mHgeC7xpSVeQv8BPz0ysDGvwJVf1G00vRfpQJ8r8VKxJ00EvT00N4';

function makeField(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(makeField) } };
  if (val === null) return { nullValue: null };
  return { stringValue: String(val) };
}

function makeDocument(data) {
  const fields = {};
  Object.entries(data).forEach(([k, v]) => {
    fields[k] = makeField(v);
  });
  return { fields };
}

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
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function createDoc(collection, docId, data) {
  const result = await httpsRequest(
    'PATCH',
    `${collection}/${docId}`,
    makeDocument(data)
  );
  if (result.error) {
    console.error(`❌ Error creating ${collection}/${docId}:`, result.error.message || result.error);
  } else {
    console.log(`✅ Created ${collection}/${docId}`);
  }
  return result;
}

async function checkExists(collection, docId) {
  const result = await httpsRequest('GET', `${collection}/${docId}`);
  return !result.error;
}

async function main() {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  console.log('🔥 Firebase Firestore - Order/Invoice/Payment seed');
  console.log('Package:', REAL_PACKAGE_ID, '|', REAL_PACKAGE_NAME);
  console.log('Student:', STUDENT_EMAIL);
  console.log('');

  // --- Order 1 (Stripe session 1) ---
  const ord1Id = 'ord-stripe-live-001';
  if (await checkExists('Order', ord1Id)) {
    console.log('ℹ️  Order 1 already exists');
  } else {
    await createDoc('Order', ord1Id, {
      student_id: STUDENT_ID,
      student_email: STUDENT_EMAIL,
      student_name: STUDENT_NAME,
      package_id: REAL_PACKAGE_ID,
      package_name: REAL_PACKAGE_NAME,
      status: 'paid',
      order_date: '2026-06-08T20:14:12.000Z',
      amount: REAL_PRICE,
      stripe_session_id: STRIPE_SESSION_1,
      created_date: now,
      updated_date: now,
    });
  }

  // --- Order 2 (Stripe session 2) ---
  const ord2Id = 'ord-stripe-live-002';
  if (await checkExists('Order', ord2Id)) {
    console.log('ℹ️  Order 2 already exists');
  } else {
    await createDoc('Order', ord2Id, {
      student_id: STUDENT_ID,
      student_email: STUDENT_EMAIL,
      student_name: STUDENT_NAME,
      package_id: REAL_PACKAGE_ID,
      package_name: REAL_PACKAGE_NAME,
      status: 'paid',
      order_date: '2026-06-08T19:42:15.000Z',
      amount: REAL_PRICE,
      stripe_session_id: STRIPE_SESSION_2,
      created_date: now,
      updated_date: now,
    });
  }

  // --- Invoice (Stripe) ---
  const invId = 'inv-stripe-live-001';
  if (await checkExists('Invoice', invId)) {
    console.log('ℹ️  Invoice already exists');
  } else {
    await createDoc('Invoice', invId, {
      invoice_number: 'INV-2026-LIVE-001',
      student_id: STUDENT_ID,
      student_name: STUDENT_NAME,
      student_email: STUDENT_EMAIL,
      issue_date: today,
      due_date: today,
      status: 'paid',
      subtotal: REAL_PRICE,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: REAL_PRICE,
      amount: REAL_PRICE,
      notes: `Stripe Session: ${STRIPE_SESSION_1}`,
      package_id: REAL_PACKAGE_ID,
      source: 'stripe',
      stripe_session_id: STRIPE_SESSION_1,
      created_date: now,
      updated_date: now,
    });
  }

  // --- Payment ---
  const payId = 'pay-stripe-live-001';
  if (await checkExists('Payment', payId)) {
    console.log('ℹ️  Payment already exists');
  } else {
    await createDoc('Payment', payId, {
      student_id: STUDENT_ID,
      student_name: STUDENT_NAME,
      student_email: STUDENT_EMAIL,
      amount: REAL_PRICE,
      status: 'paid',
      payment_date: today,
      payment_method: 'credit_card',
      description: REAL_PACKAGE_NAME,
      package_id: REAL_PACKAGE_ID,
      source: 'stripe',
      stripe_session_id: STRIPE_SESSION_1,
      created_date: now,
      updated_date: now,
    });
  }

  console.log('\n✅ Done! Refreshing Paketlerim should now show the package.');
}

main().catch(console.error);
