import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAZxq4tCB_G5zsbD6_5l9FcNvSANlL23Ek",
  authDomain: "gunes-english.firebaseapp.com",
  projectId: "gunes-english",
  storageBucket: "gunes-english.firebasestorage.app",
  messagingSenderId: "438062176512",
  appId: "1:438062176512:web:448fe4789ae1f4c7c9bbe5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const demoAccounts = [
  {
    email: 'student.demo@gunesenglish.com',
    password: 'Gunes2026Demo!',
    type: 'Student',
    id: 'demo_student_01',
    data: {
      full_name: 'Demo Student (Apple Review)',
      email: 'student.demo@gunesenglish.com',
      phone: '+905550001122',
      status: 'enrolled',
      enrollment_status: 'started',
      enrollment_date: '2026-01-01',
      cefr_level: 'B1',
      course_hours: 60,
      course_price: 1200,
      nationality: 'Turkish'
    }
  },
  {
    email: 'teacher.demo@gunesenglish.com',
    password: 'Gunes2026Demo!',
    type: 'Teacher',
    id: 'demo_teacher_01',
    data: {
      full_name: 'Demo Teacher (Sarah Johnson)',
      email: 'teacher.demo@gunesenglish.com',
      phone: '+447700900099',
      branch: 'english',
      specialization: 'General English & IELTS',
      salary_type: 'hourly',
      group_rate: 25,
      individual_rate: 35,
      status: 'active',
      bio: 'Native English Teacher Demo Account for Apple Review',
      start_date: '2023-09-01',
      nationality: 'British'
    }
  },
  {
    email: 'admin.demo@gunesenglish.com',
    password: 'Gunes2026Demo!',
    type: 'Staff',
    id: 'demo_admin_01',
    data: {
      full_name: 'Demo Admin (System)',
      email: 'admin.demo@gunesenglish.com',
      phone: '+905559990099',
      roles: ['admin'],
      status: 'active',
      department: 'Management'
    }
  }
];

async function run() {
  console.log('🚀 Creating / verifying Apple Review demo accounts in Firebase...\n');
  for (const acc of demoAccounts) {
    try {
      // 1. Create Firestore record
      await setDoc(doc(db, acc.type, acc.id), {
        ...acc.data,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      }, { merge: true });
      console.log(`✅ Firestore ${acc.type} created for ${acc.email}`);

      // 2. Create Auth User
      try {
        await createUserWithEmailAndPassword(auth, acc.email, acc.password);
        console.log(`✅ Firebase Auth user created for ${acc.email}`);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          console.log(`ℹ️ Auth user already exists for ${acc.email}, testing login...`);
          await signInWithEmailAndPassword(auth, acc.email, acc.password);
          console.log(`✅ Login verified for ${acc.email}`);
        } else {
          console.error(`❌ Auth error for ${acc.email}:`, authErr.message);
        }
      }
    } catch (e) {
      console.error(`❌ Error setting up ${acc.email}:`, e.message);
    }
  }
  console.log('\n🎉 Demo accounts setup complete!');
  process.exit(0);
}

run();
