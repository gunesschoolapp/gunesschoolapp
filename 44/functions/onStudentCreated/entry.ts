import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const student = body.data;
    
    if (!student?.email) {
      return Response.json({ message: 'No email, skipping invite' });
    }

    // Invite the student as a regular user
    try {
      await base44.asServiceRole.users.inviteUser(student.email, 'user');
    } catch (e) {
      // Already invited or registered - still send welcome email
      console.log('Invite result:', e.message);
    }

    // Send welcome email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: student.email,
      subject: 'Güneş English School - Sisteme Hoş Geldiniz!',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1d4ed8, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Güneş English School</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0 0;">Öğrenci Portalı</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1e293b; margin-top: 0;">Merhaba ${student.full_name || 'Değerli Öğrencimiz'}, 👋</h2>
            <p style="color: #475569; line-height: 1.6;">
              Güneş English School öğrenci sistemine kaydınız başarıyla oluşturuldu. 
              Aşağıdaki bilgilerle sisteme giriş yapabilirsiniz:
            </p>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1;"><strong>E-posta:</strong> ${student.email}</p>
              <p style="margin: 8px 0 0 0; color: #0369a1;"><strong>Giriş adresi:</strong> gunesenglishschool.app</p>
            </div>
            <p style="color: #475569; line-height: 1.6;">
              İlk girişte size gönderilen aktivasyon linkini kullanarak şifrenizi oluşturabilirsiniz.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://gunesenglishschool.app" 
                 style="background: #1d4ed8; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Portala Giriş Yap
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Güneş English School — Bu e-posta otomatik olarak gönderilmiştir.
            </p>
          </div>
        </div>
      `
    });

    return Response.json({ success: true, message: `Invite sent to ${student.email}` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});