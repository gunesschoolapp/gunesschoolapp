const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const getStripe = () => require('stripe')(STRIPE_KEY);

function getDb() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

// --- Stripe Checkout Session Endpoint ---
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { packageName, price, currency, studentEmail, studentName, packageId } = req.body;
    const origin = req.headers.origin || 'https://gunes-english.web.app';
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: studentEmail,
      line_items: [{
        price_data: {
          currency: currency || 'gbp',
          product_data: { name: packageName, description: `Gunes English School - ${packageName}` },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/#/Packages?success=true&session_id={CHECKOUT_SESSION_ID}&package_id=${packageId}`,
      cancel_url: `${origin}/#/Packages?canceled=true`,
      metadata: { packageId, studentEmail, studentName },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[Stripe Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stripe/session/:sessionId', async (req, res) => {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ status: session.payment_status, customer_email: session.customer_email, metadata: session.metadata });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Helper: Sync Stripe session to Firestore ---
async function writeSessionToFirestore(session) {
  const db = getDb();
  const meta = session.metadata || {};
  const packageId = meta.packageId;
  const studentEmail = meta.studentEmail || session.customer_email || '';
  const studentName = meta.studentName || 'Öğrenci';
  const amount = (session.amount_total || 0) / 100;
  const sessionDate = new Date(session.created * 1000).toISOString();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // Get Package
  let pkgName = meta.packageName || 'Paket';
  let pkgLevel = '';
  if (packageId) {
    const pkgSnap = await db.collection('Package').doc(packageId).get();
    if (pkgSnap.exists) {
      const pData = pkgSnap.data();
      pkgName = pData.name || pkgName;
      pkgLevel = pData.level || '';
    }
  }

  // Get Student
  let studentId = 's1';
  if (studentEmail) {
    const studentSnap = await db.collection('Student').where('email', '==', studentEmail).limit(1).get();
    if (!studentSnap.empty) {
      studentId = studentSnap.docs[0].id;
    }
  }

  const suffix = session.id.slice(-12);
  const invNum = `INV-${new Date(session.created * 1000).getFullYear()}-${suffix.slice(-6).toUpperCase()}`;

  // 1) Order
  await db.collection('Order').doc(`ord-stripe-${suffix}`).set({
    student_id: studentId,
    student_email: studentEmail,
    student_name: studentName,
    package_id: packageId,
    package_name: pkgName,
    status: 'paid',
    order_date: sessionDate,
    amount,
    stripe_session_id: session.id,
    created_date: sessionDate,
    updated_date: now,
  }, { merge: true });

  // 2) Invoice
  await db.collection('Invoice').doc(`inv-stripe-${suffix}`).set({
    invoice_number: invNum,
    student_id: studentId,
    student_name: studentName,
    student_email: studentEmail,
    issue_date: today,
    due_date: today,
    status: 'paid',
    subtotal: amount,
    vat_rate: 0,
    vat_amount: 0,
    total_amount: amount,
    amount,
    package_id: packageId,
    source: 'stripe',
    stripe_session_id: session.id,
    created_date: sessionDate,
    updated_date: now,
  }, { merge: true });

  // 3) Payment
  await db.collection('Payment').doc(`pay-stripe-${suffix}`).set({
    student_id: studentId,
    student_name: studentName,
    student_email: studentEmail,
    amount,
    status: 'paid',
    payment_date: today,
    payment_method: 'credit_card',
    description: pkgName,
    package_id: packageId,
    source: 'stripe',
    stripe_session_id: session.id,
    created_date: sessionDate,
    updated_date: now,
  }, { merge: true });

  // 4) Auto-enroll in matching courses
  if (studentId) {
    const coursesSnap = await db.collection('Course').get();
    for (const courseDoc of coursesSnap.docs) {
      const c = courseDoc.data();
      if (pkgLevel === 'All Levels' || (c.cefr_level && (c.cefr_level === pkgLevel || pkgLevel.includes(c.cefr_level)))) {
        const enrolled = c.enrolled_students || [];
        if (!enrolled.includes(studentId)) {
          await db.collection('Course').doc(courseDoc.id).update({
            enrolled_students: [...enrolled, studentId]
          });
        }
      }
    }
  }
}

// --- Sync all paid Stripe sessions endpoint ---
app.post('/api/stripe/sync-all', async (req, res) => {
  try {
    const db = getDb();
    const stripe = getStripe();
    const sessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = sessionsList.data.filter(s => s.payment_status === 'paid');

    const existingOrdersSnap = await db.collection('Order').get();
    const syncedSessions = new Set(existingOrdersSnap.docs.map(d => d.data().stripe_session_id).filter(Boolean));

    const toSync = paidSessions.filter(s => !syncedSessions.has(s.id));
    for (const session of toSync) {
      await writeSessionToFirestore(session);
    }

    res.json({ total: paidSessions.length, synced: toSync.length });
  } catch (err) {
    console.error('[Sync Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Export Cloud Function
exports.api = onRequest({ cors: true }, app);
