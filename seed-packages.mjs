import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyAZxq4tCB_G5zsbD6_5l9FcNvSANlL23Ek",
  authDomain: "gunes-english.firebaseapp.com",
  projectId: "gunes-english",
  storageBucket: "gunes-english.firebasestorage.app",
  messagingSenderId: "438062176512",
  appId: "1:438062176512:web:448fe4789ae1f4c7c9bbe5",
});
const db = getFirestore(app);

const packages = [
  { _id: 'pkg1', name: 'General English Starter', description: 'Perfect for beginners. Build a solid foundation in everyday English with interactive group lessons.', price: 799, currency: 'GBP', duration_hours: 40, level: 'A1-A2', icon: 'BookOpen', color: 'blue', status: 'active', popular: false, features: ['40 hours of group lessons', 'Coursebook included', 'Weekly progress tests', 'Online resources access', 'Certificate on completion'] },
  { _id: 'pkg2', name: 'IELTS Intensive', description: 'Targeted preparation for IELTS exam. Achieve your target band score with expert guidance.', price: 1499, currency: 'GBP', duration_hours: 60, level: 'B1-B2', icon: 'Star', color: 'purple', status: 'active', popular: true, features: ['60 hours of focused IELTS prep', '4 full mock exams', 'Individual writing feedback', 'Speaking practice sessions', 'Exam strategies & tips', 'Free retake if target not met'] },
  { _id: 'pkg3', name: 'Business English Pro', description: 'Enhance your professional English skills for the corporate world. Presentations, emails, meetings.', price: 1299, currency: 'GBP', duration_hours: 48, level: 'B2', icon: 'Zap', color: 'emerald', status: 'active', popular: false, features: ['48 hours of business English', 'Presentation skills workshop', 'Email writing masterclass', 'Meeting & negotiation role-plays', 'LinkedIn profile review'] },
  { _id: 'pkg4', name: 'Kids Fun English', description: 'Engaging and fun English lessons for children aged 6-12. Learning through games, songs, and stories.', price: 599, currency: 'GBP', duration_hours: 32, level: 'A1', icon: 'Users', color: 'amber', status: 'active', popular: false, features: ['32 hours of fun lessons', 'Small groups (max 8 kids)', 'Educational games & activities', 'Storybook included', 'Parent progress reports'] },
  { _id: 'pkg5', name: 'VIP Private Tutoring', description: 'One-on-one personalised lessons tailored to your specific needs and schedule.', price: 2499, currency: 'GBP', duration_hours: 30, level: 'All Levels', icon: 'Crown', color: 'rose', status: 'active', popular: false, features: ['30 hours 1-on-1 sessions', 'Fully personalised curriculum', 'Flexible scheduling', 'Native speaker teacher', 'Priority support', 'Homework & feedback'] },
];

console.log('\n🎓 Seeding packages...\n');
for (const pkg of packages) {
  const id = pkg._id; delete pkg._id;
  await setDoc(doc(db, 'Package', id), { ...pkg, created_date: new Date().toISOString(), updated_date: new Date().toISOString() });
  console.log(`  ✅ ${pkg.name} — £${pkg.price}`);
}
console.log('\n✅ Done!\n');
process.exit(0);
