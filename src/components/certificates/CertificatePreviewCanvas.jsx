import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Renders a scaled certificate preview on a canvas
const CertificatePreviewCanvas = forwardRef(function CertificatePreviewCanvas({ template, logoUrl, schoolName, studentName, courseName, completionDate, lang, signature1Name, signature1Title, signature2Name, signature2Title }, ref) {
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  const labels = lang === 'tr' ? {
    certify: 'Bu belge, aşağıda adı yazılı kişinin kursu başarıyla tamamladığını onaylar.',
    completed: 'adlı kursu başarıyla tamamlamıştır.',
    completionDate: 'Tamamlanma Tarihi:',
    title: 'BAŞARI BELGESİ',
    presented: 'Sayın;',
    official: 'Resmi Sertifika',
  } : {
    certify: 'This is to certify that',
    completed: 'has successfully completed the course',
    completionDate: 'Completion Date:',
    title: 'CERTIFICATE OF COMPLETION',
    presented: 'Proudly Presented To',
    official: 'Official Certificate',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const drawTemplate = async () => {
      if (template === 'marble_gold') {
        // Background
        ctx.fillStyle = '#f2f1ef';
        ctx.fillRect(0, 0, W, H);
        // Marble lines
        ctx.strokeStyle = '#e6e4e1';
        ctx.lineWidth = 0.5;
        for (let i = -H; i < W + H; i += 16) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        }
        // Gold outer border
        ctx.strokeStyle = '#b4913c'; ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.strokeStyle = '#d2af5a'; ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        // Title
        ctx.fillStyle = '#1e1910';
        ctx.font = `bold ${Math.round(W * 0.045)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(labels.title, W / 2, H * 0.22);

        // Gold divider
        ctx.strokeStyle = '#b4913c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(W * 0.25, H * 0.27); ctx.lineTo(W * 0.75, H * 0.27); ctx.stroke();

        // "Presented to"
        ctx.fillStyle = '#5c4826';
        ctx.font = `italic ${Math.round(W * 0.022)}px Georgia, serif`;
        ctx.fillText(labels.presented, W / 2, H * 0.36);

        // Student name
        ctx.fillStyle = '#14100a';
        ctx.font = `bold italic ${Math.round(W * 0.05)}px Georgia, serif`;
        ctx.fillText(studentName || 'Öğrenci Adı', W / 2, H * 0.48);

        // Underline
        const nw = ctx.measureText(studentName || 'Öğrenci Adı').width;
        ctx.strokeStyle = '#a08240'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - nw / 2, H * 0.505);
        ctx.lineTo(W / 2 + nw / 2, H * 0.505);
        ctx.stroke();

        // Course
        ctx.fillStyle = '#5c4826';
        ctx.font = `${Math.round(W * 0.018)}px Georgia, serif`;
        ctx.fillText(labels.certify.length < 50 ? labels.certify : labels.certify.substring(0, 60) + '...', W / 2, H * 0.58);
        ctx.fillStyle = '#14100a';
        ctx.font = `bold ${Math.round(W * 0.028)}px Georgia, serif`;
        ctx.fillText(courseName || 'Kurs Adı', W / 2, H * 0.65);
        ctx.fillStyle = '#64522e';
        ctx.font = `italic ${Math.round(W * 0.016)}px Georgia, serif`;
        ctx.fillText(`${labels.completionDate} ${completionDate || '---'}`, W / 2, H * 0.71);

        // Seal
        const sx = W / 2, sy = H * 0.8;
        ctx.fillStyle = '#c8a532';
        ctx.beginPath(); ctx.arc(sx, sy, W * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dcc046';
        ctx.beginPath(); ctx.arc(sx, sy, W * 0.034, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0d264';
        ctx.beginPath(); ctx.arc(sx, sy, W * 0.022, 0, Math.PI * 2); ctx.fill();
        // Rays
        ctx.strokeStyle = '#b4913c'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 12; i++) {
          const a = (i * 30 * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * W * 0.036, sy + Math.sin(a) * W * 0.036);
          ctx.lineTo(sx + Math.cos(a) * W * 0.044, sy + Math.sin(a) * W * 0.044);
          ctx.stroke();
        }

        // Signature lines
        const sig1x = W * 0.22, sig2x = W * 0.78, signy = H * 0.82;
        ctx.strokeStyle = '#a08240'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sig1x - W * 0.1, signy); ctx.lineTo(sig1x + W * 0.1, signy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sig2x - W * 0.1, signy); ctx.lineTo(sig2x + W * 0.1, signy); ctx.stroke();
        ctx.fillStyle = '#2a1e0e';
        ctx.font = `bold ${Math.round(W * 0.015)}px Arial, sans-serif`;
        ctx.fillText(signature1Name || 'Okul Müdürü', sig1x, signy + H * 0.04);
        if (signature1Title) {
          ctx.fillStyle = '#6e5a35'; ctx.font = `${Math.round(W * 0.013)}px Arial, sans-serif`;
          ctx.fillText(signature1Title, sig1x, signy + H * 0.07);
        }
        ctx.fillStyle = '#2a1e0e';
        ctx.font = `bold ${Math.round(W * 0.015)}px Arial, sans-serif`;
        ctx.fillText(signature2Name || 'Akademik Koordinatör', sig2x, signy + H * 0.04);
        if (signature2Title) {
          ctx.fillStyle = '#6e5a35'; ctx.font = `${Math.round(W * 0.013)}px Arial, sans-serif`;
          ctx.fillText(signature2Title, sig2x, signy + H * 0.07);
        }

        // Footer
        ctx.fillStyle = '#a08028';
        ctx.fillRect(12, H - 26, W - 24, 16);
        ctx.fillStyle = '#fff8c8';
        ctx.font = `${Math.round(W * 0.014)}px Arial, sans-serif`;
        ctx.fillText(`${schoolName || 'Güneş English School'}  |  ${labels.official}`, W / 2, H - 14);

        // Logo
        if (logoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoUrl;
          img.onload = () => { ctx.drawImage(img, W / 2 - 20, H * 0.04, 40, 26); };
        } else {
          ctx.fillStyle = '#a08028';
          ctx.fillRect(W / 2 - 20, H * 0.04, 40, 26);
          ctx.fillStyle = '#fff8c8';
          ctx.font = `bold ${Math.round(W * 0.016)}px Arial`;
          ctx.fillText((schoolName || 'GES').substring(0, 3).toUpperCase(), W / 2, H * 0.04 + 17);
        }

      } else if (template === 'classic_blue') {
        ctx.fillStyle = '#f5f8ff'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, W - 20, H - 20);
        ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1;
        ctx.strokeRect(17, 17, W - 34, H - 34);
        // Header
        ctx.fillStyle = '#2563eb'; ctx.fillRect(10, 10, W - 20, 34);
        ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(W * 0.025)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(schoolName || 'GÜNEŞ ENGLISH SCHOOL', W / 2, 32);
        // Title
        ctx.fillStyle = '#2563eb'; ctx.font = `bold ${Math.round(W * 0.042)}px Georgia`;
        ctx.fillText(lang === 'tr' ? 'BAŞARI BELGESİ' : 'Certificate of Completion', W / 2, H * 0.32);
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W * 0.22, H * 0.36); ctx.lineTo(W * 0.78, H * 0.36); ctx.stroke();
        ctx.fillStyle = '#505050'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(labels.certify.substring(0, 50), W / 2, H * 0.44);
        ctx.fillStyle = '#14204a'; ctx.font = `bold ${Math.round(W * 0.048)}px Georgia`;
        ctx.fillText(studentName || 'Öğrenci Adı', W / 2, H * 0.55);
        ctx.fillStyle = '#505050'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(lang === 'tr' ? 'adlı kursu tamamlamıştır:' : 'has successfully completed:', W / 2, H * 0.63);
        ctx.fillStyle = '#14204a'; ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
        ctx.fillText(courseName || 'Kurs Adı', W / 2, H * 0.71);
        ctx.fillStyle = '#505050'; ctx.font = `${Math.round(W * 0.016)}px Arial`;
        ctx.fillText(`${labels.completionDate} ${completionDate || '---'}`, W / 2, H * 0.78);
        // Signature
        ctx.strokeStyle = '#b4b4b4'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(W * 0.16, H * 0.88); ctx.lineTo(W * 0.42, H * 0.88); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * 0.58, H * 0.88); ctx.lineTo(W * 0.84, H * 0.88); ctx.stroke();
        ctx.fillStyle = '#818181'; ctx.font = `${Math.round(W * 0.013)}px Arial`;
        ctx.fillText(signature1Name || 'Director', W * 0.29, H * 0.915);
        ctx.fillText(signature2Name || 'Coordinator', W * 0.71, H * 0.915);
        // Footer
        ctx.fillStyle = '#2563eb'; ctx.fillRect(10, H - 26, W - 20, 16);
        ctx.fillStyle = '#fff'; ctx.font = `${Math.round(W * 0.014)}px Arial`;
        ctx.fillText(`${schoolName || 'Güneş English School'}  |  ${labels.official}`, W / 2, H - 14);

      } else if (template === 'elegant_gold') {
        ctx.fillStyle = '#fffcf0'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#b48c28'; ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, W - 16, H - 16);
        ctx.strokeStyle = '#daaf50'; ctx.lineWidth = 1.5;
        ctx.strokeRect(16, 16, W - 32, H - 32);
        ctx.fillStyle = '#b48c28'; ctx.fillRect(8, 8, W - 16, 36);
        ctx.fillStyle = '#fff8c8'; ctx.font = `bold ${Math.round(W * 0.025)}px Georgia`;
        ctx.textAlign = 'center';
        ctx.fillText(`✦  ${schoolName || 'GÜNEŞ ENGLISH SCHOOL'}  ✦`, W / 2, 30);
        ctx.fillStyle = '#785a0a'; ctx.font = `bold ${Math.round(W * 0.04)}px Georgia`;
        ctx.fillText('Certificate of Achievement', W / 2, H * 0.3);
        ctx.strokeStyle = '#b48c28'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W * 0.26, H * 0.35); ctx.lineTo(W * 0.74, H * 0.35); ctx.stroke();
        ctx.fillStyle = '#64500a'; ctx.font = `italic ${Math.round(W * 0.022)}px Georgia`;
        ctx.fillText(labels.presented, W / 2, H * 0.44);
        ctx.fillStyle = '#3c2805'; ctx.font = `bold ${Math.round(W * 0.05)}px Georgia`;
        ctx.fillText(studentName || 'Öğrenci Adı', W / 2, H * 0.55);
        ctx.fillStyle = '#64500a'; ctx.font = `${Math.round(W * 0.02)}px Georgia`;
        ctx.fillText(lang === 'tr' ? 'kursunu başarıyla tamamlamıştır:' : 'in recognition of completing:', W / 2, H * 0.63);
        ctx.fillStyle = '#3c2805'; ctx.font = `bold ${Math.round(W * 0.03)}px Georgia`;
        ctx.fillText(courseName || 'Kurs Adı', W / 2, H * 0.71);
        ctx.fillStyle = '#64500a'; ctx.font = `italic ${Math.round(W * 0.016)}px Georgia`;
        ctx.fillText(`${labels.completionDate} ${completionDate || '---'}`, W / 2, H * 0.78);
        ctx.strokeStyle = '#b48c28'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(W * 0.16, H * 0.87); ctx.lineTo(W * 0.42, H * 0.87); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * 0.58, H * 0.87); ctx.lineTo(W * 0.84, H * 0.87); ctx.stroke();
        ctx.fillStyle = '#785a0a'; ctx.font = `${Math.round(W * 0.013)}px Arial`;
        ctx.fillText(signature1Name || 'Director', W * 0.29, H * 0.91);
        ctx.fillText(signature2Name || 'Coordinator', W * 0.71, H * 0.91);
        ctx.fillStyle = '#b48c28'; ctx.fillRect(8, H - 28, W - 16, 20);
        ctx.fillStyle = '#fff8c8'; ctx.font = `${Math.round(W * 0.014)}px Arial`;
        ctx.fillText(`${schoolName || 'Güneş English School'}  ·  Excellence in Education`, W / 2, H - 14);

      } else { // modern_dark
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#6366f1'; ctx.fillRect(0, 0, 16, H);
        ctx.fillStyle = '#6366f1'; ctx.fillRect(W - 16, 0, 16, H);
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(24, 28); ctx.lineTo(W - 24, 28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24, H - 28); ctx.lineTo(W - 24, H - 28); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.font = `bold ${Math.round(W * 0.02)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(schoolName || 'GÜNEŞ ENGLISH SCHOOL', W / 2, 52);
        ctx.fillStyle = '#6366f1'; ctx.font = `bold ${Math.round(W * 0.022)}px Arial`;
        ctx.fillText('— CERTIFICATE OF COMPLETION —', W / 2, H * 0.28);
        ctx.fillStyle = '#94a3b8'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(lang === 'tr' ? 'Bu sertifika aşağıdaki kişiye verilmektedir:' : 'This certificate is awarded to', W / 2, H * 0.4);
        ctx.fillStyle = '#f8fafc'; ctx.font = `bold ${Math.round(W * 0.052)}px Arial`;
        ctx.fillText(studentName || 'Öğrenci Adı', W / 2, H * 0.52);
        const nw = ctx.measureText(studentName || 'Öğrenci Adı').width;
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W / 2 - nw / 2, H * 0.555); ctx.lineTo(W / 2 + nw / 2, H * 0.555); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.font = `${Math.round(W * 0.02)}px Arial`;
        ctx.fillText(lang === 'tr' ? 'kursunu başarıyla tamamladığı için:' : 'for successfully completing', W / 2, H * 0.63);
        ctx.fillStyle = '#f8fafc'; ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
        ctx.fillText(courseName || 'Kurs Adı', W / 2, H * 0.71);
        ctx.fillStyle = '#94a3b8'; ctx.font = `${Math.round(W * 0.016)}px Arial`;
        ctx.fillText(`${labels.completionDate} ${completionDate || '---'}`, W / 2, H * 0.79);
        ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(W * 0.16, H * 0.88); ctx.lineTo(W * 0.42, H * 0.88); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * 0.58, H * 0.88); ctx.lineTo(W * 0.84, H * 0.88); ctx.stroke();
        ctx.fillStyle = '#6366f1'; ctx.font = `${Math.round(W * 0.013)}px Arial`;
        ctx.fillText(signature1Name || 'Director', W * 0.29, H * 0.915);
        ctx.fillText(signature2Name || 'Coordinator', W * 0.71, H * 0.915);
        ctx.fillStyle = '#6366f1'; ctx.font = `${Math.round(W * 0.013)}px Arial`;
        ctx.fillText(`${schoolName || 'Güneş English School'}  |  Official Certificate`, W / 2, H - 8);
      }
    };

    drawTemplate();
  }, [template, logoUrl, schoolName, studentName, courseName, completionDate, lang, signature1Name, signature1Title, signature2Name, signature2Title]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={495}
      className="w-full rounded-lg border shadow-sm"
      style={{ aspectRatio: '297/210' }}
    />
  );
});

export default CertificatePreviewCanvas;