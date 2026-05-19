import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const bodyText = await req.text();

    if (!token) {
      return Response.json({ success: false, error: 'Token required' }, { status: 400 });
    }

    const { password } = bodyText ? JSON.parse(bodyText) : {};

    if (!password) {
      return Response.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const records = await base44.asServiceRole.entities.UserSetup.filter({ password_reset_token: token });

    if (records.length === 0) {
      return Response.json({ success: false, error: 'Invalid or expired link' });
    }

    const record = records[0];

    if (record.setup_completed) {
      return Response.json({ success: false, error: 'Link already used' });
    }

    const email = record.email;
    const invited_role = record.invited_role || 'user';
    const platformRole = ['admin', 'team_admin'].includes(invited_role) ? 'admin' : 'user';

    try {
      await base44.asServiceRole.users.inviteUser(email, platformRole);
    } catch (inviteErr) {
      console.log(`User may exist: ${inviteErr.message}`);
    }

    // Mark setup as complete
    await base44.asServiceRole.entities.UserSetup.update(record.id, {
      temp_password: password,
      setup_completed: true,
      status: 'active',
      password_reset_token: null,
      activated_at: new Date().toISOString(),
    });

    // Try to set password if user is authenticated
    try {
      const currentUser = await base44.auth.me();
      if (currentUser && currentUser.email === email) {
        await base44.auth.updateMe({ password });
      }
    } catch (authErr) {
      console.log('Password set for next login');
    }

    const redirectPath = invited_role === 'student' ? '/StudentSelfPortal' : 
                        invited_role === 'teacher' ? '/TeacherDashboard' : '/Dashboard';

    return Response.json({
      success: true,
      redirect: redirectPath,
      message: 'Account activated!',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});