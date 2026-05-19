import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { password } = payload;

    if (!password) {
      return Response.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Update user password via auth service
    await base44.auth.updateMe({
      password: password
    });

    return Response.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    console.error('Set password error:', error);
    return Response.json({ error: error.message || 'Failed to set password' }, { status: 500 });
  }
});