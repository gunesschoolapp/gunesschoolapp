const Database = require('better-sqlite3');
const db = new Database('./gunes.db');
const now = new Date().toISOString();

// Stripe'tan gelen gerçek package ID
const realPkgId = 'dLRKO53yOq1QxAhws4mR';
const stripeSession1 = 'cs_live_a1QnGQoxVStobUqqIytF6gFwJT0oB8aqgbNxAZ9lSnMr8UrS9aGKCgHlHj00ELkSdY';
const stripeSession2 = 'cs_live_a1jOAixcUjEcew0mHgeC7xpSVeQv8BPz0ysDGvwJVf1G00vRfpQJ8r8VKxJ00EvT00N4';

// 1) Gerçek Package kaydını ekle (Stripe'tan gelen package_id ile)
const existPkg = db.prepare('SELECT id FROM entities WHERE id = ?').get(realPkgId);
if (!existPkg) {
  // Önce mevcut paketin bilgilerini kopyala
  const testPkg = db.prepare('SELECT data FROM entities WHERE id = ?').get('pkg-test-001');
  const pkgData = testPkg ? JSON.parse(testPkg.data) : {
    name: 'B1-B2 Intensive English',
    description: 'Kapsamlı B1-B2 seviyesi ingilizce paketi',
    price: 1200,
    currency: 'GBP',
    duration_hours: 60,
    level: 'B1-B2',
    features: ['20 Haftalık program', 'Özel ders', 'Materyaller dahil'],
    icon: 'BookOpen', color: 'blue', status: 'active', popular: true
  };
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    realPkgId, 'Package', JSON.stringify(pkgData), now, now
  );
  console.log('✅ Real Package created:', realPkgId);
} else {
  console.log('ℹ️ Package already exists:', realPkgId);
}

// 2) Stripe session 1 - Order
const ord1Id = 'ord-stripe-real-001';
const existOrd1 = db.prepare('SELECT id FROM entities WHERE id = ?').get(ord1Id);
const dupOrd1 = db.prepare("SELECT id FROM entities WHERE entity_type = 'Order' AND data LIKE ?").get('%cs_live_a1QnGQox%');
if (!existOrd1 && !dupOrd1) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    ord1Id, 'Order',
    JSON.stringify({
      student_id: 's1',
      student_email: 'mehmet@email.com',
      student_name: 'Mehmet Yılmaz',
      package_id: realPkgId,
      package_name: 'B1-B2 Intensive English',
      status: 'paid',
      order_date: '2026-06-08T20:14:12.000Z',
      amount: 1200,
      stripe_session_id: stripeSession1,
    }),
    '2026-06-08T20:14:12.000Z', now
  );
  console.log('✅ Order 1 (Stripe) created');
} else {
  console.log('ℹ️ Order 1 already exists, skipping');
}

// 3) Stripe session 2 - Order
const ord2Id = 'ord-stripe-real-002';
const existOrd2 = db.prepare('SELECT id FROM entities WHERE id = ?').get(ord2Id);
const dupOrd2 = db.prepare("SELECT id FROM entities WHERE entity_type = 'Order' AND data LIKE ?").get('%cs_live_a1jOAix%');
if (!existOrd2 && !dupOrd2) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    ord2Id, 'Order',
    JSON.stringify({
      student_id: 's1',
      student_email: 'mehmet@email.com',
      student_name: 'Mehmet Yılmaz',
      package_id: realPkgId,
      package_name: 'B1-B2 Intensive English',
      status: 'paid',
      order_date: '2026-06-08T19:42:15.000Z',
      amount: 1200,
      stripe_session_id: stripeSession2,
    }),
    '2026-06-08T19:42:15.000Z', now
  );
  console.log('✅ Order 2 (Stripe) created');
} else {
  console.log('ℹ️ Order 2 already exists, skipping');
}

// 4) Invoice oluştur
const inv1Id = 'inv-stripe-real-001';
const existInv1 = db.prepare('SELECT id FROM entities WHERE id = ?').get(inv1Id);
if (!existInv1) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    inv1Id, 'Invoice',
    JSON.stringify({
      invoice_number: 'INV-2026-STRIPE-001',
      student_id: 's1',
      student_name: 'Mehmet Yılmaz',
      student_email: 'mehmet@email.com',
      issue_date: '2026-06-08',
      due_date: '2026-06-08',
      status: 'paid',
      subtotal: 1200,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: 1200,
      amount: 1200,
      line_items: [{ description: 'B1-B2 Intensive English', quantity: 1, unit_price: 1200, total: 1200 }],
      notes: `Stripe Session: ${stripeSession1}`,
      package_id: realPkgId,
      source: 'stripe',
      stripe_session_id: stripeSession1,
    }),
    '2026-06-08T20:14:12.000Z', now
  );
  console.log('✅ Invoice created');
}

// 5) Payment kaydı oluştur
const pay1Id = 'pay-stripe-real-001';
const existPay1 = db.prepare('SELECT id FROM entities WHERE id = ?').get(pay1Id);
if (!existPay1) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    pay1Id, 'Payment',
    JSON.stringify({
      student_id: 's1',
      student_name: 'Mehmet Yılmaz',
      student_email: 'mehmet@email.com',
      amount: 1200,
      status: 'paid',
      payment_date: '2026-06-08',
      payment_method: 'credit_card',
      description: 'B1-B2 Intensive English',
      package_id: realPkgId,
      source: 'stripe',
      stripe_session_id: stripeSession1,
    }),
    '2026-06-08T20:14:12.000Z', now
  );
  console.log('✅ Payment created');
}

const counts = db.prepare('SELECT entity_type, COUNT(*) as c FROM entities GROUP BY entity_type').all();
console.log('\n=== Final DB Status ===');
counts.forEach(r => console.log(r.entity_type + ':', r.c));

db.close();
console.log('\nDone!');
