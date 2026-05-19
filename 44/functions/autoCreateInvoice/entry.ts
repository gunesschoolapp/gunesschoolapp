import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload
    const { event, data } = body;

    // Only process "paid" payments
    if (!data || data.status !== 'paid') {
      return Response.json({ skipped: true, reason: 'Not a paid payment' });
    }

    const paymentId = event?.entity_id || data?.id;
    if (!paymentId) return Response.json({ skipped: true, reason: 'No payment id' });

    // Check if invoice already exists for this payment
    const existing = await base44.asServiceRole.entities.Invoice.filter({ payment_id: paymentId });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'Invoice already exists' });
    }

    // Get student info
    const student = data.student_id
      ? await base44.asServiceRole.entities.Student.filter({ id: data.student_id }).then(r => r[0])
      : null;

    // Get course info
    const course = data.course_id
      ? await base44.asServiceRole.entities.Course.filter({ id: data.course_id }).then(r => r[0])
      : null;

    // Get active template for VAT rate
    const templates = await base44.asServiceRole.entities.InvoiceTemplate.list();
    const template = templates.find(t => t.is_active) || templates[0];
    const vatRate = template?.default_vat_rate ?? 20;
    const paymentTermsDays = parseInt(template?.default_payment_terms || '14');

    // Generate invoice number: INV-YYYY-XXXX
    const allInvoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 1);
    const lastNum = allInvoices.length > 0
      ? parseInt((allInvoices[0].invoice_number || 'INV-2026-0000').split('-').pop()) + 1
      : 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(lastNum).padStart(4, '0')}`;

    // Calculate amounts
    // Amount stored is inclusive or exclusive? We treat it as VAT-exclusive (net)
    const subtotal = parseFloat(data.amount) || 0;
    const vatAmount = parseFloat(((subtotal * vatRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + vatAmount).toFixed(2));

    const issueDate = data.payment_date || new Date().toISOString().slice(0, 10);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const lineItems = [{
      description: course ? `${course.name} - Tuition Fee${data.total_installments > 1 ? ` (Installment ${data.installment_number}/${data.total_installments})` : ''}` : 'English Language Tuition',
      quantity: 1,
      unit_price: subtotal,
      total: subtotal,
    }];

    const invoice = {
      invoice_number: invoiceNumber,
      payment_id: paymentId,
      student_id: data.student_id,
      course_id: data.course_id,
      student_name: student?.full_name || '',
      student_email: student?.email || '',
      student_address: student?.address || '',
      issue_date: issueDate,
      due_date: dueDate.toISOString().slice(0, 10),
      line_items: lineItems,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      status: 'paid',
      payment_method: data.payment_method || '',
      notes: data.notes || '',
    };

    const created = await base44.asServiceRole.entities.Invoice.create(invoice);

    return Response.json({ success: true, invoice_id: created.id, invoice_number: invoiceNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});