import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { to, subject, body, email_account_id } = payload;
    
    if (!to || !subject || !body) {
      return Response.json({ error: 'to, subject, body zorunlu' }, { status: 400 });
    }

    // Get email account
    let account;
    if (email_account_id) {
      const accounts = await base44.asServiceRole.entities.EmailAccount.filter({ id: email_account_id });
      account = accounts[0];
    } else {
      const defaults = await base44.asServiceRole.entities.EmailAccount.filter({ is_default: true, status: 'active' });
      if (defaults.length === 0) {
        const all = await base44.asServiceRole.entities.EmailAccount.filter({ status: 'active' });
        account = all[0];
      } else {
        account = defaults[0];
      }
    }

    if (!account) {
      return Response.json({ error: 'Aktif e-posta hesabı bulunamadı.' }, { status: 400 });
    }

    let status = 'sent';
    let errorMessage = null;

    try {
      // Use Brevo API if it's a Brevo account
      if (account.smtp_host.includes('brevo.com')) {
        // Extract API key from smtp_pass if it starts with 'xkeysib-'
        const apiKey = account.smtp_pass;
        
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            sender: {
              name: account.from_name || account.name,
              email: account.email,
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: body,
          }),
        });

        if (!brevoResponse.ok) {
          const errorData = await brevoResponse.text();
          throw new Error(`Brevo API error: ${brevoResponse.status} - ${errorData}`);
        }
      } else {
        // Fallback to Nodemailer for other SMTP providers
        const nodemailer = await import('npm:nodemailer@6.9.9');
        const transporter = nodemailer.default.createTransport({
          host: account.smtp_host,
          port: Number(account.smtp_port) || 587,
          secure: Boolean(account.use_ssl),
          auth: {
            user: account.smtp_user,
            pass: account.smtp_pass,
          },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: `"${account.from_name || account.name}" <${account.email}>`,
          to,
          subject,
          html: body,
        });
      }
    } catch (smtpError) {
      status = 'failed';
      errorMessage = smtpError.message;
    }

    // Log to SentEmail entity
    await base44.asServiceRole.entities.SentEmail.create({
      to,
      subject,
      body,
      from_email: account.email,
      from_name: account.from_name || account.name,
      sent_by: user.email,
      status,
      error_message: errorMessage,
      account_id: account.id,
    });

    if (status === 'failed') {
      return Response.json({ error: errorMessage }, { status: 500 });
    }

    return Response.json({ success: true, sent_from: account.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});