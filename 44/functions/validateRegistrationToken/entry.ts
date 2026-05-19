import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ valid: false, error: 'Token gerekli.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const setups = await base44.asServiceRole.entities.UserSetup.filter({ registration_token: token });

    if (setups.length === 0) {
      return Response.json({ valid: false, error: 'Geçersiz veya süresi dolmuş kayıt linki.' });
    }

    const setup = setups[0];

    if (setup.setup_completed) {
      return Response.json({ valid: false, error: 'Bu kayıt linki zaten kullanılmış.' });
    }

    return Response.json({
      valid: true,
      email: setup.email,
      full_name: setup.full_name || '',
      invited_role: setup.invited_role || '',
    });
  } catch (error) {
    console.error('validateRegistrationToken error:', error);
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
});