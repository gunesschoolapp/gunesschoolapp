import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#2563eb');
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [37, 99, 235];
}

async function loadImage(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Resolve the actual color from style name or custom hex
function resolveColor(template) {
  const styleColors = {
    classic:  '#2563eb',
    modern:   '#111827',
    emerald:  '#059669',
    violet:   '#7c3aed',
  };
  const style = template.invoice_style;
  if (style && styleColors[style]) return hexToRgb(styleColors[style]);
  return hexToRgb(template.primary_color || '#2563eb');
}

// ─── Classic Blue ─────────────────────────────────────────────────────────────
async function generateClassic(doc, invoice, template, logoData) {
  const pageW = 210, margin = 15;
  const primary = resolveColor(template);

  // Header band
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 48, 'F');

  let logoX = margin;
  if (logoData) {
    doc.addImage(logoData, 'JPEG', margin, 9, 26, 14, undefined, 'FAST');
    logoX = margin + 30;
  }

  doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(template.school_name || 'School'), logoX, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  if (template.school_address) doc.text(sanitize(template.school_address), logoX, 23);
  if (template.school_phone)   doc.text(sanitize(template.school_phone), logoX, 29);
  if (template.school_email)   doc.text(template.school_email, logoX, 35);

  doc.setFontSize(24); doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - margin, 18, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(sanitize(invoice.invoice_number || ''), pageW - margin, 26, { align: 'right' });
  doc.text(invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMMM yyyy') : '', pageW - margin, 33, { align: 'right' });

  return 58;
}

// ─── Modern Minimal ───────────────────────────────────────────────────────────
async function generateModern(doc, invoice, template, logoData) {
  const pageW = 210, margin = 15;
  const primary = resolveColor(template);

  // Left accent bar
  doc.setFillColor(...primary);
  doc.rect(0, 0, 4, 297, 'F');

  // Light header
  doc.setFillColor(248, 249, 252);
  doc.rect(4, 0, pageW - 4, 50, 'F');

  if (logoData) {
    doc.addImage(logoData, 'JPEG', margin, 10, 24, 13, undefined, 'FAST');
  }

  doc.setFontSize(13); doc.setTextColor(...primary); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(template.school_name || 'School'), logoData ? margin + 28 : margin, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 130);
  if (template.school_email) doc.text(template.school_email, logoData ? margin + 28 : margin, 27);
  if (template.school_phone) doc.text(sanitize(template.school_phone), logoData ? margin + 28 : margin, 33);

  doc.setFontSize(28); doc.setTextColor(30, 30, 40); doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageW - margin, 24, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 130);
  doc.text(sanitize(invoice.invoice_number || ''), pageW - margin, 33, { align: 'right' });
  doc.text(invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMM yyyy') : '', pageW - margin, 40, { align: 'right' });

  // Divider
  doc.setDrawColor(220, 220, 230); doc.setLineWidth(0.5);
  doc.line(margin, 52, pageW - margin, 52);

  return 62;
}

// ─── Shared body renderer ─────────────────────────────────────────────────────
function renderBody(doc, invoice, template, y, primary) {
  const pageW = 210, margin = 15;

  // Billed To + Due Date
  doc.setTextColor(130, 130, 140); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', margin, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(25, 25, 35);
  doc.text(sanitize(invoice.student_name || ''), margin, y + 6);
  doc.setFontSize(8); doc.setTextColor(120, 120, 130);
  if (invoice.student_email) doc.text(invoice.student_email, margin, y + 12);
  if (invoice.student_address) doc.text(sanitize(invoice.student_address), margin, y + 18);

  if (invoice.due_date) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(130, 130, 140);
    doc.text('DUE DATE', pageW - margin - 28, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(25, 25, 35); doc.setFontSize(9);
    doc.text(format(new Date(invoice.due_date), 'dd MMM yyyy'), pageW - margin - 28, y + 6);
  }

  y += 28;

  // Table
  const cols = [margin, 100, 140, 170, pageW - margin];
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];

  doc.setFillColor(...primary);
  doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i] + 2, y + 5.5));

  y += 9;
  const items = invoice.line_items || [];
  items.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? [248, 249, 252] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setTextColor(30, 30, 35); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(sanitize(item.description || ''), cols[0] + 2, y + 5);
    doc.text(String(item.quantity || 1), cols[1] + 2, y + 5);
    doc.text(`£${(item.unit_price || 0).toFixed(2)}`, cols[2] + 2, y + 5);
    doc.text(`£${(item.total || 0).toFixed(2)}`, cols[3] + 2, y + 5);
    y += 7;
  });

  doc.setDrawColor(220, 220, 230); doc.setLineWidth(0.3);
  doc.rect(margin, y - (items.length * 7) - 9, pageW - 2 * margin, items.length * 7 + 9);
  y += 8;

  // Totals
  const totalsX = 130;
  doc.setFontSize(8); doc.setTextColor(130, 130, 140);
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(25, 25, 35);
  doc.text(`£${(invoice.subtotal || 0).toFixed(2)}`, pageW - margin, y, { align: 'right' });
  y += 6;

  doc.setTextColor(130, 130, 140);
  doc.text(`VAT (${invoice.vat_rate || 20}%):`, totalsX, y);
  doc.setTextColor(25, 25, 35);
  doc.text(`£${(invoice.vat_amount || 0).toFixed(2)}`, pageW - margin, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(...primary); doc.setLineWidth(0.4);
  doc.line(totalsX, y + 2, pageW - margin, y + 2);
  y += 7;

  doc.setFillColor(...primary);
  doc.rect(totalsX, y - 4, pageW - margin - totalsX, 9, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TOTAL:', totalsX + 2, y + 2);
  doc.text(`£${(invoice.total_amount || 0).toFixed(2)}`, pageW - margin - 2, y + 2, { align: 'right' });
  y += 16;

  // Bank details
  if (template.bank_account_number) {
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, pageW - 2 * margin, 18, 'F');
    doc.setTextColor(130, 130, 140); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('BANK DETAILS:', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(25, 25, 35);
    const bankLine = [
      template.bank_name && sanitize(template.bank_name),
      template.bank_sort_code && `Sort Code: ${template.bank_sort_code}`,
      template.bank_account_number && `Acc: ${template.bank_account_number}`,
    ].filter(Boolean).join('   ');
    doc.text(bankLine, margin + 3, y + 12);
    y += 22;
  }

  // Notes
  if (template.footer_notes) {
    doc.setTextColor(160, 160, 170); doc.setFontSize(7); doc.setFont('helvetica', 'italic');
    const lines = doc.splitTextToSize(sanitize(template.footer_notes), pageW - 2 * margin);
    doc.text(lines, margin, y);
  }

  // Footer bar
  doc.setFillColor(...primary);
  doc.rect(0, 287, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(sanitize(template.school_name || ''), margin, 293);
  if (template.school_email) doc.text(template.school_email, pageW / 2, 293, { align: 'center' });
  if (template.school_website) doc.text(sanitize(template.school_website), pageW - margin, 293, { align: 'right' });
}

async function generateInvoicePDF(invoice, template = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const primary = resolveColor(template);

  let logoData = null;
  if (template.logo_url) logoData = await loadImage(template.logo_url);

  const style = template.invoice_style || 'classic';
  let y;

  if (style === 'modern') {
    y = await generateModern(doc, invoice, template, logoData);
  } else {
    // classic, emerald, violet — all use the classic header layout
    y = await generateClassic(doc, invoice, template, logoData);
  }

  renderBody(doc, invoice, template, y, primary);
  return doc;
}

const InvoicePDFGenerator = {
  generate: generateInvoicePDF,
  download: async (invoice, template) => {
    const doc = await generateInvoicePDF(invoice, template);
    doc.save(`${invoice.invoice_number || 'invoice'}.pdf`);
  }
};

export default InvoicePDFGenerator;