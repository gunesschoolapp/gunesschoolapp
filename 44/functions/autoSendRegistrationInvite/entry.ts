import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const base44 = createClientFromRequest(req);

    // Called from entity automation
    const entityName = payload?.event?.entity_name;
    const data = payload?.data;

    if (!data) {
      return Response.json({ skipped: true, reason: 'No data' });
    }

    const email = data.email;
    const fullName = data.full_name || '';

    // Skip if no email
    if (!email || !email.trim()) {
      return Response.json({ skipped: true, reason: 'No email address' });
    }

    // Determine role based on entity type
    let invitedRole = 'staff';
    if (entityName === 'Student') invitedRole = 'student';
    else if (entityName === 'Teacher') invitedRole = 'teacher';

    // Check if UserSetup already exists for this email
    const existing = await base44.asServiceRole.entities.UserSetup.filter({ email: email.trim() });
    if (existing.length > 0 && existing[0].setup_completed) {
      return Response.json({ skipped: true, reason: 'Already registered' });
    }

    const registrationToken = generateToken();
    const setupData = {
      email: email.trim(),
      full_name: fullName,
      invited_role: invitedRole,
      status: 'pending',
      setup_completed: false,
      registration_token: registrationToken,
      invited_at: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserSetup.update(existing[0].id, setupData);
    } else {
      await base44.asServiceRole.entities.UserSetup.create(setupData);
    }

    const registerUrl = `https://gunesenglishschool.app/register?token=${registrationToken}`;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const roleLabel = invitedRole === 'student' ? 'Öğrenci' : invitedRole === 'teacher' ? 'Öğretmen' : 'Personel';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <h2 style="color: #1e3a5f; margin-top: 0;">Gunes English School'a Hoş Geldiniz!</h2>
          <p style="color: #374151;">Merhaba <strong>${fullName || email}</strong>,</p>
          <p style="color: #374151;">Sisteme <strong>${roleLabel}</strong> olarak eklendiniz. Hesabınızı oluşturmak için aşağıdaki butona tıklayın.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${registerUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Hesabımı Oluştur
            </a>
          </div>
          
          <div style="background: #f0f4ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #555; font-size: 14px;">
              Bu link yalnızca sizin için oluşturulmuştur. Kayıt formunda şifrenizi belirleyebilirsiniz.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Butona tıklanamıyorsa şu linki kopyalayıp tarayıcınıza yapıştırın:<br/>
            <span style="word-break: break-all; color: #3b82f6;">${registerUrl}</span>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Bu otomatik bir e-postadır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@gunesenglishschool.app',
        to: email.trim(),
        subject: 'Gunes English School - Hesabınızı Oluşturun',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return Response.json({ success: false, error: 'Email send failed', details: err });
    }

    console.log(`Registration invite sent to ${email} (${invitedRole})`);
    return Response.json({ success: true, email, role: invitedRole });
  } catch (error) {
    console.error('autoSendRegistrationInvite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});