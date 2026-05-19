import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bodyText = await req.text();
    if (!bodyText) {
      return Response.json({ error: 'Request body required' }, { status: 400 });
    }

    const { email, full_name, invited_role } = JSON.parse(bodyText);

    if (!email || !invited_role) {
      return Response.json({ error: 'Email and role required' }, { status: 400 });
    }

    const token = generateToken();
    const appHost = req.headers.get('host') || 'gunesenglishschool.app';
    const appProto = req.headers.get('x-forwarded-proto') || 'https';
    const setupLink = `${appProto}://${appHost}/setup-account?token=${token}`;

    // Create or update UserSetup record
    const existing = await base44.asServiceRole.entities.UserSetup.filter({ email });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserSetup.update(existing[0].id, {
        full_name: full_name || existing[0].full_name,
        invited_role,
        status: 'pending',
        password_reset_token: token,
        invited_at: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.UserSetup.create({
        email,
        full_name: full_name || '',
        invited_role,
        status: 'pending',
        password_reset_token: token,
        invited_at: new Date().toISOString(),
      });
    }

    // Send email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailHtml = `
      <h2>Hello ${full_name || email}!</h2>
      <p>Welcome to Gunes English School.</p>
      <p><a href="${setupLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Activate Account</a></p>
      <p style="font-size: 12px; color: #666;">Link expires in 24 hours.</p>
    `;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@gunesenglishschool.app',
          to: email,
          subject: 'Activate Your Account - Gunes English School',
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return Response.json({ success: true, emailSent: false, warning: error.message });
      }
    } catch (emailError) {
      console.error('Email error:', emailError.message);
    }

    return Response.json({ success: true, message: 'Invitation sent' });
  } catch (error) {
    console.error('Invite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});