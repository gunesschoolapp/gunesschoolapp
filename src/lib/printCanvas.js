/**
 * Prints only a canvas element by opening a new window with just its image.
 * @param {HTMLCanvasElement} canvas
 */
export function printCanvas(canvas) {
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; justify-content: center; align-items: flex-start; background: #fff; }
          img { max-width: 100%; height: auto; display: block; }
          @media print {
            body { margin: 0; }
            img { width: 100%; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); window.close();" />
      </body>
    </html>
  `);
  win.document.close();
}