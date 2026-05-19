import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { token, full_name, chosen_role } = await req.json();
    const base44 = createClientFromRequest(req);

    if (!token || !full_name || !chosen_role) {
      return Response.json({ error: 'token, full_name and chosen_role are required' }, { status: 400 });
    }

    // Find UserSetup by token
    const setups = await base44.asServiceRole.entities.UserSetup.filter({ registration_token: token });
    if (setups.length === 0) {
      return Response.json({ error: 'Geçersiz veya süresi dolmuş kayıt linki.' }, { status: 404 });
    }

    const setup = setups[0];

    if (setup.setup_completed) {
      return Response.json({ error: 'Bu kayıt linki zaten kullanılmış.' }, { status: 400 });
    }

    const email = setup.email;

    // Determine platform role
    const platformRole = chosen_role === 'admin' ? 'admin' : 'user';

    // Now invite user to the platform (this sends the platform's own password-setup email)
    try {
      await base44.asServiceRole.users.inviteUser(email, platformRole);
    } catch (err) {
      console.log('inviteUser note:', err.message);
    }

    // Update UserSetup with chosen role and mark as completed
    await base44.asServiceRole.entities.UserSetup.update(setup.id, {
      full_name,
      invited_role: chosen_role,
      status: 'active',
      setup_completed: true,
      activated_at: new Date().toISOString(),
      registration_token: null, // invalidate token
    });

    // Determine redirect based on role
    let redirectTo = '/StaffDashboard';
    if (chosen_role === 'student') redirectTo = '/StudentSelfPortal';
    else if (chosen_role === 'teacher') redirectTo = '/TeacherDashboard';
    else if (chosen_role === 'admin') redirectTo = '/Dashboard';

    return Response.json({
      success: true,
      email,
      redirectTo,
      message: 'Kaydınız tamamlandı! Lütfen e-posta adresinizi kontrol edin ve gönderilen şifre belirleme linkine tıklayarak giriş yapın.',
    });
  } catch (error) {
    console.error('completeRegistration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});