import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notification_id, template_id } = await req.json();

    if (!notification_id) {
      return Response.json({ error: 'notification_id gerekli' }, { status: 400 });
    }

    // Bildirim kaydını getir
    const notification = await base44.asServiceRole.entities.Notification.get(notification_id);
    if (!notification) {
      return Response.json({ error: 'Bildirim bulunamadı' }, { status: 404 });
    }

    // Template varsa, mesajı template'den oluştur
    let message = notification.message;
    if (template_id) {
      const template = await base44.asServiceRole.entities.NotificationTemplate.get(template_id);
      if (template) {
        // Basit template değişkenleri değiştir
        const student = await base44.asServiceRole.entities.Student.get(notification.student_id);
        message = template.template_text
          .replace(/{{student_name}}/g, student?.full_name || 'Öğrenci')
          .replace(/{{date}}/g, new Date().toLocaleDateString('tr-TR'))
          .replace(/{{amount}}/g, notification.amount || '');
      }
    }

    // SMS/WhatsApp gönderimi simüle et
    // Gerçek entegrasyon için Twilio, Vonage vb. kullanılabilir
    console.log(`[${notification.channel.toUpperCase()}] ${notification.phone_number} => ${message}`);

    // Notification kaydını güncelle
    await base44.asServiceRole.entities.Notification.update(notification_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      message: message
    });

    return Response.json({
      success: true,
      notification_id,
      channel: notification.channel,
      phone: notification.phone_number,
      message: message
    });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});