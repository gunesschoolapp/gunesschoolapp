const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = new Database(path.join(__dirname, 'gunes.db'));

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_date TEXT DEFAULT (datetime('now')),
    updated_date TEXT DEFAULT (datetime('now'))
  );
`);

function seed(entityType, items) {
  const insert = db.prepare('INSERT OR REPLACE INTO entities (id, entity_type, data) VALUES (?, ?, ?)');
  const tx = db.transaction(() => {
    items.forEach(item => {
      const id = item._id || uuidv4();
      delete item._id;
      insert.run(id, entityType, JSON.stringify(item));
    });
  });
  tx();
  console.log(`  ✅ ${entityType}: ${items.length} records`);
}

console.log('\n🌱 Seeding Gunes CRM database...\n');

// --- Teachers ---
seed('Teacher', [
  { _id: 't1', full_name: 'Sarah Johnson', email: 'sarah@gunesenglish.com', phone: '+447700900001', branch: 'english', specialization: 'General English & IELTS', salary_type: 'hourly', group_rate: 25, individual_rate: 35, online_rate: 30, trial_rate: 15, status: 'active', bio: 'Native English speaker with 8 years of teaching experience.', start_date: '2023-09-01', nationality: 'British' },
  { _id: 't2', full_name: 'Michael Brown', email: 'michael@gunesenglish.com', phone: '+447700900002', branch: 'ielts', specialization: 'IELTS & Academic English', salary_type: 'hourly', group_rate: 30, individual_rate: 40, online_rate: 35, trial_rate: 20, status: 'active', bio: 'IELTS examiner with extensive preparation course experience.', start_date: '2024-01-15', nationality: 'American' },
  { _id: 't3', full_name: 'Emma Wilson', email: 'emma@gunesenglish.com', phone: '+447700900003', branch: 'kids', specialization: 'Young Learners & Kids', salary_type: 'fixed', fixed_salary: 2800, status: 'active', bio: 'Specialist in teaching English to children aged 4-12.', start_date: '2024-03-01', nationality: 'Canadian' },
  { _id: 't4', full_name: 'Ayşe Kara', email: 'ayse@gunesenglish.com', phone: '+905551234567', branch: 'turkish', specialization: 'Turkish for Foreigners', salary_type: 'per_lesson', group_rate: 20, individual_rate: 30, status: 'active', bio: 'Experienced Turkish language instructor.', start_date: '2023-06-01', nationality: 'Turkish' },
]);

// --- Courses ---
seed('Course', [
  { _id: 'c1', name: 'General English A1-A2', teacher: 'Sarah Johnson', schedule: 'Mon-Wed-Fri 09:00-10:30', start_date: '2026-01-06', end_date: '2026-06-30', max_students: 12, enrolled_students: ['s1','s2','s3','s4'], status: 'active', room: 'Room 1', description: 'Beginner level English for everyday communication.' },
  { _id: 'c2', name: 'IELTS Preparation', teacher: 'Michael Brown', schedule: 'Tue-Thu 14:00-16:00', start_date: '2026-02-01', end_date: '2026-07-31', max_students: 8, enrolled_students: ['s5','s6'], status: 'active', room: 'Room 2', description: 'Intensive IELTS preparation targeting Band 6.5+' },
  { _id: 'c3', name: 'Kids English (6-9)', teacher: 'Emma Wilson', schedule: 'Sat 10:00-12:00', start_date: '2026-01-11', end_date: '2026-12-20', max_students: 10, enrolled_students: ['s7','s8','s9'], status: 'active', room: 'Room 3', description: 'Fun and interactive English for young learners.' },
  { _id: 'c4', name: 'Business English B2', teacher: 'Sarah Johnson', schedule: 'Tue-Thu 18:00-19:30', start_date: '2026-03-01', end_date: '2026-08-31', max_students: 8, enrolled_students: ['s10'], status: 'active', room: 'Room 1', description: 'Professional English for business environments.' },
  { _id: 'c5', name: 'Turkish for Foreigners A1', teacher: 'Ayşe Kara', schedule: 'Mon-Wed 11:00-12:30', start_date: '2026-04-01', end_date: '2026-09-30', max_students: 10, enrolled_students: [], status: 'upcoming', room: 'Room 4', description: 'Basic Turkish course for international students.' },
]);

// --- Students ---
seed('Student', [
  { _id: 's1', full_name: 'Mehmet Yılmaz', email: 'mehmet@email.com', phone: '+905551001001', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-05', cefr_level: 'A1', course_hours: 60, course_price: 1200, source: 'website', course_id: 'c1', nationality: 'Turkish', profession: 'Engineer' },
  { _id: 's2', full_name: 'Zeynep Demir', email: 'zeynep@email.com', phone: '+905551001002', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-05', cefr_level: 'A2', course_hours: 60, course_price: 1200, source: 'referral', course_id: 'c1', nationality: 'Turkish', profession: 'Doctor' },
  { _id: 's3', full_name: 'Ali Öztürk', email: 'ali@email.com', phone: '+905551001003', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-10', cefr_level: 'A1', course_hours: 60, course_price: 1100, source: 'walk_in', course_id: 'c1', nationality: 'Turkish' },
  { _id: 's4', full_name: 'Fatma Aydın', email: 'fatma@email.com', phone: '+905551001004', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-12', cefr_level: 'A2', course_hours: 60, course_price: 1200, source: 'social_media', course_id: 'c1', nationality: 'Turkish', profession: 'Lawyer' },
  { _id: 's5', full_name: 'Can Arslan', email: 'can@email.com', phone: '+905551001005', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-02-01', cefr_level: 'B2', course_hours: 80, course_price: 2500, source: 'website', course_id: 'c2', nationality: 'Turkish', profession: 'Student' },
  { _id: 's6', full_name: 'Elif Şahin', email: 'elif@email.com', phone: '+905551001006', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-02-05', cefr_level: 'B1', course_hours: 80, course_price: 2500, source: 'email', course_id: 'c2', nationality: 'Turkish', profession: 'Architect' },
  { _id: 's7', full_name: 'Arda Koç', email: 'arda.parent@email.com', phone: '+905551001007', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-11', cefr_level: 'A1', course_hours: 40, course_price: 800, source: 'referral', course_id: 'c3', nationality: 'Turkish', date_of_birth: '2019-05-15' },
  { _id: 's8', full_name: 'Defne Çelik', email: 'defne.parent@email.com', phone: '+905551001008', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-01-11', cefr_level: 'A1', course_hours: 40, course_price: 800, source: 'whatsapp', course_id: 'c3', nationality: 'Turkish', date_of_birth: '2018-08-20' },
  { _id: 's9', full_name: 'Yusuf Kaya', email: 'yusuf.parent@email.com', phone: '+905551001009', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-02-01', cefr_level: 'A1', course_hours: 40, course_price: 850, source: 'walk_in', course_id: 'c3', nationality: 'Turkish', date_of_birth: '2020-01-10' },
  { _id: 's10', full_name: 'Burak Erdoğan', email: 'burak@corporate.com', phone: '+905551001010', status: 'enrolled', enrollment_status: 'started', enrollment_date: '2026-03-01', cefr_level: 'B2', course_hours: 48, course_price: 3000, source: 'email', course_id: 'c4', nationality: 'Turkish', profession: 'Manager' },
  { _id: 's11', full_name: 'Selin Acar', email: 'selin@email.com', phone: '+905551001011', status: 'prospect', enrollment_status: 'not_started', cefr_level: 'A1', source: 'website', nationality: 'Turkish', profession: 'Nurse' },
  { _id: 's12', full_name: 'Emre Güneş', email: 'emre@email.com', phone: '+905551001012', status: 'completed', enrollment_status: 'started', enrollment_date: '2025-06-01', cefr_level: 'B1', course_hours: 60, course_price: 1100, source: 'referral', nationality: 'Turkish' },
]);

// --- Staff ---
seed('Staff', [
  { _id: 'staff1', full_name: 'Admin User', email: 'admin@gunesenglish.com', phone: '+905559990001', roles: ['admin'], status: 'active', department: 'Management' },
  { _id: 'staff2', full_name: 'Aylin Yıldız', email: 'aylin@gunesenglish.com', phone: '+905559990002', roles: ['reception'], status: 'active', department: 'Reception' },
  { _id: 'staff3', full_name: 'Onur Çetin', email: 'onur@gunesenglish.com', phone: '+905559990003', roles: ['marketing'], status: 'active', department: 'Marketing' },
]);

// --- Invoices ---
seed('Invoice', [
  { _id: 'inv1', invoice_number: 'INV-2026-001', invoice_type: 'student', student_id: 's1', amount: 1200, issue_date: '2026-01-05', due_date: '2026-02-05', status: 'paid', payment_status: 'paid', amount_paid: 1200, notes: 'Full payment received' },
  { _id: 'inv2', invoice_number: 'INV-2026-002', invoice_type: 'student', student_id: 's2', amount: 1200, issue_date: '2026-01-05', due_date: '2026-02-05', status: 'paid', payment_status: 'paid', amount_paid: 1200 },
  { _id: 'inv3', invoice_number: 'INV-2026-003', invoice_type: 'student', student_id: 's5', amount: 2500, issue_date: '2026-02-01', due_date: '2026-03-01', status: 'sent', payment_status: 'partially_paid', amount_paid: 1000, installment_plan: [{ id: 'ip1', installment_no: 1, amount: 1000, due_date: '2026-02-15', paid: true, paid_date: '2026-02-14', payment_method: 'bank_transfer' }, { id: 'ip2', installment_no: 2, amount: 750, due_date: '2026-03-15', paid: false }, { id: 'ip3', installment_no: 3, amount: 750, due_date: '2026-04-15', paid: false }] },
  { _id: 'inv4', invoice_number: 'INV-2026-004', invoice_type: 'student', student_id: 's10', amount: 3000, issue_date: '2026-03-01', due_date: '2026-04-01', status: 'pending', payment_status: 'unpaid', amount_paid: 0 },
  { _id: 'inv5', invoice_number: 'INV-2026-005', invoice_type: 'student', student_id: 's6', amount: 2500, issue_date: '2026-02-05', due_date: '2026-03-05', status: 'overdue', payment_status: 'unpaid', amount_paid: 0 },
]);

// --- Tasks ---
seed('Task', [
  { _id: 'task1', title: 'Follow up with Selin Acar', description: 'Call prospect student about enrollment', assigned_to: 'staff2', status: 'pending', priority: 'high', due_date: '2026-05-20' },
  { _id: 'task2', title: 'Prepare IELTS mock test materials', assigned_to: 't2', status: 'in_progress', priority: 'medium', due_date: '2026-05-25' },
  { _id: 'task3', title: 'Update social media ads', assigned_to: 'staff3', status: 'completed', priority: 'low', due_date: '2026-05-15' },
  { _id: 'task4', title: 'Send payment reminder to Can Arslan', assigned_to: 'staff2', status: 'pending', priority: 'high', due_date: '2026-05-19' },
]);

// --- Lessons ---
seed('Lesson', [
  { _id: 'l1', course_id: 'c1', teacher_id: 't1', date: '2026-05-19', start_time: '09:00', end_time: '10:30', status: 'scheduled', topic: 'Present Continuous Tense' },
  { _id: 'l2', course_id: 'c2', teacher_id: 't2', date: '2026-05-20', start_time: '14:00', end_time: '16:00', status: 'scheduled', topic: 'IELTS Writing Task 2' },
  { _id: 'l3', course_id: 'c3', teacher_id: 't3', date: '2026-05-24', start_time: '10:00', end_time: '12:00', status: 'scheduled', topic: 'Animals and Colors' },
]);

// --- Leads ---
seed('Lead', [
  { _id: 'lead1', full_name: 'Hakan Yılmaz', email: 'hakan@email.com', phone: '+905551112233', source: 'website', status: 'new', interest: 'General English', notes: 'Wants evening classes', created_date: '2026-05-17' },
  { _id: 'lead2', full_name: 'Maria Garcia', email: 'maria@email.com', phone: '+447700112233', source: 'social_media', status: 'contacted', interest: 'Turkish for Foreigners', notes: 'Moving to London, wants Turkish lessons', created_date: '2026-05-15' },
  { _id: 'lead3', full_name: 'Deniz Korkmaz', email: 'deniz@email.com', phone: '+905552223344', source: 'referral', status: 'qualified', interest: 'IELTS', notes: 'Needs band 7 for university', created_date: '2026-05-10' },
]);

// --- Notifications ---
seed('Notification', [
  { _id: 'n1', title: 'Payment Overdue', message: 'Elif Şahin has an overdue payment of £2,500', type: 'payment', status: 'pending', recipient: 'admin@gunesenglish.com', created_date: '2026-05-18' },
  { _id: 'n2', title: 'New Lead', message: 'New website inquiry from Hakan Yılmaz', type: 'lead', status: 'pending', recipient: 'admin@gunesenglish.com', created_date: '2026-05-17' },
  { _id: 'n3', title: 'Trial Lesson Scheduled', message: 'Deniz Korkmaz trial lesson on May 22', type: 'lesson', status: 'read', recipient: 'admin@gunesenglish.com', created_date: '2026-05-16' },
]);

// --- Expenses ---
seed('Expense', [
  { _id: 'exp1', description: 'Office supplies', amount: 85, date: '2026-05-10', category: 'supplies', payment_method: 'cash', status: 'approved' },
  { _id: 'exp2', description: 'Google Ads - May campaign', amount: 350, date: '2026-05-01', category: 'marketing', payment_method: 'credit_card', status: 'approved' },
  { _id: 'exp3', description: 'Classroom projector repair', amount: 120, date: '2026-05-15', category: 'maintenance', payment_method: 'bank_transfer', status: 'pending' },
]);

// --- Attendance ---
seed('Attendance', [
  { _id: 'att1', student_id: 's1', lesson_id: 'l1', course_id: 'c1', date: '2026-05-16', status: 'present' },
  { _id: 'att2', student_id: 's2', lesson_id: 'l1', course_id: 'c1', date: '2026-05-16', status: 'present' },
  { _id: 'att3', student_id: 's3', lesson_id: 'l1', course_id: 'c1', date: '2026-05-16', status: 'absent' },
  { _id: 'att4', student_id: 's5', lesson_id: 'l2', course_id: 'c2', date: '2026-05-15', status: 'present' },
]);

// --- Payments ---
seed('Payment', [
  { _id: 'pay1', student_id: 's1', invoice_id: 'inv1', amount: 1200, date: '2026-01-10', method: 'bank_transfer', status: 'completed' },
  { _id: 'pay2', student_id: 's2', invoice_id: 'inv2', amount: 1200, date: '2026-01-12', method: 'credit_card', status: 'completed' },
  { _id: 'pay3', student_id: 's5', invoice_id: 'inv3', amount: 1000, date: '2026-02-14', method: 'bank_transfer', status: 'completed' },
]);

// --- FormSubmission ---
seed('FormSubmission', [
  { _id: 'fs1', name: 'Hakan Yılmaz', email: 'hakan@email.com', phone: '+905551112233', message: 'I want to learn English', form_type: 'contact', status: 'new', created_date: '2026-05-17' },
]);

// --- Empty entities (just to avoid errors) ---
['Certificate', 'CertificateTemplate', 'Conversation', 'EmailAccount', 'InboxEmail', 'InvoiceTemplate', 'LeadPipelineStage',
 'Message', 'NotificationTemplate', 'Partner', 'PayrollRecord', 'PendingInvite', 'PermissionSet', 'Personnel',
 'ProgressReport', 'Resource', 'Role', 'SalesStaff', 'SentEmail', 'StaffPin', 'TeacherExpense',
 'TeacherPaymentRecord', 'TeacherSalary', 'TeamChatMessage', 'TeamChatRoom', 'TrialLesson',
 'User', 'UserSetup', 'VirtualRoom', 'WebsiteForm', 'WebsiteFormSubmission', 'Assignment'].forEach(entity => {
  // Insert a placeholder that we'll immediately delete so the entity_type is recognized
  // Actually just skip - the CRUD endpoints handle missing entities gracefully
});

const total = db.prepare('SELECT COUNT(*) as c FROM entities').get().c;
console.log(`\n✅ Seeding complete! Total: ${total} records\n`);
