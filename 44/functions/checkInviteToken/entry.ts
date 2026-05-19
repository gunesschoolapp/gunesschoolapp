import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json({ valid: false, error: 'Token required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const records = await base44.asServiceRole.entities.UserSetup.filter({ password_reset_token: token });

    if (records.length === 0) {
      return Response.json({ valid: false, error: 'Invalid or expired token' });
    }

    const record = records[0];

    if (record.setup_completed) {
      return Response.json({ valid: false, error: 'Link already used' });
    }

    return Response.json({
      valid: true,
      email: record.email,
      full_name: record.full_name,
      invited_role: record.invited_role,
    });
  } catch (error) {
    console.error('Check token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});