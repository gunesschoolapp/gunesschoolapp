import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ valid: false, error: 'Token required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find UserSetup record by token (service role - no auth needed)
    const records = await base44.asServiceRole.entities.UserSetup.filter({ password_reset_token: token });

    if (records.length === 0) {
      return Response.json({ valid: false, error: 'Invalid or expired token' });
    }

    const record = records[0];

    // Check if already completed
    if (record.setup_completed) {
      return Response.json({ valid: false, error: 'This setup link has already been used' });
    }

    return Response.json({
      valid: true,
      setup_id: record.id,
      email: record.email,
      invited_role: record.invited_role,
      full_name: record.full_name,
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});