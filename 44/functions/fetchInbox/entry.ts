import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { email_account_id } = await req.json();

  // Get account(s)
  let accountsToFetch = [];
  if (email_account_id) {
    const accounts = await base44.asServiceRole.entities.EmailAccount.filter({ id: email_account_id });
    if (accounts[0]) accountsToFetch.push(accounts[0]);
  } else {
    accountsToFetch = await base44.asServiceRole.entities.EmailAccount.filter({ status: 'active' });
  }

  if (accountsToFetch.length === 0) return Response.json({ error: 'Aktif e-posta hesabı bulunamadı.' }, { status: 400 });

  // Filter to only accounts with IMAP configured
  accountsToFetch = accountsToFetch.filter(a => a.imap_host && a.imap_host.trim());

  const { ImapFlow } = await import('npm:imapflow@1.0.164');
  const results = [];

  for (const account of accountsToFetch) {
    if (!account.imap_host) continue;

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port || 993,
      secure: true,
      auth: { user: account.smtp_user, pass: account.smtp_pass },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      const messages = [];

      // Fetch INBOX
      const inboxLock = await client.getMailboxLock('INBOX');
      try {
        const count = client.mailbox.exists;
        const start = Math.max(1, count - 99);
        for await (const msg of client.fetch(`${start}:*`, {
          uid: true, envelope: true, bodyStructure: true,
          bodyParts: ['TEXT'],
        })) {
          const bodyText = msg.bodyParts?.get('text') || msg.bodyParts?.get('1') || null;
          const snippet = bodyText
            ? Buffer.from(bodyText).toString('utf8').slice(0, 200).replace(/\s+/g, ' ').trim()
            : '';

          const hasAttachments = msg.bodyStructure?.childNodes?.some(n =>
            n.disposition?.toLowerCase() === 'attachment'
          ) || false;

          messages.push({
            uid: `${account.id}_${msg.uid}`,
            account_id: account.id,
            from_email: msg.envelope.from?.[0]?.address || '',
            from_name: msg.envelope.from?.[0]?.name || '',
            to: msg.envelope.to?.map(a => a.address).join(', ') || '',
            cc: msg.envelope.cc?.map(a => a.address).join(', ') || '',
            subject: msg.envelope.subject || '(no subject)',
            snippet,
            received_at: msg.envelope.date?.toISOString() || new Date().toISOString(),
            has_attachments: hasAttachments,
          });
        }
      } finally {
        inboxLock.release();
      }

      // Try to also fetch Spam folder
      const spamFolderNames = ['Spam', 'Junk', '[Gmail]/Spam', 'SPAM'];
      for (const spamName of spamFolderNames) {
        try {
          const spamLock = await client.getMailboxLock(spamName);
          try {
            const count = client.mailbox.exists;
            if (count > 0) {
              const start = Math.max(1, count - 29);
              for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true })) {
                messages.push({
                  uid: `${account.id}_spam_${msg.uid}`,
                  account_id: account.id,
                  from_email: msg.envelope.from?.[0]?.address || '',
                  from_name: msg.envelope.from?.[0]?.name || '',
                  to: msg.envelope.to?.map(a => a.address).join(', ') || '',
                  subject: msg.envelope.subject || '(no subject)',
                  received_at: msg.envelope.date?.toISOString() || new Date().toISOString(),
                  spam: true,
                });
              }
            }
          } finally {
            spamLock.release();
          }
          break; // Found spam folder
        } catch { /* skip */ }
      }

      await client.logout();

      // Upsert: skip already stored UIDs
      const existing = await base44.asServiceRole.entities.InboxEmail.filter({ account_id: account.id });
      const existingUids = new Set(existing.map(e => e.uid));
      const newOnes = messages.filter(m => !existingUids.has(m.uid));
      for (const m of newOnes) {
        await base44.asServiceRole.entities.InboxEmail.create(m);
      }

      results.push({ account: account.email, fetched: messages.length, new: newOnes.length });
    } catch (err) {
      results.push({ account: account.email, error: err.message });
    }
  }

  return Response.json({ results });
});