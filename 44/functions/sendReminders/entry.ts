import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Sends reminders for:
// 1. Overdue payments
// 2. Courses ending within 14 days

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled calls (no user) using service role
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results = { payment_reminders: 0, course_ending_reminders: 0, errors: [] };

  try {
    const now = new Date();

    // 1. Overdue payment reminders
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const students = await base44.asServiceRole.entities.Student.list();
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < now;
    });

    for (const inv of overdueInvoices) {
      const student = studentMap[inv.student_id];
      if (!student?.email) continue;

      const daysPast = Math.floor((now - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
      
      // Only send if 1, 3, 7, 14, 30 days overdue (avoid spamming)
      if (![1, 3, 7, 14, 30].includes(daysPast)) continue;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: student.email,
        subject: `Ödeme Hatırlatması - ${inv.invoice_number}`,
        body: `Merhaba ${student.full_name},\n\n${inv.invoice_number} numaralı faturanızın son ödeme tarihi ${inv.due_date} idi. Fatura tutarı £${inv.amount}.\n\nLütfen en kısa sürede ödemenizi yapınız.\n\nGüneş English School`
      });

      results.payment_reminders++;
    }

    // 2. Course ending soon reminders (within 14 days)
    const courses = await base44.asServiceRole.entities.Course.list();
    
    for (const course of courses) {
      if (course.status !== 'active' || !course.end_date) continue;
      const daysLeft = Math.floor((new Date(course.end_date) - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft !== 14 && daysLeft !== 7 && daysLeft !== 3) continue;

      const enrolledIds = course.enrolled_students || [];
      for (const studentId of enrolledIds) {
        const student = studentMap[studentId];
        if (!student?.email) continue;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: student.email,
          subject: `Kursunuz Bitiyor - ${course.name}`,
          body: `Merhaba ${student.full_name},\n\n${course.name} kursunuzun bitiş tarihi ${course.end_date} (${daysLeft} gün kaldı).\n\nKurs uzatma veya yeni kayıt için bizimle iletişime geçebilirsiniz.\n\nGüneş English School`
        });

        results.course_ending_reminders++;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message, ...results }, { status: 500 });
  }
});