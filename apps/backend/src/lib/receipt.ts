/**
 * PDF receipt generation helper.
 * Shared between the invoice download route and the payment approval flow.
 */

import PDFDocument from 'pdfkit';
import { prisma } from './prisma';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function amountInWords(amount: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (amount === 0) return 'Zero';
  const n = Math.round(amount);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + amountInWords(n % 100) : '');
  if (n < 100000) return amountInWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + amountInWords(n % 1000) : '');
  return amountInWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + amountInWords(n % 100000) : '');
}

/**
 * Generates a rent receipt PDF for the given invoice.
 * Throws if the invoice is not found or has no payments.
 * Returns a Buffer containing the PDF bytes.
 */
export async function generateReceiptPdf(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      tenant: {
        include: {
          user: { select: { name: true, phone: true } },
          bed: { include: { room: { include: { property: { select: { name: true, address: true, code: true } } } } } },
        },
      },
      payments: { orderBy: { date: 'asc' } },
    },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.payments.length === 0) throw new Error('No payments recorded yet');

  const tenantName = invoice.tenant.user.name;
  const propertyName = invoice.tenant.bed.room.property.name;
  const propertyAddress = invoice.tenant.bed.room.property.address;
  const roomNo = invoice.tenant.bed.room.number;
  const bedLabel = invoice.tenant.bed.label;
  const monthName = MONTH_NAMES[invoice.month - 1];
  const totalPaid = Number(invoice.amountPaid);
  const receiptNo = `REC-${invoice.id.slice(-6).toUpperCase()}-${invoice.month.toString().padStart(2,'0')}${invoice.year}`;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENT RECEIPT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
      .text(propertyName, { align: 'center' });
    if (propertyAddress) doc.text(propertyAddress, { align: 'center' });
    doc.moveDown(0.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);

    // Receipt meta
    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    const metaY = doc.y;
    doc.text(`Receipt No: ${receiptNo}`, 50, metaY);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });
    doc.moveDown(1);

    // Body
    doc.fontSize(11).font('Helvetica')
      .text('Received with thanks from ', { continued: true })
      .font('Helvetica-Bold').text(tenantName);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('The sum of ', { continued: true })
      .font('Helvetica-Bold').text(`₹ ${totalPaid.toLocaleString('en-IN')}`, { continued: true })
      .font('Helvetica').text(` (${amountInWords(totalPaid)} Rupees Only)`);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('Towards rent for ', { continued: true })
      .font('Helvetica-Bold').text(`${monthName} ${invoice.year}`);

    doc.moveDown(0.5);
    doc.font('Helvetica').text('Accommodation: ', { continued: true })
      .font('Helvetica-Bold').text(`${propertyName}, Room ${roomNo}, Bed ${bedLabel}`);

    doc.moveDown(1);

    // Payments table
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555555').text('PAYMENT DETAILS');
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Date', 50, doc.y, { width: 120 });
    doc.text('Mode', 170, doc.y - doc.currentLineHeight(), { width: 100 });
    doc.text('Amount', 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);

    invoice.payments.forEach((p) => {
      const pDate = new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(pDate, 50, rowY, { width: 120 });
      doc.text(p.mode, 170, rowY, { width: 100 });
      doc.text(`₹ ${Number(p.amount).toLocaleString('en-IN')}`, 400, rowY, { width: 145, align: 'right' });
      doc.moveDown(0.5);
    });

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Total Paid:', 50, doc.y, { width: 300 });
    doc.text(`₹ ${totalPaid.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(2);

    if (totalPaid > 5000) {
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text('* A ₹1 revenue stamp is affixed on the original receipt as required for amounts exceeding ₹5,000.', { align: 'center' });
      doc.moveDown(0.5);
    }

    doc.fontSize(8).fillColor('#aaaaaa')
      .text('This is a computer-generated receipt and does not require a physical signature.', { align: 'center' });

    doc.end();
  });
}