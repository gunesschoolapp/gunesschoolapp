import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const entityName = event?.entity_name; // 'Student' or 'Personnel'

    if (!data || !data.email) {
      console.log('No email found, skipping invite.');
      return Response.json({ skipped: true, reason: 'no email' });
    }

    // Skip if invite already sent
    if (data.login_invite_sent === true) {
      console.log('Invite already sent for', data.email);
      return Response.json({ skipped: true, reason: 'already sent' });
    }

    // For students: only invite if they have a course assigned
    if (entityName === 'Student' && !data.course_id) {
      console.log('Student has no course assigned, skipping invite.');
      return Response.json({ skipped: true, reason: 'no course assigned' });
    }

    // Determine role
    let userRole = 'user';
    if (entityName === 'Personnel') {
      const personnelRole = data.role || 'staff';
      userRole = ['admin', 'team_admin'].includes(personnelRole) ? 'admin' : 'user';
    }

    // Send invite
    console.log(`Sending invite to ${data.email} with role ${userRole}`);
    await base44.asServiceRole.users.inviteUser(data.email, userRole);

    // Mark invite as sent
    if (entityName === 'Student') {
      await base44.asServiceRole.entities.Student.update(data.id, { login_invite_sent: true });
    } else if (entityName === 'Personnel') {
      await base44.asServiceRole.entities.Personnel.update(data.id, { login_invite_sent: true });
    }

    console.log(`Invite sent successfully to ${data.email}`);
    return Response.json({ success: true, email: data.email, role: userRole });
  } catch (error) {
    console.error('autoSendLoginInvite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});