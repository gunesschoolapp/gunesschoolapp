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
    const { email, full_name, invited_role } = await req.json();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!email || !invited_role) {
      return Response.json({ error: 'email and invited_role required' }, { status: 400 });
    }

    // Generate unique registration token
    const registrationToken = generateToken();

    // Create or update UserSetup record (do NOT call inviteUser yet)
    const existing = await base44.asServiceRole.entities.UserSetup.filter({ email });
    const setupData = {
      email,
      full_name: full_name || '',
      invited_role,
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

    // Build registration link
    const registerUrl = `https://gunesenglishschool.app/register?token=${registrationToken}`;

    // Send email with registration link
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 32px 16px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <h2 style="color: #1e3a5f; margin-top: 0;">Gunes English School'a Hoş Geldiniz!</h2>
          <p style="color: #374151;">Merhaba <strong>${full_name || email}</strong>,</p>
          <p style="color: #374151;">Hesabınız oluşturulmak üzere davet edildiniz. Aşağıdaki butona tıklayarak kayıt formunu doldurun ve şifrenizi belirleyin.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${registerUrl}" 
               style="background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Hesabımı Oluştur
            </a>
          </div>
          
          <div style="background: #f0f4ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #555; font-size: 14px;">
              Bu link yalnızca sizin için oluşturulmuştur. Kayıt formunda rolünüzü seçerek şifrenizi belirleyebilirsiniz.
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
        to: email,
        subject: 'Gunes English School - Hesabınızı Oluşturun',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return Response.json({ success: true, emailSent: false, warning: 'Setup created but email failed' });
    }

    return Response.json({ success: true, emailSent: true, message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('sendInviteEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});