import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Vade tarihi geçmiş ve ödenmemiş faturaları bul
    const allInvoices = await base44.asServiceRole.entities.Invoice.list();
    const today = new Date().toISOString().split('T')[0];

    const overdueInvoices = allInvoices.filter(inv =>
      inv.due_date &&
      inv.due_date <= today &&
      inv.status !== 'paid' &&
      inv.payment_status !== 'paid' &&
      inv.student_id
    );

    // Template'leri bir kere çek
    const templates = await base44.asServiceRole.entities.NotificationTemplate.list();
    const template = templates.find(t => t.template_type === 'payment_reminder' && t.channel === 'whatsapp');

    const notifications = [];
    const skipped = [];

    for (const invoice of overdueInvoices) {
      // Öğrenci bulunamazsa bu faturayı atla, diğerlerine devam et
      let student;
      try {
        student = await base44.asServiceRole.entities.Student.get(invoice.student_id);
      } catch (e) {
        console.warn(`Student not found for invoice ${invoice.invoice_number} (student_id: ${invoice.student_id}), skipping.`);
        skipped.push(invoice.id);
        continue;
      }

      if (!student?.phone) {
        console.warn(`Student ${student?.full_name} has no phone, skipping invoice ${invoice.invoice_number}.`);
        skipped.push(invoice.id);
        continue;
      }

      if (!template) {
        console.warn('No WhatsApp payment_reminder template found.');
        break;
      }

      const message = template.template_text
        .replace(/{{student_name}}/g, student.full_name || '')
        .replace(/{{amount}}/g, `£${invoice.amount}`)
        .replace(/{{due_date}}/g, invoice.due_date)
        .replace(/{{invoice_number}}/g, invoice.invoice_number || '');

      const notif = await base44.asServiceRole.entities.Notification.create({
        notification_type: 'payment_reminder',
        student_id: invoice.student_id,
        channel: 'whatsapp',
        phone_number: student.phone,
        message: message,
        related_entity: 'Invoice',
        related_entity_id: invoice.id,
        status: 'pending'
      });

      await base44.asServiceRole.functions.invoke('sendNotification', {
        notification_id: notif.id,
        template_id: template.id
      });

      notifications.push(notif.id);
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      skipped_count: skipped.length,
      notification_ids: notifications
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});