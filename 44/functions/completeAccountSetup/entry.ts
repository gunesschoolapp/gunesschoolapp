import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    const bodyText = await req.text();
    const { password } = bodyText ? JSON.parse(bodyText) : {};

    if (!token || !password) {
      return Response.json({ success: false, error: 'Token and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);



    // Find UserSetup record by token (no auth needed)
    const records = await base44.asServiceRole.entities.UserSetup.filter({ password_reset_token: token });

    if (records.length === 0) {
      return Response.json({ success: false, error: 'Geçersiz veya süresi dolmuş link. Yöneticinizden yeni davet isteyin.' });
    }

    const record = records[0];

    if (record.setup_completed) {
      return Response.json({ success: false, error: 'Bu kurulum linki daha önce kullanılmış.' });
    }

    const email = record.email;
    const invited_role = record.invited_role || 'user';
    const platformRole = ['admin', 'team_admin'].includes(invited_role) ? 'admin' : 'user';

    // Step 1: Ensure user is registered in Base44 platform
    try {
      await base44.asServiceRole.users.inviteUser(email, platformRole);
      console.log(`User registered on platform: ${email}`);
    } catch (inviteErr) {
      // May already exist — that's fine
      console.log(`User may already exist: ${inviteErr.message}`);
    }

    // Step 2: Set the password via setUserPassword function
    // We store it in UserSetup first so the password can be applied on first login
    await base44.asServiceRole.entities.UserSetup.update(record.id, {
      temp_password: password,
      setup_completed: true,
      status: 'active',
      password_reset_token: null,
      activated_at: new Date().toISOString(),
    });

    // Step 3: Try to set the password if user is currently authenticated
    // (they may have auto-logged in via the invite)
    let redirectPath = '/Dashboard';
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.auth.updateMe({ password });
        console.log(`Password set for authenticated user: ${user.email}`);
      }
    } catch (authErr) {
      console.log(`Not authenticated yet, password stored for later: ${authErr.message}`);
    }

    if (invited_role === 'student') redirectPath = '/StudentSelfPortal';
    else if (invited_role === 'teacher') redirectPath = '/TeacherDashboard';

    return Response.json({
      success: true,
      redirect: redirectPath,
      email,
      message: 'Hesabınız oluşturuldu! Giriş yapabilirsiniz.',
    });
  } catch (error) {
    console.error('Complete setup error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});