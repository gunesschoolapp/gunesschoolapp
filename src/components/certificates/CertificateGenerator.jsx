import jsPDF from 'jspdf';

function sanitize(text) {
  if (!text) return '';
  return String(text)
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c');
}

async function loadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    const ext = blob.type.includes('png') ? 'PNG' : blob.type.includes('svg') ? 'SVG' : 'JPEG';
    return { dataUrl, ext };
  } catch (_) { return null; }
}

async function addImg(doc, url, x, y, w, h) {
  const img = await loadImage(url);
  if (img) doc.addImage(img.dataUrl, img.ext, x, y, w, h, undefined, 'FAST');
}

function drawCornerOrnaments(doc, W, H, color) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  const sz = 10;
  // Top-left
  doc.line(15, 15, 15 + sz, 15);
  doc.line(15, 15, 15, 15 + sz);
  // Top-right
  doc.line(W - 15, 15, W - 15 - sz, 15);
  doc.line(W - 15, 15, W - 15, 15 + sz);
  // Bottom-left
  doc.line(15, H - 15, 15 + sz, H - 15);
  doc.line(15, H - 15, 15, H - 15 - sz);
  // Bottom-right
  doc.line(W - 15, H - 15, W - 15 - sz, H - 15);
  doc.line(W - 15, H - 15, W - 15, H - 15 - sz);
}

// ─── Template: Marble Gold ───────────────────────────────────────────────────
async function marbleGold(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url,
    certificateTitle, subtitleText } = params;

  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');
  const title = sanitize(certificateTitle || 'BASARI BELGESI');
  const subtitle = sanitize(subtitleText || 'Bu belge asagida adi yazili kisinin kursu basariyla tamamladigini onaylar.');

  doc.setFillColor(245, 242, 234); doc.rect(0, 0, W, H, 'F');

  // Subtle texture lines
  doc.setDrawColor(235, 230, 218); doc.setLineWidth(0.2);
  for (let i = -H; i < W + H; i += 10) {
    doc.line(i, 0, i + H, H);
  }

  // Double border
  doc.setDrawColor(160, 120, 40); doc.setLineWidth(3);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(210, 178, 90); doc.setLineWidth(0.8);
  doc.rect(13, 13, W - 26, H - 26);

  drawCornerOrnaments(doc, W, H, [160, 120, 40]);

  // Gold header bar
  doc.setFillColor(160, 120, 40); doc.rect(8, 8, W - 16, 24, 'F');
  if (logoUrl) {
    await addImg(doc, logoUrl, 16, 10, 18, 18);
  }
  doc.setTextColor(255, 248, 200); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 22, { align: 'center' });

  // Title
  doc.setTextColor(30, 22, 8); doc.setFontSize(28); doc.setFont('helvetica', 'bold');
  doc.text(title, W / 2, 54, { align: 'center' });

  // Gold line
  doc.setDrawColor(160, 120, 40); doc.setLineWidth(1);
  doc.line(W / 2 - 70, 58, W / 2 + 70, 58);
  doc.setLineWidth(0.3); doc.line(W / 2 - 55, 61, W / 2 + 55, 61);

  // Recipient label
  doc.setTextColor(120, 90, 30); doc.setFontSize(11); doc.setFont('helvetica', 'italic');
  doc.text('Sayin;', W / 2, 74, { align: 'center' });

  // Student name
  doc.setTextColor(15, 10, 5); doc.setFontSize(28); doc.setFont('helvetica', 'bolditalic');
  doc.text(sanitize(studentName), W / 2, 89, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(160, 120, 40); doc.setLineWidth(0.7);
  doc.line(W / 2 - nw / 2, 92, W / 2 + nw / 2, 92);

  // Subtitle
  doc.setTextColor(100, 80, 40); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(subtitle, W / 2, 103, { align: 'center' });

  // Course name
  doc.setTextColor(25, 18, 5); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 115, { align: 'center' });

  // Date
  doc.setTextColor(120, 90, 30); doc.setFontSize(9); doc.setFont('helvetica', 'italic');
  doc.text(`Tamamlanma Tarihi: ${completionDate}`, W / 2, 125, { align: 'center' });

  // Gold seal
  const sX = W / 2, sY = 155;
  doc.setFillColor(180, 140, 40); doc.circle(sX, sY, 14, 'F');
  doc.setFillColor(210, 172, 70); doc.circle(sX, sY, 11, 'F');
  doc.setFillColor(240, 210, 100); doc.circle(sX, sY, 8, 'F');
  doc.setDrawColor(160, 120, 30); doc.setLineWidth(0.4);
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    doc.line(sX + Math.cos(a) * 9, sY + Math.sin(a) * 9, sX + Math.cos(a) * 13, sY + Math.sin(a) * 13);
  }
  doc.setFillColor(140, 100, 20); doc.circle(sX, sY, 3, 'F');
  doc.setFillColor(170, 25, 25);
  doc.rect(sX - 3, sY + 14, 6, 10, 'F');

  // Signatures
  const sig1X = 65, sig2X = W - 65, sigY = 155;
  if (signature1Url) await addImg(doc, signature1Url, sig1X - 22, sigY - 18, 44, 14);
  doc.setDrawColor(160, 130, 60); doc.setLineWidth(0.5);
  doc.line(sig1X - 28, sigY, sig1X + 28, sigY);
  doc.setTextColor(35, 25, 10); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(signature1Name || 'Okul Muduru'), sig1X, sigY + 5, { align: 'center' });
  if (signature1Title) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 40);
    doc.text(sanitize(signature1Title), sig1X, sigY + 10, { align: 'center' });
  }

  if (signature2Url) await addImg(doc, signature2Url, sig2X - 22, sigY - 18, 44, 14);
  doc.setDrawColor(160, 130, 60); doc.line(sig2X - 28, sigY, sig2X + 28, sigY);
  doc.setTextColor(35, 25, 10); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(signature2Name || 'Akademik Koordinator'), sig2X, sigY + 5, { align: 'center' });
  if (signature2Title) {
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 40);
    doc.text(sanitize(signature2Title), sig2X, sigY + 10, { align: 'center' });
  }

  // Footer
  doc.setFillColor(160, 120, 40); doc.rect(8, H - 18, W - 16, 10, 'F');
  doc.setTextColor(255, 248, 200); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  |  Resmi Sertifika`, W / 2, H - 11, { align: 'center' });
}

// ─── Template: Classic Blue ──────────────────────────────────────────────────
async function classicBlue(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url,
    certificateTitle } = params;
  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');
  const title = sanitize(certificateTitle || 'Certificate of Completion');

  doc.setFillColor(245, 248, 255); doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(4);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(147, 197, 253); doc.setLineWidth(0.8);
  doc.rect(13, 13, W - 26, H - 26);

  drawCornerOrnaments(doc, W, H, [37, 99, 235]);

  doc.setFillColor(37, 99, 235); doc.rect(8, 8, W - 16, 26, 'F');
  if (logoUrl) await addImg(doc, logoUrl, 16, 10, 20, 20);
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 24, { align: 'center' });

  doc.setTextColor(37, 99, 235); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(title, W / 2, 58, { align: 'center' });
  doc.setDrawColor(234, 179, 8); doc.setLineWidth(1.5);
  doc.line(60, 63, W - 60, 63);

  doc.setTextColor(80, 80, 100); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text('This is to certify that', W / 2, 80, { align: 'center' });

  doc.setTextColor(15, 25, 55); doc.setFontSize(30); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(studentName), W / 2, 97, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.8);
  doc.line(W / 2 - nw / 2, 100, W / 2 + nw / 2, 100);

  doc.setTextColor(80, 80, 100); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the course', W / 2, 114, { align: 'center' });

  doc.setTextColor(15, 25, 55); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 128, { align: 'center' });

  doc.setTextColor(80, 80, 100); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
  doc.text(`Completion Date: ${completionDate}`, W / 2, 144, { align: 'center' });

  const sigY = 174;
  if (signature1Url) await addImg(doc, signature1Url, 42, sigY - 14, 40, 12);
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.5);
  doc.line(42, sigY, 118, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 70, 130);
  doc.text(sanitize(signature1Name || 'Director'), 80, sigY + 5, { align: 'center' });
  if (signature1Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature1Title), 80, sigY + 10, { align: 'center' }); }

  if (signature2Url) await addImg(doc, signature2Url, W - 118, sigY - 14, 40, 12);
  doc.line(W - 118, sigY, W - 42, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(sanitize(signature2Name || 'Coordinator'), W - 80, sigY + 5, { align: 'center' });
  if (signature2Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature2Title), W - 80, sigY + 10, { align: 'center' }); }

  doc.setFillColor(37, 99, 235); doc.rect(8, H - 20, W - 16, 12, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  |  Official Certificate`, W / 2, H - 12, { align: 'center' });
}

// ─── Template: Elegant Gold ──────────────────────────────────────────────────
async function elegantGold(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url } = params;
  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');

  doc.setFillColor(255, 252, 240); doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(180, 140, 40); doc.setLineWidth(5); doc.rect(6, 6, W - 12, H - 12);
  doc.setDrawColor(218, 175, 80); doc.setLineWidth(1.2); doc.rect(12, 12, W - 24, H - 24);

  drawCornerOrnaments(doc, W, H, [180, 140, 40]);

  doc.setFillColor(180, 140, 40); doc.rect(6, 6, W - 12, 26, 'F');
  if (logoUrl) await addImg(doc, logoUrl, 14, 8, 20, 20);
  doc.setTextColor(255, 248, 200); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 22, { align: 'center' });

  doc.setTextColor(120, 90, 10); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text('Certificate of Achievement', W / 2, 56, { align: 'center' });
  doc.setDrawColor(180, 140, 40); doc.setLineWidth(1);
  doc.line(70, 62, W - 70, 62); doc.setLineWidth(0.3); doc.line(55, 65, W - 55, 65);

  doc.setTextColor(100, 80, 30); doc.setFontSize(12); doc.setFont('helvetica', 'italic');
  doc.text('Proudly Presented To', W / 2, 80, { align: 'center' });

  doc.setTextColor(55, 35, 5); doc.setFontSize(30); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(studentName), W / 2, 98, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(180, 140, 40); doc.setLineWidth(0.8);
  doc.line(W / 2 - nw / 2, 101, W / 2 + nw / 2, 101);

  doc.setTextColor(100, 80, 30); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('in recognition of successful completion of', W / 2, 115, { align: 'center' });

  doc.setTextColor(55, 35, 5); doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 128, { align: 'center' });

  doc.setTextColor(100, 80, 30); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
  doc.text(`Date of Completion: ${completionDate}`, W / 2, 143, { align: 'center' });

  const sigY = 170;
  if (signature1Url) await addImg(doc, signature1Url, 42, sigY - 14, 40, 12);
  doc.setDrawColor(180, 140, 40); doc.setLineWidth(0.5);
  doc.line(42, sigY, 118, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 75, 10);
  doc.text(sanitize(signature1Name || 'Director'), 80, sigY + 5, { align: 'center' });
  if (signature1Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature1Title), 80, sigY + 10, { align: 'center' }); }

  if (signature2Url) await addImg(doc, signature2Url, W - 118, sigY - 14, 40, 12);
  doc.line(W - 118, sigY, W - 42, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(sanitize(signature2Name || 'Coordinator'), W - 80, sigY + 5, { align: 'center' });
  if (signature2Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature2Title), W - 80, sigY + 10, { align: 'center' }); }

  doc.setFillColor(180, 140, 40); doc.rect(6, H - 24, W - 12, 18, 'F');
  doc.setTextColor(255, 248, 200); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  ·  Excellence in Language Education`, W / 2, H - 13, { align: 'center' });
}

// ─── Template: Modern Dark ───────────────────────────────────────────────────
async function modernDark(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url } = params;
  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');

  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(99, 102, 241); doc.rect(0, 0, 14, H, 'F');
  doc.setFillColor(99, 102, 241); doc.rect(W - 14, 0, 14, H, 'F');
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
  doc.line(22, 22, W - 22, 22); doc.line(22, H - 22, W - 22, H - 22);

  if (logoUrl) await addImg(doc, logoUrl, 24, 26, 16, 16);
  doc.setTextColor(148, 163, 184); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 36, { align: 'center' });

  doc.setTextColor(99, 102, 241); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('— CERTIFICATE OF COMPLETION —', W / 2, 50, { align: 'center' });

  // Neon glow line effect
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
  doc.line(W / 2 - 80, 54, W / 2 + 80, 54);

  doc.setTextColor(148, 163, 184); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('This certificate is awarded to', W / 2, 72, { align: 'center' });

  doc.setTextColor(248, 250, 252); doc.setFontSize(32); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(studentName), W / 2, 92, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(2);
  doc.line(W / 2 - nw / 2, 95, W / 2 + nw / 2, 95);

  doc.setTextColor(148, 163, 184); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('for successfully completing', W / 2, 110, { align: 'center' });

  doc.setTextColor(248, 250, 252); doc.setFontSize(19); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 124, { align: 'center' });

  doc.setTextColor(148, 163, 184); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
  doc.text(`Completed on: ${completionDate}`, W / 2, 140, { align: 'center' });

  const sigY = 168;
  if (signature1Url) await addImg(doc, signature1Url, 42, sigY - 14, 40, 12);
  doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.5);
  doc.line(42, sigY, 118, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(99, 102, 241);
  doc.text(sanitize(signature1Name || 'Director'), 80, sigY + 5, { align: 'center' });
  if (signature1Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature1Title), 80, sigY + 10, { align: 'center' }); }

  if (signature2Url) await addImg(doc, signature2Url, W - 118, sigY - 14, 40, 12);
  doc.line(W - 118, sigY, W - 42, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(sanitize(signature2Name || 'Coordinator'), W - 80, sigY + 5, { align: 'center' });
  if (signature2Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature2Title), W - 80, sigY + 10, { align: 'center' }); }

  doc.setTextColor(99, 102, 241); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  |  Official Certificate`, W / 2, H - 13, { align: 'center' });
}

// ─── Template: Rose Luxury ───────────────────────────────────────────────────
async function roseLuxury(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url,
    certificateTitle } = params;
  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');
  const title = sanitize(certificateTitle || 'BASARI BELGESI');

  doc.setFillColor(255, 245, 247); doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(225, 29, 72); doc.setLineWidth(3);
  doc.rect(7, 7, W - 14, H - 14);
  doc.setDrawColor(251, 207, 215); doc.setLineWidth(1);
  doc.rect(12, 12, W - 24, H - 24);

  drawCornerOrnaments(doc, W, H, [225, 29, 72]);

  // Rose header
  doc.setFillColor(190, 18, 60); doc.rect(7, 7, W - 14, 26, 'F');
  if (logoUrl) await addImg(doc, logoUrl, 14, 9, 20, 20);
  doc.setTextColor(255, 245, 247); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 22, { align: 'center' });

  doc.setTextColor(190, 18, 60); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(title, W / 2, 56, { align: 'center' });
  doc.setDrawColor(225, 29, 72); doc.setLineWidth(1);
  doc.line(W / 2 - 70, 61, W / 2 + 70, 61);

  doc.setTextColor(159, 18, 57); doc.setFontSize(11); doc.setFont('helvetica', 'italic');
  doc.text('Bu sertifika saygiyla sunulmaktadir', W / 2, 76, { align: 'center' });

  doc.setTextColor(76, 5, 25); doc.setFontSize(30); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(studentName), W / 2, 95, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(225, 29, 72); doc.setLineWidth(0.8);
  doc.line(W / 2 - nw / 2, 98, W / 2 + nw / 2, 98);

  doc.setTextColor(159, 18, 57); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('asagidaki kursu basariyla tamamladigindan dolayi', W / 2, 113, { align: 'center' });

  doc.setTextColor(76, 5, 25); doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 126, { align: 'center' });

  doc.setTextColor(159, 18, 57); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
  doc.text(`Tamamlanma Tarihi: ${completionDate}`, W / 2, 141, { align: 'center' });

  const sigY = 170;
  if (signature1Url) await addImg(doc, signature1Url, 42, sigY - 14, 40, 12);
  doc.setDrawColor(225, 29, 72); doc.setLineWidth(0.5);
  doc.line(42, sigY, 118, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(159, 18, 57);
  doc.text(sanitize(signature1Name || 'Mudur'), 80, sigY + 5, { align: 'center' });
  if (signature1Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature1Title), 80, sigY + 10, { align: 'center' }); }

  if (signature2Url) await addImg(doc, signature2Url, W - 118, sigY - 14, 40, 12);
  doc.line(W - 118, sigY, W - 42, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(sanitize(signature2Name || 'Koordinator'), W - 80, sigY + 5, { align: 'center' });
  if (signature2Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature2Title), W - 80, sigY + 10, { align: 'center' }); }

  doc.setFillColor(190, 18, 60); doc.rect(7, H - 22, W - 14, 15, 'F');
  doc.setTextColor(255, 245, 247); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  |  Resmi Sertifika`, W / 2, H - 12, { align: 'center' });
}

// ─── Template: Forest Green ──────────────────────────────────────────────────
async function forestGreen(doc, params) {
  const { studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url,
    certificateTitle } = params;
  const W = 297, H = 210;
  const school = sanitize(schoolName || 'GÜNES ENGLISH SCHOOL');
  const title = sanitize(certificateTitle || 'BASARI BELGESI');

  doc.setFillColor(240, 253, 244); doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(3);
  doc.rect(7, 7, W - 14, H - 14);
  doc.setDrawColor(187, 247, 208); doc.setLineWidth(1);
  doc.rect(12, 12, W - 24, H - 24);

  drawCornerOrnaments(doc, W, H, [22, 163, 74]);

  doc.setFillColor(21, 128, 61); doc.rect(7, 7, W - 14, 26, 'F');
  if (logoUrl) await addImg(doc, logoUrl, 14, 9, 20, 20);
  doc.setTextColor(240, 253, 244); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(school, W / 2, 22, { align: 'center' });

  doc.setTextColor(21, 128, 61); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(title, W / 2, 56, { align: 'center' });
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(1);
  doc.line(W / 2 - 70, 61, W / 2 + 70, 61);

  doc.setTextColor(20, 83, 45); doc.setFontSize(11); doc.setFont('helvetica', 'italic');
  doc.text('Bu belgeyle onurla takdim edilmektedir', W / 2, 76, { align: 'center' });

  doc.setTextColor(5, 46, 22); doc.setFontSize(30); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(studentName), W / 2, 95, { align: 'center' });
  const nw = doc.getTextWidth(sanitize(studentName));
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.8);
  doc.line(W / 2 - nw / 2, 98, W / 2 + nw / 2, 98);

  doc.setTextColor(20, 83, 45); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('asagidaki egitim programini basariyla tamamladigindan dolayi', W / 2, 113, { align: 'center' });

  doc.setTextColor(5, 46, 22); doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.text(sanitize(courseName), W / 2, 126, { align: 'center' });

  doc.setTextColor(20, 83, 45); doc.setFontSize(10); doc.setFont('helvetica', 'italic');
  doc.text(`Tamamlanma Tarihi: ${completionDate}`, W / 2, 141, { align: 'center' });

  const sigY = 170;
  if (signature1Url) await addImg(doc, signature1Url, 42, sigY - 14, 40, 12);
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.5);
  doc.line(42, sigY, 118, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 128, 61);
  doc.text(sanitize(signature1Name || 'Mudur'), 80, sigY + 5, { align: 'center' });
  if (signature1Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature1Title), 80, sigY + 10, { align: 'center' }); }

  if (signature2Url) await addImg(doc, signature2Url, W - 118, sigY - 14, 40, 12);
  doc.line(W - 118, sigY, W - 42, sigY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text(sanitize(signature2Name || 'Koordinator'), W - 80, sigY + 5, { align: 'center' });
  if (signature2Title) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sanitize(signature2Title), W - 80, sigY + 10, { align: 'center' }); }

  doc.setFillColor(21, 128, 61); doc.rect(7, H - 22, W - 14, 15, 'F');
  doc.setTextColor(240, 253, 244); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`${school}  |  Resmi Sertifika`, W / 2, H - 12, { align: 'center' });
}

// ─── Registry ────────────────────────────────────────────────────────────────
const templateFns = {
  marble_gold: marbleGold,
  classic_blue: classicBlue,
  elegant_gold: elegantGold,
  modern_dark: modernDark,
  rose_luxury: roseLuxury,
  forest_green: forestGreen,
};

export async function generateCertificatePDF({
  studentName, courseName, completionDate,
  template = 'marble_gold',
  logoUrl = '', schoolName = '',
  signature1Name = '', signature1Title = '', signature1Url = '',
  signature2Name = '', signature2Title = '', signature2Url = '',
  certificateTitle = '', subtitleText = '',
  lang = 'tr',
}) {
  if (!certificateTitle) {
    certificateTitle = lang === 'tr' ? 'BAŞARI BELGESİ' : 'CERTIFICATE OF COMPLETION';
  }
  if (!subtitleText) {
    subtitleText = lang === 'tr'
      ? 'Bu belge, aşağıda adı yazılı kişinin kursu başarıyla tamamladığını onaylar.'
      : 'This is to certify that the above-named individual has successfully completed the course.';
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fn = templateFns[template] || marbleGold;
  await fn(doc, {
    studentName, courseName, completionDate, logoUrl, schoolName,
    signature1Name, signature1Title, signature1Url,
    signature2Name, signature2Title, signature2Url,
    certificateTitle, subtitleText,
  });
  doc.save(`certificate_${sanitize(studentName).replace(/\s+/g, '_')}.pdf`);
}

export const CERTIFICATE_TEMPLATES = [
  { id: 'marble_gold',  label: 'Mermer & Altın',  description: 'Klasik mermer arka plan, altın detaylar', accent: '#b48c28' },
  { id: 'classic_blue', label: 'Classic Blue',     description: 'Profesyonel mavi tasarım',               accent: '#2563eb' },
  { id: 'elegant_gold', label: 'Elegant Gold',     description: 'Lüks altın krem tasarım',                accent: '#b48c28' },
  { id: 'modern_dark',  label: 'Modern Dark',      description: 'Şık koyu mor tasarım',                   accent: '#6366f1' },
  { id: 'rose_luxury',  label: 'Rose Luxury',      description: 'Zarif pembe-gül tonu',                   accent: '#e11d48' },
  { id: 'forest_green', label: 'Forest & Sage',    description: 'Doğal yeşil, sakin prestij',             accent: '#16a34a' },
];