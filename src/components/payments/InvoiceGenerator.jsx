import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

function tr(text) {
  if (!text) return '';
  return String(text)
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c');
}

async function addLogoToDoc(doc, logoUrl, x, y, maxW, maxH) {
  if (!logoUrl) return;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    const ext = blob.type.includes('png') ? 'PNG' : blob.type.includes('svg') ? 'SVG' : 'JPEG';
    doc.addImage(dataUrl, ext, x, y, maxW, maxH, undefined, 'FAST');
  } catch (_) {}
}

function getBase(payment, student, course, lang = 'en') {
  const invoiceDate = payment.payment_date || format(new Date(), 'yyyy-MM-dd');
  const invNo = `INV-${(payment.id || '00000000').slice(0, 8).toUpperCase()}`;
  const desc = course?.name || 'English Course';
  const level = course?.cefr_level || student?.cefr_level || '-';
  const instalment = `${payment.installment_number || 1} / ${payment.total_installments || 1}`;
  const amount = `£${(payment.amount || 0).toLocaleString('en-GB')}`;
  const methodMap = lang === 'tr'
    ? { cash: 'Nakit', credit_card: 'Kredi Kartı', bank_transfer: 'Banka Havalesi', other: 'Diğer' }
    : { cash: 'Cash', credit_card: 'Credit Card', bank_transfer: 'Bank Transfer', other: 'Other' };
  const statusMap = lang === 'tr'
    ? { paid: 'ÖDENDİ', pending: 'BEKLİYOR', overdue: 'GECİKMİŞ', cancelled: 'İPTAL' }
    : { paid: 'PAID', pending: 'PENDING', overdue: 'OVERDUE', cancelled: 'CANCELLED' };
  const labels = lang === 'tr'
    ? { invoice: 'FATURA', billedTo: 'FATURA KESİLEN:', tuition: 'Eğitim Ücreti Faturası', desc: 'AÇIKLAMA', level: 'SEVİYE', inst: 'TAKSİT', total: 'Toplam:', details: 'ÖDEME DETAYLARI', method: 'Yöntem:', dueDate: 'Son Ödeme:', dateLabel: 'Tarih:', thanks: 'Tercih ettiğiniz için teşekkürler.', contact: 'Sorularınız için lütfen bizimle iletişime geçin.' }
    : { invoice: 'INVOICE', billedTo: 'BILL TO', tuition: 'Tuition Fee Invoice', desc: 'Description', level: 'Level', inst: 'Instalment', total: 'Total:', details: 'PAYMENT DETAILS', method: 'Method:', dueDate: 'Due Date:', dateLabel: 'Date:', thanks: 'Thank you for choosing us.', contact: 'For questions, please contact us.' };
  return { invoiceDate, invNo, desc, level, instalment, amount, methodMap, statusMap, labels };
}

// ─── Template 1: Classic Blue ────────────────────────────────────────────────
async function classicBlue(doc, { payment, student, course, logoUrl, schoolName, lang }) {
  const pageW = doc.internal.pageSize.getWidth();
  const { invoiceDate, invNo, desc, level, instalment, amount, methodMap, statusMap, labels } = getBase(payment, student, course, lang);
  const school = schoolName || 'Güneş English School';

  doc.setFillColor(37, 99, 235); doc.rect(0, 0, pageW, 44, 'F');
  if (logoUrl) await addLogoToDoc(doc, logoUrl, 15, 8, 24, 24);
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text(tr(school), logoUrl ? 44 : 20, 20);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(labels.tuition, logoUrl ? 44 : 20, 32);
  doc.setTextColor(220, 230, 255); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(labels.invoice, pageW - 20, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`${labels.dateLabel} ${invoiceDate}`, pageW - 20, 27, { align: 'right' });
  doc.text(`Invoice #: ${invNo}`, pageW - 20, 35, { align: 'right' });

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
  doc.text(labels.billedTo, 20, 58);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  doc.text(tr(student?.full_name || '-'), 20, 66);
  if (student?.email) doc.text(student.email, 20, 73);
  if (student?.phone) doc.text(student.phone, 20, 80);

  doc.setDrawColor(220, 220, 220); doc.line(20, 90, pageW - 20, 90);
  doc.setFillColor(245, 247, 250); doc.rect(20, 94, pageW - 40, 10, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
  doc.text(labels.desc, 25, 101); doc.text(labels.level, 110, 101);
  doc.text(labels.inst, 140, 101); doc.text(lang === 'tr' ? 'TUTAR' : 'Amount', pageW - 25, 101, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  doc.text(tr(desc), 25, 114); doc.text(tr(level), 110, 114);
  doc.text(instalment, 140, 114); doc.text(amount, pageW - 25, 114, { align: 'right' });
  doc.setDrawColor(220, 220, 220); doc.line(20, 122, pageW - 20, 122);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(labels.total, 140, 134); doc.setTextColor(37, 99, 235);
  doc.text(amount, pageW - 25, 134, { align: 'right' });

  doc.setTextColor(80, 80, 80); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(labels.details, 20, 152);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  if (payment.payment_method) doc.text(`${labels.method} ${methodMap[payment.payment_method] || payment.payment_method}`, 20, 160);
  if (payment.due_date) doc.text(`${labels.dueDate} ${payment.due_date}`, 20, 167);
  doc.text(`Status: ${statusMap[payment.status] || payment.status}`, 20, 174);
  if (payment.notes) doc.text(tr(`${lang === 'tr' ? 'Not:' : 'Notes:'} ${payment.notes}`), 20, 181);

  doc.setFillColor(245, 247, 250); doc.rect(0, 270, pageW, 27, 'F');
  doc.setTextColor(130, 130, 130); doc.setFontSize(8);
  doc.text(tr(labels.thanks), pageW / 2, 281, { align: 'center' });
  doc.text(tr(labels.contact), pageW / 2, 288, { align: 'center' });
}

// ─── Template 2: Modern Minimal ──────────────────────────────────────────────
async function modernMinimal(doc, { payment, student, course, logoUrl, schoolName, lang }) {
  const pageW = doc.internal.pageSize.getWidth();
  const { invoiceDate, invNo, desc, level, instalment, amount, methodMap, statusMap, labels } = getBase(payment, student, course, lang);
  const school = schoolName || 'Güneş';

  doc.setFillColor(249, 250, 251); doc.rect(0, 0, pageW, 297, 'F');
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 8, 'F');

  if (logoUrl) await addLogoToDoc(doc, logoUrl, 18, 14, 22, 22);
  const textX = logoUrl ? 46 : 20;
  doc.setTextColor(15, 23, 42); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(tr(school), textX, 30);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('English School', textX, 38);

  doc.setTextColor(15, 23, 42); doc.setFontSize(32); doc.setFont('helvetica', 'bold');
  doc.text(labels.invoice, pageW - 20, 28, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(invNo, pageW - 20, 36, { align: 'right' });
  doc.text(invoiceDate, pageW - 20, 43, { align: 'right' });

  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
  doc.line(20, 52, pageW - 20, 52);

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
  doc.text(labels.billedTo, 20, 62);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(tr(student?.full_name || '-'), 20, 70);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  if (student?.email) doc.text(student.email, 20, 77);
  if (student?.phone) doc.text(student.phone, 20, 83);

  doc.setFillColor(15, 23, 42); doc.rect(20, 98, pageW - 40, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text(labels.desc.toUpperCase(), 25, 105); doc.text(labels.level.toUpperCase(), 110, 105);
  doc.text(labels.inst.toUpperCase(), 140, 105); doc.text(lang === 'tr' ? 'TUTAR' : 'AMOUNT', pageW - 25, 105, { align: 'right' });
  doc.setFillColor(255, 255, 255); doc.rect(20, 108, pageW - 40, 14, 'F');
  doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(tr(desc), 25, 117); doc.text(tr(level), 110, 117);
  doc.text(instalment, 140, 117); doc.text(amount, pageW - 25, 117, { align: 'right' });

  doc.setDrawColor(226, 232, 240); doc.line(20, 124, pageW - 20, 124);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
  doc.text(labels.total, pageW - 60, 136);
  doc.setTextColor(99, 102, 241); doc.setFontSize(14);
  doc.text(amount, pageW - 20, 136, { align: 'right' });

  const statusColors = { paid: [16, 185, 129], pending: [245, 158, 11], overdue: [239, 68, 68], cancelled: [156, 163, 175] };
  const sc = statusColors[payment.status] || [156, 163, 175];
  doc.setFillColor(...sc); doc.roundedRect(20, 148, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(statusMap[payment.status] || '-', 35, 153.5, { align: 'center' });

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  if (payment.payment_method) doc.text(`${labels.method} ${methodMap[payment.payment_method] || '-'}`, 20, 165);
  if (payment.due_date) doc.text(`${labels.dueDate} ${payment.due_date}`, 20, 172);
  if (payment.notes) doc.text(tr(`${lang === 'tr' ? 'Not:' : 'Notes:'} ${payment.notes}`), 20, 179);

  doc.setFillColor(15, 23, 42); doc.rect(0, 278, pageW, 20, 'F');
  doc.setTextColor(148, 163, 184); doc.setFontSize(7);
  doc.text(tr(`${school}  ·  ${labels.thanks}`), pageW / 2, 289, { align: 'center' });
}

// ─── Template 3: Warm Professional ───────────────────────────────────────────
async function warmProfessional(doc, { payment, student, course, logoUrl, schoolName, lang }) {
  const pageW = doc.internal.pageSize.getWidth();
  const { invoiceDate, invNo, desc, level, instalment, amount, methodMap, statusMap, labels } = getBase(payment, student, course, lang);
  const school = schoolName || 'Güneş English School';

  doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, 297, 'F');
  doc.setFillColor(254, 243, 199); doc.rect(0, 0, 18, 297, 'F');
  doc.setFillColor(217, 119, 6); doc.rect(0, 0, 5, 297, 'F');

  if (logoUrl) await addLogoToDoc(doc, logoUrl, 22, 8, 20, 20);
  const textX = logoUrl ? 48 : 28;
  doc.setTextColor(120, 53, 15); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(tr(school), textX, 22);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(161, 98, 7);
  doc.text('Tuition Fee Invoice', textX, 31);

  doc.setTextColor(120, 53, 15); doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.text(labels.invoice, pageW - 20, 22, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(161, 98, 7);
  doc.text(`${invNo}  ·  ${invoiceDate}`, pageW - 20, 30, { align: 'right' });

  doc.setDrawColor(253, 230, 138); doc.setLineWidth(1);
  doc.line(28, 40, pageW - 20, 40);

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(161, 98, 7);
  doc.text(labels.billedTo, 28, 52);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 53, 15);
  doc.text(tr(student?.full_name || '-'), 28, 60);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(161, 98, 7);
  if (student?.email) doc.text(student.email, 28, 67);
  if (student?.phone) doc.text(student.phone, 28, 74);

  doc.setFillColor(254, 243, 199); doc.rect(28, 88, pageW - 48, 10, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 53, 15);
  doc.text(labels.desc.toUpperCase(), 33, 95); doc.text(labels.level.toUpperCase(), 110, 95);
  doc.text(labels.inst.toUpperCase(), 140, 95); doc.text(lang === 'tr' ? 'TUTAR' : 'AMOUNT', pageW - 25, 95, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(92, 55, 15);
  doc.text(tr(desc), 33, 108); doc.text(tr(level), 110, 108);
  doc.text(instalment, 140, 108); doc.text(amount, pageW - 25, 108, { align: 'right' });
  doc.setDrawColor(253, 230, 138); doc.line(28, 116, pageW - 20, 116);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 53, 15);
  doc.text(labels.total, 140, 128); doc.setTextColor(217, 119, 6); doc.setFontSize(13);
  doc.text(amount, pageW - 20, 128, { align: 'right' });

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(161, 98, 7);
  doc.text(labels.details, 28, 145);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(92, 55, 15);
  if (payment.payment_method) doc.text(`${labels.method} ${methodMap[payment.payment_method] || '-'}`, 28, 153);
  if (payment.due_date) doc.text(`${labels.dueDate} ${payment.due_date}`, 28, 160);
  doc.text(`Status: ${statusMap[payment.status] || '-'}`, 28, 167);
  if (payment.notes) doc.text(tr(`${lang === 'tr' ? 'Not:' : 'Notes:'} ${payment.notes}`), 28, 174);

  doc.setFillColor(254, 243, 199); doc.rect(0, 276, pageW, 22, 'F');
  doc.setFillColor(217, 119, 6); doc.rect(0, 276, 5, 22, 'F');
  doc.setTextColor(120, 53, 15); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(tr(`${labels.thanks}`), pageW / 2, 287, { align: 'center' });
  doc.text(tr(labels.contact), pageW / 2, 293, { align: 'center' });
}

const templates = { classic_blue: classicBlue, modern_minimal: modernMinimal, warm_professional: warmProfessional };

export async function generateInvoicePDF({ payment, student, course, template = 'classic_blue', logoUrl = '', schoolName = '', lang = 'tr' }) {
  if (!payment) return;
  const doc = new jsPDF();
  const fn = templates[template] || classicBlue;
  await fn(doc, { payment, student, course, logoUrl, schoolName, lang });
  const invoiceDate = payment.payment_date || format(new Date(), 'yyyy-MM-dd');
  const filename = `invoice-${tr(student?.full_name || 'student').replace(/\s+/g, '-')}-${invoiceDate}.pdf`;
  doc.save(filename);
}

export const INVOICE_TEMPLATES = [
  { id: 'classic_blue',      label: 'Classic Blue',      description: 'Profesyonel mavi başlık', accent: '#2563eb' },
  { id: 'modern_minimal',    label: 'Modern Minimal',    description: 'Temiz koyu & mor',        accent: '#6366f1' },
  { id: 'warm_professional', label: 'Warm Professional', description: 'Amber & sıcak tonlar',    accent: '#d97706' },
];