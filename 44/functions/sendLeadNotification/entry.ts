import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    // Lead/Student data'sı
    const lead = data;
    
    if (!lead || !lead.assigned_to) {
      return Response.json({ success: true, message: 'No assigned person' });
    }

    // Sadece create event'i veya enrolled status'u için e-posta gönder
    const shouldSendEmail = 
      (event?.type === 'create') || 
      (event?.type === 'update' && lead.status === 'enrolled');
    
    if (!shouldSendEmail) {
      return Response.json({ success: true, message: 'No email needed' });
    }

    // E-posta metni oluştur
    const subject = lead.status === 'enrolled' 
      ? `Yeni Kayıt: ${lead.full_name}`
      : `Yeni Lead: ${lead.full_name}`;
    
    const body = `
      <h2>${subject}</h2>
      <p><strong>Ad Soyad:</strong> ${lead.full_name}</p>
      <p><strong>E-posta:</strong> ${lead.email || '-'}</p>
      <p><strong>Telefon:</strong> ${lead.phone || '-'}</p>
      <p><strong>İlgi Seviyesi:</strong> ${lead.interest_level || '-'}</p>
      ${lead.potential_sale_amount ? `<p><strong>Potansiyel Satış:</strong> £${lead.potential_sale_amount}</p>` : ''}
      ${lead.notes ? `<p><strong>Notlar:</strong> ${lead.notes}</p>` : ''}
      <p><strong>Durum:</strong> ${lead.status === 'enrolled' ? 'Kayıt Yapıldı' : 'Yeni Lead'}</p>
    `;

    // E-posta gönder
    await base44.integrations.Core.SendEmail({
      to: lead.assigned_to,
      subject: subject,
      body: body,
      from_name: 'Güneş English School'
    });

    return Response.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});