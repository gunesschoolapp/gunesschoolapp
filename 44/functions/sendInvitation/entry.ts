import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const bodyText = await req.text();
    const { email, full_name, role } = bodyText ? JSON.parse(bodyText) : {};

    if (!email || !role) {
      return Response.json({ error: 'Email and role required' }, { status: 400 });
    }

    // Generate token
    const token = generateToken();
    const appHost = req.headers.get('host') || 'localhost:5173';
    const appProto = req.headers.get('x-forwarded-proto') || 'http';
    const setupUrl = `${appProto}://${appHost}/setup-account?token=${token}`;

    // Save invitation
    await base44.asServiceRole.entities.UserSetup.create({
      email,
      full_name: full_name || '',
      invited_role: role,
      password_reset_token: token,
      status: 'pending',
      invited_at: new Date().toISOString(),
    });

    // Send email
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@gunesenglishschool.app',
          to: email,
          subject: 'Join Gunes English School',
          html: `<h2>Hello ${full_name || email}</h2><p><a href="${setupUrl}">Click here to activate your account</a></p>`,
        }),
      }).catch(e => console.error('Email failed:', e.message));
    }

    return Response.json({ success: true, setupUrl });
  } catch (error) {
    console.error('Send invitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});