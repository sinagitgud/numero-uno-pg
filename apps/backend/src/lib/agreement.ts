/**
 * Rent Agreement PDF Generator
 *
 * Generates a standard 11-month notarised rent agreement PDF
 * matching the Numero Uno PG template format.
 */

import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

function numberToWords(n: number): string {
  if (n === 0) return 'ZERO';
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function below100(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }
  function below1000(num: number): string {
    if (num < 100) return below100(num);
    return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 ? ' ' + below100(num % 100) : '');
  }

  let result = '';
  if (n >= 100000) {
    result += below1000(Math.floor(n / 100000)) + ' LAKH ';
    n %= 100000;
  }
  if (n >= 1000) {
    result += below1000(Math.floor(n / 1000)) + ' THOUSAND ';
    n %= 1000;
  }
  if (n > 0) result += below1000(n);
  return result.trim() + ' ONLY';
}

function ordinalDate(d: Date): string {
  const day = d.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][((day % 100) - 20 >= 0 ? (day % 10) : day % 100) <= 3 ? ((day % 100) - 20 >= 0 ? day % 10 : day % 100) : 0] || 'th';
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export interface AgreementData {
  // Lessor (Owner)
  lessorName: string;
  lessorParentage: string;   // e.g. "S/O RAMESH NAYYAR"
  lessorAddress: string;

  // Lessee (Tenant)
  lesseeName: string;
  lesseeParentage: string;   // e.g. "D/O MR GOVERDHAN SINGH"
  lesseeAddress: string;

  // Property
  propertyDescription: string;   // e.g. "BED NO. A1, ROOM 101, CAMBRIDGE HOUSE, SECTOR 168, NOIDA"
  city: string;                  // e.g. "Noida"

  // Financial
  monthlyRent: number;
  deposit: number;

  // Dates
  startDate: Date;
  endDate: Date;
  agreementDate: Date;
}

export function generateAgreementPDF(data: AgreementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 480; // usable text width

    // ── TITLE ────────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14).text('RENT AGREEMENT', { align: 'center' });
    doc.moveDown(0.5);

    // ── PREAMBLE ─────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(10);
    doc.text(
      `This agreement made at ${data.city} on this ${ordinalDate(data.agreementDate)} between-`,
      { align: 'left' }
    );
    doc.moveDown(0.5);

    // Lessor block
    doc.font('Helvetica-Bold').text(
      `${data.lessorName} ${data.lessorParentage} R/O ${data.lessorAddress}.`,
      { align: 'left', width: W }
    );
    doc.font('Helvetica').text(
      `HEREINAFTER called 'the Lessor which expression shall include his/her legal heirs and legal representative and assignees, successors and administrators on the `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text('One Part.', { continued: false });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(10).text('AND', { align: 'center' });
    doc.moveDown(0.5);

    // Lessee block
    doc.font('Helvetica-Bold').text(
      `${data.lesseeName} ${data.lesseeParentage} R/O ${data.lesseeAddress}.`,
      { align: 'left', width: W }
    );
    doc.font('Helvetica').text(
      `HEREINAFTER called 'the Lessee which expression shall include his/her legal heirs and legal representative and assignees, successors and administrators on the `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text('Second Part.', { continued: false });
    doc.moveDown(0.5);

    // Whereas
    doc.font('Helvetica').text(
      `WHEREAS the `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text('LESSOR', { continued: true });
    doc.font('Helvetica').text(
      ` is sole and absolute owner of the `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text(data.propertyDescription + '.', { continued: false, width: W });
    doc.font('Helvetica').text(
      `AND whereas LESSOR has agreed to let out the premises comprising on rent with all the furnishing and fittings therein which will be hereinafter be referred to as premises.`,
      { width: W }
    );
    doc.moveDown(0.5);

    doc.font('Helvetica').text(
      `AND WHEREAS the `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text('LESSEE', { continued: true });
    doc.font('Helvetica').text(
      ` has agreed to take the above premises belonging to LESSOR for residential purpose only not for any other use or sub letting, and on the terms & conditions herein contained for the period of `,
      { continued: true }
    );
    doc.font('Helvetica-Bold').text('11 Months.', { continued: false });
    doc.moveDown(0.5);

    // NOW THEREFORE
    doc.font('Helvetica-Bold').fontSize(10).text('NOW THEREFORE IT IS HEREBY AGREED AS FOLLOWS', { width: W });
    doc.moveDown(0.4);

    const clauses: Array<{ title: string; body: string }> = [
      {
        title: 'Rent:',
        body: `That the LESSOR would give to the LESSEE the demised premises with fitting and fixtures hereto for a limited period of 11 Months from ${formatDDMMYYYY(data.startDate)} to ${formatDDMMYYYY(data.endDate)} at a monthly rent of RS ${data.monthlyRent.toLocaleString('en-IN')}/- (RUPEES ${numberToWords(data.monthlyRent)}) on account of rent payable in advance latest within 10th of each english calendar Month.`,
      },
      {
        title: 'Deposit:',
        body: `That the LESSEE has paid a sum of RS ${data.deposit.toLocaleString('en-IN')}/- (RUPEES ${numberToWords(data.deposit)}) interest free refundable deposit as security by Cash/Neft. The security shall be refunded by the LESSOR to the LESSEE at the time of receiving back the vacant possession of the said property with fitting and fixtures and settling RWA, Electricity, Water and telephone (if) bills and all premises should be clean while handing over to the LESSOR.`,
      },
      {
        title: 'Lease Period:',
        body: `That the Lease will automatically terminate on expiry of said 11 Month period. The lease may be extended for a further period with mutual consent of both LESSOR and LESSEE.`,
      },
      {
        title: 'Use:',
        body: `That the LEASE premises shall only be used by the LESSEE for residential purpose. The LESSEE shall not sublet, assign or otherwise, part with the possession of said property or any portion thereof or use the premises for any other purpose.`,
      },
      {
        title: 'Occupancy:',
        body: `That the above said premises will be used only by the LESSEE mentioned as Second Part.`,
      },
      {
        title: 'Cancellation:',
        body: `That the LESSOR and LESSEE shall be entitled to terminate the lease at any time during the term of the lease upon 30 days prior Notice in writing of his intention to do so after Lock in Period if any.`,
      },
      {
        title: 'Authority Rules:',
        body: `That the LESSEE shall comply all rules and regulation of the Local authorities whatsoever with relation to demised premise.`,
      },
      {
        title: 'Alterations:',
        body: `That the LESSEE shall not make any structural additions or alterations in the said building, layout, fitting and fixtures without the written permission of the LESSOR but can install AC, Cooler, Fridge, Cooking Range etc. at their own cost without causing any damages to the structure, design and look of the building and with restoration of wooden partitions. The LESSEE shall not remove any fitting and fixture etc. for the above premises.`,
      },
      {
        title: 'Inspection:',
        body: `That the LESSEE shall permit the LESSOR or his/her representative to enter upon premises to carry out repair with prior appointment only.`,
      },
      {
        title: 'Possession:',
        body: `That if there will be any breach of above said terms and conditions particularly payment of rent, the LEASE shall be automatically come to an end. The LESSOR shall take the possession back by giving the 30 Days notice.`,
      },
    ];

    doc.font('Helvetica').fontSize(10);
    clauses.forEach((clause, i) => {
      doc.text(`${i + 1}.  `, { continued: true });
      doc.font('Helvetica-Bold').text(`${clause.title}  `, { continued: true });
      doc.font('Helvetica').text(clause.body.replace(/LESSOR/g, 'LESSOR').replace(/LESSEE/g, 'LESSEE'), { width: W });
      doc.moveDown(0.4);
    });

    // ── WITNESS BLOCK ────────────────────────────────────────────────────────
    doc.moveDown(0.5);
    doc.font('Helvetica').text(
      `IN WITNESS WHEREOF the parties hereto have set and subscribed their respective signatures by way of putting thumb impression electronic signature hereto in the presence of witness, who are identifying the executants, on the day, month and year first above written.`,
      { width: W }
    );
    doc.moveDown(1.5);

    // Signature lines
    doc.font('Helvetica').text('LESSOR', { continued: false });
    doc.moveUp();
    doc.text('LESSEE', { align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(240, doc.y).stroke();
    doc.moveTo(310, doc.y).lineTo(doc.page.width - 60, doc.y).stroke();
    doc.moveDown(2);

    doc.text('Witness 1', { continued: false });
    doc.moveUp();
    doc.text('Witness 2', { align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(240, doc.y).stroke();
    doc.moveTo(310, doc.y).lineTo(doc.page.width - 60, doc.y).stroke();

    doc.end();
  });
}
