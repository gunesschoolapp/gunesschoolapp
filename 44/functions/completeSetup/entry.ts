import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return Response.json({ success: false, error: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find UserSetup record by token
    const records = await base44.asServiceRole.entities.UserSetup.filter({ password_reset_token: token });

    if (records.length === 0) {
      return Response.json({ success: false, error: 'Invalid or expired setup token' }, { status: 400 });
    }

    const record = records[0];

    if (record.setup_completed) {
      return Response.json({ success: false, error: 'Account already set up' }, { status: 400 });
    }

    const email = record.email;
    const invited_role = record.invited_role || 'user';
    const platformRole = ['admin', 'team_admin'].includes(invited_role) ? 'admin' : 'user';

    // Register user on platform
    try {
      await base44.asServiceRole.users.inviteUser(email, platformRole);
      console.log(`User registered: ${email}`);
    } catch (err) {
      console.log(`User may already exist: ${err.message}`);
    }

    // Update UserSetup to mark complete
    await base44.asServiceRole.entities.UserSetup.update(record.id, {
      temp_password: password,
      setup_completed: true,
      status: 'active',
      password_reset_token: null,
      activated_at: new Date().toISOString(),
    });

    // Try to set password if user is authenticated
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.auth.updateMe({ password });
      }
    } catch (err) {
      console.log('Password will be set on first login');
    }

    let redirectPath = '/Dashboard';
    if (invited_role === 'student') redirectPath = '/StudentSelfPortal';
    else if (invited_role === 'teacher') redirectPath = '/TeacherDashboard';

    return Response.json({
      success: true,
      redirect: redirectPath,
      email,
    });
  } catch (error) {
    console.error('Complete setup error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});