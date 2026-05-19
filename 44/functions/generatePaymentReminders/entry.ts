import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { format, parseISO, differenceInDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and staff can generate reminders
    if (!['admin', 'staff'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all payments
    const payments = await base44.entities.Payment.list();
    const students = await base44.entities.Student.list();
    const courses = await base44.entities.Course.list();

    const today = new Date();
    const reminders = [];

    // Process each payment
    for (const payment of payments) {
      if (!['pending', 'overdue'].includes(payment.status)) continue;

      const dueDate = payment.due_date ? parseISO(payment.due_date) : null;
      if (!dueDate) continue;

      const daysUntilDue = differenceInDays(dueDate, today);
      const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
      const isOverdue = today > dueDate;

      const student = students.find(s => s.id === payment.student_id);
      const course = courses.find(c => c.id === payment.course_id);

      let reminderType = 'none';
      let priority = 'normal';

      if (isOverdue) {
        // Overdue payment
        if (daysOverdue > 30) {
          reminderType = 'urgent';
          priority = 'high';
        } else if (daysOverdue > 14) {
          reminderType = 'follow_up';
          priority = 'high';
        } else {
          reminderType = 'overdue';
          priority = 'medium';
        }
      } else if (daysUntilDue === 0) {
        // Due today
        reminderType = 'due_today';
        priority = 'high';
      } else if (daysUntilDue === 1) {
        // Due tomorrow
        reminderType = 'due_soon';
        priority = 'medium';
      } else if (daysUntilDue <= 3) {
        // Due within 3 days
        reminderType = 'upcoming';
        priority = 'low';
      }

      if (reminderType !== 'none') {
        reminders.push({
          payment_id: payment.id,
          student_id: payment.student_id,
          student_name: student?.full_name || 'Bilinmeyen',
          course_name: course?.name || 'Kurs',
          amount: payment.amount,
          due_date: payment.due_date,
          days_until_due: isOverdue ? -daysOverdue : daysUntilDue,
          reminder_type: reminderType,
          priority,
          message: generateReminderMessage(student?.full_name, payment.amount, reminderType, daysOverdue || daysUntilDue),
        });
      }
    }

    // Sort by priority and days
    reminders.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.days_until_due - b.days_until_due;
    });

    // Create or update Task entity for each urgent reminder
    for (const reminder of reminders.filter(r => r.priority === 'high')) {
      try {
        // Check if task already exists for this payment
        const existingTasks = await base44.entities.Task.filter({
          type: 'payment_chase',
          related_student_id: reminder.student_id,
        });

        const taskExists = existingTasks.some(t => t.title.includes(reminder.payment_id));

        if (!taskExists) {
          await base44.entities.Task.create({
            title: `${reminder.student_name} - Ödeme Takibi (£${reminder.amount}) [${reminder.payment_id}]`,
            description: reminder.message,
            related_student_id: reminder.student_id,
            type: 'payment_chase',
            priority: reminder.priority === 'high' ? 'high' : 'medium',
            status: 'open',
            due_date: reminder.due_date,
          });
        }
      } catch (err) {
        console.log(`Task creation skipped for ${reminder.student_name}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      total_reminders: reminders.length,
      by_type: reminders.reduce((acc, r) => {
        acc[r.reminder_type] = (acc[r.reminder_type] || 0) + 1;
        return acc;
      }, {}),
      urgent_count: reminders.filter(r => r.priority === 'high').length,
      reminders: reminders.slice(0, 20), // Return top 20
    });
  } catch (error) {
    console.error('Error generating reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateReminderMessage(studentName, amount, type, days) {
  const messages = {
    urgent: `ACIL: ${studentName} adlı öğrencinin £${amount} tutarındaki ödemesi ${days} gündür gecikmiş! Derhal takip yapılması gerekiyor.`,
    follow_up: `${studentName} adlı öğrenciye £${amount} tutarındaki ödemenin ${days} gündür geciktiğini hatırlatın.`,
    overdue: `${studentName}'den £${amount} tutarındaki ödeme ${days} gün gecikmeli. Takip gerekli.`,
    due_today: `Bugün: ${studentName} adlı öğrenciden £${amount} tahsil etme bekleniyor.`,
    due_soon: `Yarın: ${studentName} adlı öğrenciden £${amount} tahsil etme planlanıyor.`,
    upcoming: `${days} gün içinde: ${studentName} adlı öğrenciden £${amount} tahsil etme planlanıyor.`,
  };
  return messages[type] || 'Ödeme takibi gerekli.';
}