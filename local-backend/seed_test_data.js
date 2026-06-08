const Database = require('better-sqlite3');
const db = new Database('./gunes.db');
const now = new Date().toISOString();

// Test Package
const pkgId = 'pkg-test-001';
const existPkg = db.prepare('SELECT id FROM entities WHERE id = ?').get(pkgId);
if (!existPkg) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    pkgId, 'Package',
    JSON.stringify({
      name: 'B1-B2 Intensive English',
      description: 'Kapsamlı B1-B2 seviyesi ingilizce paketi',
      price: 1200,
      currency: 'GBP',
      duration_hours: 60,
      level: 'B1-B2',
      features: ['20 Haftalık program', 'Özel ders', 'Materyaller dahil'],
      icon: 'BookOpen', color: 'blue', status: 'active', popular: true
    }),
    now, now
  );
  console.log('✅ Package created: pkg-test-001');
} else {
  console.log('ℹ️ Package already exists');
}

// Order for Mehmet Yılmaz (s1)
const ordId = 'ord-test-mehmet-001';
const existOrd = db.prepare('SELECT id FROM entities WHERE id = ?').get(ordId);
if (!existOrd) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    ordId, 'Order',
    JSON.stringify({
      student_id: 's1',
      student_email: 'mehmet@email.com',
      student_name: 'Mehmet Yılmaz',
      package_id: pkgId,
      package_name: 'B1-B2 Intensive English',
      status: 'paid',
      order_date: now,
      amount: 1200,
      stripe_session_id: 'cs_test_demo_session_001',
    }),
    now, now
  );
  console.log('✅ Order created for Mehmet Yılmaz');
} else {
  console.log('ℹ️ Order already exists');
}

// Payment record for Mehmet (Finans istatistikleri için)
const payId = 'pay-test-mehmet-001';
const existPay = db.prepare('SELECT id FROM entities WHERE id = ?').get(payId);
if (!existPay) {
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)').run(
    payId, 'Payment',
    JSON.stringify({
      student_id: 's1',
      student_name: 'Mehmet Yılmaz',
      student_email: 'mehmet@email.com',
      amount: 1200,
      status: 'paid',
      payment_date: now.slice(0, 10),
      payment_method: 'credit_card',
      description: 'B1-B2 Intensive English',
      package_id: pkgId,
      source: 'stripe',
      stripe_session_id: 'cs_test_demo_session_001',
    }),
    now, now
  );
  console.log('✅ Payment record created');
} else {
  console.log('ℹ️ Payment already exists');
}

db.close();
console.log('Done!');
