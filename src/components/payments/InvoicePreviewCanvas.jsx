import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const InvoicePreviewCanvas = forwardRef(function InvoicePreviewCanvas({ template, logoUrl, schoolName, studentName, studentEmail, courseName, amount, invoiceDate, dueDate, status, lang, canvasId }, ref) {
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  const labels = lang === 'tr' ? {
    invoice: 'FATURA',
    billedTo: 'FATURA KESİLEN',
    description: 'AÇIKLAMA',
    amountLabel: 'TUTAR',
    total: 'Toplam:',
    paymentDetails: 'ÖDEME DETAYLARI',
    thanks: 'Tercih ettiğiniz için teşekkürler.',
    tuition: 'Eğitim Ücreti Faturası',
    date: 'Tarih:',
    dueDate: 'Son Ödeme:',
  } : {
    invoice: 'INVOICE',
    billedTo: 'BILLED TO',
    description: 'DESCRIPTION',
    amountLabel: 'AMOUNT',
    total: 'Total Due:',
    paymentDetails: 'PAYMENT DETAILS',
    thanks: 'Thank you for your payment.',
    tuition: 'Tuition Fee Invoice',
    date: 'Date:',
    dueDate: 'Due Date:',
  };

  const statusColors = {
    paid: '#10b981', pending: '#f59e0b', overdue: '#ef4444', cancelled: '#9ca3af'
  };
  const statusLabels = lang === 'tr'
    ? { paid: 'ÖDENDİ', pending: 'BEKLİYOR', overdue: 'GECİKMİŞ', cancelled: 'İPTAL' }
    : { paid: 'PAID', pending: 'PENDING', overdue: 'OVERDUE', cancelled: 'CANCELLED' };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const amountStr = amount ? `£${Number(amount).toLocaleString('en-GB')}` : '£ —';
    const schoolDisplay = schoolName || 'Güneş English School';
    const invDate = invoiceDate || new Date().toISOString().split('T')[0];
    const invNo = 'INV-XXXXXXXX';

    const drawTemplate = async () => {
      if (template === 'classic_blue') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#2563eb'; ctx.fillRect(0, 0, W, H * 0.14);
        ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(W * 0.04)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(schoolDisplay, W * 0.07, H * 0.07);
        ctx.font = `${Math.round(W * 0.025)}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(labels.tuition, W * 0.07, H * 0.1);
        ctx.fillStyle = 'rgba(220,230,255,0.9)'; ctx.font = `bold ${Math.round(W * 0.045)}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(labels.invoice, W * 0.94, H * 0.07);
        ctx.font = `${Math.round(W * 0.022)}px Arial`; ctx.fillStyle = 'rgba(220,230,255,0.7)';
        ctx.fillText(`${labels.date} ${invDate}`, W * 0.94, H * 0.095);
        const dueDateStr = dueDate || new Date().toISOString().split('T')[0];
        ctx.fillText(`${labels.dueDate} ${dueDateStr}`, W * 0.94, H * 0.115);
        ctx.fillText(invNo, W * 0.94, H * 0.135);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#505050'; ctx.font = `bold ${Math.round(W * 0.022)}px Arial`;
        ctx.fillText(labels.billedTo, W * 0.07, H * 0.22);
        ctx.font = `bold ${Math.round(W * 0.028)}px Arial`; ctx.fillStyle = '#1a1a1a';
        ctx.fillText(studentName || '—', W * 0.07, H * 0.29);
        ctx.font = `${Math.round(W * 0.02)}px Arial`; ctx.fillStyle = '#707070';
        if (studentEmail) ctx.fillText(studentEmail, W * 0.07, H * 0.34);

        // Table header
        ctx.fillStyle = '#f0f4ff'; ctx.fillRect(W * 0.06, H * 0.42, W * 0.88, H * 0.1);
        ctx.fillStyle = '#505080'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.description, W * 0.09, H * 0.49);
        ctx.textAlign = 'right';
        ctx.fillText(labels.amountLabel, W * 0.93, H * 0.49);
        // Row
        ctx.fillStyle = '#1a1a1a'; ctx.font = `${Math.round(W * 0.022)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(courseName || 'English Course', W * 0.09, H * 0.6);
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.93, H * 0.6);
        // Divider
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.65); ctx.lineTo(W * 0.94, H * 0.65); ctx.stroke();
        // Total
        ctx.fillStyle = '#505080'; ctx.font = `bold ${Math.round(W * 0.026)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(labels.total, W * 0.06, H * 0.73);
        ctx.fillStyle = '#2563eb'; ctx.font = `bold ${Math.round(W * 0.034)}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.93, H * 0.73);

        // Status badge
        const sc = statusColors[status] || '#9ca3af';
        ctx.fillStyle = sc;
        ctx.beginPath(); ctx.roundRect(W * 0.06, H * 0.8, W * 0.14, H * 0.055, 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(W * 0.018)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(statusLabels[status] || status?.toUpperCase() || '-', W * 0.13, H * 0.836);

        // Footer
        ctx.fillStyle = '#f0f4ff'; ctx.fillRect(0, H * 0.93, W, H * 0.07);
        ctx.fillStyle = '#8090c0'; ctx.font = `${Math.round(W * 0.018)}px Arial`;
        ctx.fillText(labels.thanks, W / 2, H * 0.965);

      } else if (template === 'modern_minimal') {
        ctx.fillStyle = '#f9fafb'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H * 0.025);
        ctx.fillStyle = '#0f172a'; ctx.font = `bold ${Math.round(W * 0.055)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(schoolDisplay, W * 0.06, H * 0.1);
        ctx.fillStyle = '#64748b'; ctx.font = `${Math.round(W * 0.023)}px Arial`;
        ctx.fillText('English School', W * 0.06, H * 0.14);
        ctx.fillStyle = '#0f172a'; ctx.font = `bold ${Math.round(W * 0.065)}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(labels.invoice, W * 0.94, H * 0.11);
        ctx.fillStyle = '#64748b'; ctx.font = `${Math.round(W * 0.022)}px Arial`;
        ctx.fillText(invNo, W * 0.94, H * 0.15);
        const dueDateStr = dueDate || new Date().toISOString().split('T')[0];
        ctx.fillText(`${labels.date} ${invDate}`, W * 0.94, H * 0.185);
        ctx.fillText(`${labels.dueDate} ${dueDateStr}`, W * 0.94, H * 0.22);

        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.22); ctx.lineTo(W * 0.94, H * 0.22); ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.billedTo, W * 0.06, H * 0.29);
        ctx.fillStyle = '#0f172a'; ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
        ctx.fillText(studentName || '—', W * 0.06, H * 0.36);
        ctx.fillStyle = '#64748b'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        if (studentEmail) ctx.fillText(studentEmail, W * 0.06, H * 0.41);

        ctx.fillStyle = '#0f172a'; ctx.fillRect(W * 0.06, H * 0.48, W * 0.88, H * 0.1);
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.description, W * 0.09, H * 0.55);
        ctx.textAlign = 'right';
        ctx.fillText(labels.amountLabel, W * 0.93, H * 0.55);

        ctx.fillStyle = '#fff'; ctx.fillRect(W * 0.06, H * 0.58, W * 0.88, H * 0.1);
        ctx.fillStyle = '#0f172a'; ctx.font = `${Math.round(W * 0.022)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(courseName || 'English Course', W * 0.09, H * 0.645);
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.93, H * 0.645);

        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.7); ctx.lineTo(W * 0.94, H * 0.7); ctx.stroke();
        ctx.fillStyle = '#0f172a'; ctx.font = `bold ${Math.round(W * 0.026)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(labels.total, W * 0.6, H * 0.78);
        ctx.fillStyle = '#6366f1'; ctx.font = `bold ${Math.round(W * 0.036)}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.93, H * 0.78);

        const sc = statusColors[status] || '#9ca3af';
        ctx.fillStyle = sc;
        ctx.beginPath(); ctx.roundRect(W * 0.06, H * 0.84, W * 0.14, H * 0.05, 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(W * 0.018)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(statusLabels[status] || '-', W * 0.13, H * 0.873);

        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, H * 0.93, W, H * 0.07);
        ctx.fillStyle = '#94a3b8'; ctx.font = `${Math.round(W * 0.018)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(labels.thanks, W / 2, H * 0.968);

      } else { // warm_professional
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, 0, W * 0.055, H);
        ctx.fillStyle = '#d97706'; ctx.fillRect(0, 0, W * 0.015, H);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#78350f'; ctx.font = `bold ${Math.round(W * 0.04)}px Georgia`;
        ctx.fillText(schoolDisplay, W * 0.09, H * 0.08);
        ctx.fillStyle = '#a16207'; ctx.font = `${Math.round(W * 0.022)}px Georgia`;
        ctx.fillText(labels.tuition, W * 0.09, H * 0.12);
        ctx.fillStyle = '#78350f'; ctx.font = `bold ${Math.round(W * 0.055)}px Georgia`;
        ctx.textAlign = 'right';
        ctx.fillText(labels.invoice, W * 0.94, H * 0.09);
        ctx.fillStyle = '#a16207'; ctx.font = `${Math.round(W * 0.02)}px Georgia`;
        const dueDateStr = dueDate || new Date().toISOString().split('T')[0];
        ctx.fillText(`${invNo}  ·  ${invDate}`, W * 0.94, H * 0.13);
        ctx.fillText(`${labels.dueDate} ${dueDateStr}`, W * 0.94, H * 0.165);

        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(W * 0.09, H * 0.175); ctx.lineTo(W * 0.94, H * 0.175); ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#a16207'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.billedTo, W * 0.09, H * 0.25);
        ctx.fillStyle = '#78350f'; ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
        ctx.fillText(studentName || '—', W * 0.09, H * 0.32);
        ctx.fillStyle = '#a16207'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        if (studentEmail) ctx.fillText(studentEmail, W * 0.09, H * 0.37);

        ctx.fillStyle = '#fef3c7'; ctx.fillRect(W * 0.09, H * 0.44, W * 0.85, H * 0.1);
        ctx.fillStyle = '#78350f'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.description, W * 0.12, H * 0.51);
        ctx.textAlign = 'right';
        ctx.fillText(labels.amountLabel, W * 0.92, H * 0.51);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#5c3711'; ctx.font = `${Math.round(W * 0.022)}px Arial`;
        ctx.fillText(courseName || 'English Course', W * 0.12, H * 0.61);
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.92, H * 0.61);
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.09, H * 0.66); ctx.lineTo(W * 0.94, H * 0.66); ctx.stroke();
        ctx.fillStyle = '#78350f'; ctx.font = `bold ${Math.round(W * 0.026)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(labels.total, W * 0.5, H * 0.74);
        ctx.fillStyle = '#d97706'; ctx.font = `bold ${Math.round(W * 0.034)}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(amountStr, W * 0.92, H * 0.74);

        ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, H * 0.92, W, H * 0.08);
        ctx.fillStyle = '#d97706'; ctx.fillRect(0, H * 0.92, W * 0.015, H * 0.08);
        ctx.fillStyle = '#78350f'; ctx.font = `${Math.round(W * 0.018)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(labels.thanks, W / 2, H * 0.962);
      }

      // Logo
      if (logoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logoUrl;
        img.onload = () => {
          ctx.drawImage(img, W * 0.06, H * 0.015, 36, 36);
        };
      }
    };

    drawTemplate();
  }, [template, logoUrl, schoolName, studentName, studentEmail, courseName, amount, invoiceDate, dueDate, status, lang]);

  return (
    <canvas
      id={canvasId}
      ref={canvasRef}
      width={600}
      height={800}
      className="w-full rounded-lg border shadow-sm"
      style={{ aspectRatio: '210/297', maxHeight: '420px', objectFit: 'contain' }}
    />
  );
});

export default InvoicePreviewCanvas;