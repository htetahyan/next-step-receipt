/**
 * Compact invoice PDF: JPEG instead of PNG, moderate DPI, jsPDF FAST compression.
 * Typical files drop from several MB to a few hundred KB without changing invoice data.
 */
export async function downloadInvoicePdf(element: HTMLElement, filename: string) {
  const { toJpeg } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  await new Promise((resolve) => setTimeout(resolve, 120));

  const imgData = await toJpeg(element, {
    quality: 0.68,
    pixelRatio: 1.4,
    backgroundColor: '#ffffff',
    cacheBust: true,
  });

  if (!imgData || imgData.length < 400) {
    throw new Error('Capture failed — generated image is too small.');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const props = pdf.getImageProperties(imgData);
  const imgHeight = (props.height * pageWidth) / props.width;
  const drawHeight = Math.min(imgHeight, pageHeight);

  pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, drawHeight, undefined, 'FAST');
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, '-');
  pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
}
