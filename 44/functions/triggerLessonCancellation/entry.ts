import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lesson_id, reason } = await req.json();

    if (!lesson_id) {
      return Response.json({ error: 'lesson_id gerekli' }, { status: 400 });
    }

    // Ders kaydını getir
    const lesson = await base44.asServiceRole.entities.Lesson.get(lesson_id);
    if (!lesson) {
      return Response.json({ error: 'Ders bulunamadı' }, { status: 404 });
    }

    // Kurs bilgisini getir
    const course = await base44.asServiceRole.entities.Course.get(lesson.course_id);
    
    // Tüm kayıtlı öğrenciler
    const students = await base44.asServiceRole.entities.Student.list();
    const enrolledStudents = students.filter(s => 
      course?.enrolled_students?.includes(s.id)
    );

    // Ders iptali template'i bul
    const templates = await base44.asServiceRole.entities.NotificationTemplate.list();
    const template = templates.find(t => t.template_type === 'lesson_cancellation' && t.channel === 'whatsapp');

    const notifications = [];

    for (const student of enrolledStudents) {
      if (!student.phone) continue;

      const message = template?.template_text
        ?.replace(/{{student_name}}/g, student.full_name)
        ?.replace(/{{course_name}}/g, course?.name || 'Ders')
        ?.replace(/{{lesson_date}}/g, lesson.date || '')
        ?.replace(/{{reason}}/g, reason || 'Programlı bakım') 
        || `Merhaba ${student.full_name}, ${course?.name || 'Ders'} dersi iptal edilmiştir.`;

      const notif = await base44.asServiceRole.entities.Notification.create({
        notification_type: 'lesson_cancellation',
        student_id: student.id,
        channel: 'whatsapp',
        phone_number: student.phone,
        message: message,
        related_entity: 'Lesson',
        related_entity_id: lesson.id,
        status: 'pending'
      });

      // Bildirim gönder
      await base44.asServiceRole.functions.invoke('sendNotification', {
        notification_id: notif.id
      });

      notifications.push(notif.id);
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      notification_ids: notifications
    });
  } catch (error) {
    console.error('Lesson cancellation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});