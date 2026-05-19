import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    // Fetch invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Fetch student
    const student = await base44.asServiceRole.entities.Student.get(invoice.student_id);
    if (!student?.email) return Response.json({ error: 'Student has no email address' }, { status: 400 });

    // Fetch course
    const course = await base44.asServiceRole.entities.Course.get(invoice.course_id);

    // Fetch invoice template settings
    const templates = await base44.asServiceRole.entities.InvoiceTemplate.list();
    const template = templates[0] || {};

    const schoolName = template.school_name || 'Language School';
    const courseName = course?.name || 'Course';
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const amount = invoice.amount?.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' }) || '£0.00';
    const amountPaid = (invoice.amount_paid || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
    const remaining = ((invoice.amount || 0) - (invoice.amount_paid || 0)).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

    const bankSection = template.bank_account_number ? `
      <div style="background:#f5f7fa;border-radius:8px;padding:16px;margin-top:20px;">
        <strong>Bank Details:</strong><br>
        ${template.bank_name ? `Bank: ${template.bank_name}<br>` : ''}
        ${template.bank_sort_code ? `Sort Code: ${template.bank_sort_code}<br>` : ''}
        Account: ${template.bank_account_number}
      </div>` : '';

    const statusLabel = { draft: 'Draft', sent: 'Sent', paid: 'PAID', pending: 'Pending', overdue: 'OVERDUE', cancelled: 'Cancelled' }[invoice.status] || invoice.status;
    const statusColor = { paid: '#16a34a', overdue: '#dc2626', sent: '#2563eb', pending: '#d97706', draft: '#6b7280', cancelled: '#9ca3af' }[invoice.status] || '#6b7280';

    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fafc;padding:24px 0;">
        <!-- Card -->
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin:0 12px;">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%);padding:32px 36px 28px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px;">${schoolName}</h1>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">FATURA / INVOICE</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">${invoice.invoice_number}</p>
                <span style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;background:${statusColor};">${statusLabel}</span>
              </div>
            </div>
          </div>

          <div style="padding:32px 36px;">
            <!-- Greeting -->
            <p style="margin:0 0 6px;font-size:15px;color:#374151;">Sayın / Dear <strong style="color:#1e3a5f;">${student.full_name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;"><strong>${courseName}</strong> kursu için faturanız aşağıda yer almaktadır.<br>Please find your invoice details below for <strong>${courseName}</strong>.</p>

            <!-- Invoice Table -->
            <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="background:#f1f5f9;">
                  <td style="padding:11px 16px;font-weight:600;color:#374151;width:50%;">Fatura No / Invoice #</td>
                  <td style="padding:11px 16px;color:#1e40af;font-weight:700;">${invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding:11px 16px;font-weight:600;color:#374151;border-top:1px solid #f1f5f9;">Kurs / Course</td>
                  <td style="padding:11px 16px;color:#374151;border-top:1px solid #f1f5f9;">${courseName}</td>
                </tr>
                ${invoice.issue_date ? `
                <tr style="background:#f1f5f9;">
                  <td style="padding:11px 16px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0;">Düzenleme Tarihi / Issue Date</td>
                  <td style="padding:11px 16px;color:#374151;border-top:1px solid #e2e8f0;">${new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>` : ''}
                ${dueDate ? `
                <tr>
                  <td style="padding:11px 16px;font-weight:600;color:#374151;border-top:1px solid #f1f5f9;">Son Ödeme / Due Date</td>
                  <td style="padding:11px 16px;font-weight:700;color:#dc2626;border-top:1px solid #f1f5f9;">${dueDate}</td>
                </tr>` : ''}
                <tr style="background:#eff6ff;">
                  <td style="padding:14px 16px;font-weight:700;color:#1e3a5f;font-size:15px;border-top:2px solid #bfdbfe;">Toplam Tutar / Total Amount</td>
                  <td style="padding:14px 16px;font-weight:800;color:#1d4ed8;font-size:16px;border-top:2px solid #bfdbfe;">${amount}</td>
                </tr>
                ${invoice.amount_paid > 0 ? `
                <tr>
                  <td style="padding:11px 16px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0;">Ödenen / Amount Paid</td>
                  <td style="padding:11px 16px;color:#16a34a;font-weight:700;border-top:1px solid #e2e8f0;">${amountPaid}</td>
                </tr>
                <tr style="background:#fef9ee;">
                  <td style="padding:11px 16px;font-weight:700;color:#92400e;border-top:1px solid #fde68a;">Kalan Bakiye / Balance Due</td>
                  <td style="padding:11px 16px;font-weight:800;color:#d97706;border-top:1px solid #fde68a;">${remaining}</td>
                </tr>` : ''}
              </table>
            </div>

            ${bankSection}

            ${template.footer_notes ? `<p style="color:#9ca3af;font-size:12px;margin:16px 0 0;padding:12px;background:#f9fafb;border-radius:6px;border-left:3px solid #e2e8f0;">${template.footer_notes}</p>` : ''}

            <p style="margin-top:28px;font-size:14px;color:#6b7280;">Herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.<br>If you have any questions, please don't hesitate to contact us.</p>
            <p style="margin:4px 0 0;font-size:14px;color:#374151;">Saygılarımızla / Kind regards,<br><strong style="color:#1e3a5f;">${schoolName}</strong></p>
          </div>

          <!-- Footer -->
          <div style="background:#1e3a5f;padding:16px 36px;display:flex;justify-content:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);text-align:center;">
              ${[template.school_email, template.school_phone, template.school_address].filter(Boolean).join(' &nbsp;·&nbsp; ')}
            </p>
          </div>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: student.email,
      subject: `Invoice ${invoice.invoice_number} — ${schoolName}`,
      body: emailBody,
    });

    // Mark as sent
    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      status: 'sent',
      sent_date: new Date().toISOString().split('T')[0],
    });

    return Response.json({ success: true, sent_to: student.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});