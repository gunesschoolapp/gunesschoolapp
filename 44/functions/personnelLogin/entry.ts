import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { email, action, token, password } = await req.json();
    const base44 = createClientFromRequest(req);

    // Forgot password - send reset link
    if (action === 'forgot_password') {
      const personnel = await base44.asServiceRole.entities.Personnel.filter({ email });
      if (!personnel || personnel.length === 0) {
        return Response.json({ message: 'Email found' }, { status: 200 });
      }

      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.Personnel.update(personnel[0].id, {
        password_reset_token: resetToken,
        password_reset_expires: expiresAt
      });

      // Send email with reset link
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Şifre Sıfırlama Linki',
        body: `Şifrenizi sıfırlamak için bu linke tıklayın:\n\n${Deno.env.get('APP_URL') || 'https://app.example.com'}/reset-password?token=${resetToken}\n\nLink 24 saat geçerlidir.`,
        from_name: 'CRM Sistemi'
      });

      return Response.json({ message: 'Reset link sent to email' });
    }

    // Reset password with token
    if (action === 'reset_password') {
      const personnel = await base44.asServiceRole.entities.Personnel.filter({
        password_reset_token: token
      });

      if (!personnel || personnel.length === 0) {
        return Response.json({ error: 'Invalid token' }, { status: 400 });
      }

      const person = personnel[0];
      if (new Date(person.password_reset_expires) < new Date()) {
        return Response.json({ error: 'Token expired' }, { status: 400 });
      }

      // Hash password
      const passwordHash = await hashPassword(password);
      await base44.asServiceRole.entities.Personnel.update(person.id, {
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null
      });

      return Response.json({ message: 'Password reset successfully' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}