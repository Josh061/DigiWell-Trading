
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface InvoiceOrder {
  order_number: string;
  created_at: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  currency?: string;
  status: string;
  delivery_status?: string;
  payment_method?: string;
  payment_intent_id?: string;
  delivery_address?: string;
  delivery_date?: string;
  delivered_at?: string;
  shipped_at?: string;
  guest_name?: string | null;
  guest_email?: string | null;
  notes?: string | null;
}

interface InvoiceCustomer {
  name: string;
  email: string;
  company?: string;
}

const GOLD = [212, 175, 55] as const;
const DARK_BG = [30, 41, 59] as const;
const SLATE_700 = [51, 65, 85] as const;
const WHITE = [255, 255, 255] as const;
const SLATE_400 = [148, 163, 184] as const;
const GREEN = [34, 197, 94] as const;

export function generateInvoicePDF(order: InvoiceOrder, customer: InvoiceCustomer): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ==============================
  // HEADER BAND
  // ==============================
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 55, pageWidth, 3, 'F');

  // Company name
  doc.setTextColor(...GOLD);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGIWELL', margin, 25);

  doc.setTextColor(...SLATE_400);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Energy and Assets Trading', margin, 33);

  // INVOICE label
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, 25, { align: 'right' });

  // Invoice number
  doc.setTextColor(...GOLD);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${order.order_number}`, pageWidth - margin, 33, { align: 'right' });

  // Date
  doc.setTextColor(...SLATE_400);
  doc.setFontSize(9);
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(`Date: ${invoiceDate}`, pageWidth - margin, 40, { align: 'right' });

  // Status badge
  const statusText = (order.status || 'paid').toUpperCase();
  const statusColor = order.status === 'delivered' ? GREEN : order.status === 'refunded' ? [245, 158, 11] as const : GOLD;
  doc.setFontSize(8);
  const statusWidth = doc.getTextWidth(statusText) + 8;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - statusWidth, 43, statusWidth, 7, 2, 2, 'F');
  doc.setTextColor(...DARK_BG);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - margin - statusWidth / 2, 48, { align: 'center' });

  y = 68;

  // ==============================
  // BILL TO / INVOICE DETAILS
  // ==============================
  const colWidth = contentWidth / 2;

  // Bill To
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name || 'Customer', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (customer.email) doc.text(customer.email, margin, y + 13);
  if (customer.company) doc.text(customer.company, margin, y + 19);

  // Invoice Details (right side)
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', margin + colWidth, y);

  const details = [
    ['Invoice Number:', order.order_number],
    ['Invoice Date:', invoiceDate],
    ['Payment Method:', (order.payment_method || 'Stripe').toUpperCase()],
    ['Currency:', order.currency || 'USD'],
  ];
  if (order.delivery_date) details.push(['Delivery Date:', order.delivery_date]);
  if (order.delivered_at) details.push(['Delivered:', new Date(order.delivered_at).toLocaleDateString()]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  details.forEach((row, i) => {
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], margin + colWidth, y + 7 + i * 6);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], pageWidth - margin, y + 7 + i * 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  });

  y += 7 + details.length * 6 + 10;

  // Delivery Address
  if (order.delivery_address) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
    doc.setTextColor(...GOLD);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY ADDRESS', margin + 5, y + 6);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(order.delivery_address, margin + 5, y + 12, { maxWidth: contentWidth - 10 });
    y += 22;
  }

  // ==============================
  // PRODUCT TABLE
  // ==============================
  const tableData = [
    [
      order.product_name + (order.product_code ? `\n${order.product_code}` : ''),
      order.quantity.toLocaleString(),
      `$${Number(order.unit_price).toFixed(2)}`,
      `$${Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]
  ];

  doc.autoTable({
    startY: y,
    head: [['Product', 'Quantity', 'Unit Price', 'Amount']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fillColor: [...DARK_BG],
      textColor: [...GOLD],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data: any) => {
      // Bottom border for header
      if (data.section === 'head') {
        doc.setFillColor(...GOLD);
        doc.rect(data.cell.x, data.cell.y + data.cell.height - 0.5, data.cell.width, 0.5, 'F');
      }
    }
  });

  y = doc.lastAutoTable.finalY + 5;

  // ==============================
  // TOTALS
  // ==============================
  const totalsX = pageWidth - margin - 80;
  const totalsWidth = 80;

  // Subtotal
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y + 5);
  doc.setTextColor(30, 41, 59);
  doc.text(`$${Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalsX + totalsWidth, y + 5, { align: 'right' });

  // Service Fee
  doc.setTextColor(100, 116, 139);
  doc.text('Service Fee (0.87%):', totalsX, y + 12);
  doc.setTextColor(245, 158, 11);
  doc.text(`$${Number(order.service_fee).toFixed(2)}`, totalsX + totalsWidth, y + 12, { align: 'right' });

  // Divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y + 16, totalsX + totalsWidth, y + 16);

  // Total
  doc.setFillColor(...DARK_BG);
  doc.roundedRect(totalsX - 5, y + 18, totalsWidth + 10, 14, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, y + 27);
  doc.setTextColor(...GOLD);
  doc.setFontSize(13);
  doc.text(`$${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalsX + totalsWidth, y + 27, { align: 'right' });

  y += 40;

  // ==============================
  // PAYMENT INFO
  // ==============================
  if (order.payment_intent_id) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Reference:', margin + 5, y + 7);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(order.payment_intent_id, margin + 45, y + 7);
    y += 18;
  }

  // Notes
  if (order.notes) {
    doc.setTextColor(...GOLD);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', margin, y);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, margin, y + 6, { maxWidth: contentWidth });
    y += 16;
  }

  // ==============================
  // FOOTER
  // ==============================
  const footerY = doc.internal.pageSize.getHeight() - 30;

  // Gold line
  doc.setFillColor(...GOLD);
  doc.rect(margin, footerY, contentWidth, 0.5, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Digiwell Trading LLC', margin, footerY + 6);
  doc.text('Energy and Assets Trading Platform', margin, footerY + 11);
  doc.text('OPEC Certified | OilPrice.com Live Data', margin, footerY + 16);

  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, footerY + 6, { align: 'right' });
  doc.text('Thank you for your business!', pageWidth - margin, footerY + 11, { align: 'right' });

  // ==============================
  // SAVE
  // ==============================
  const filename = `Digiwell-Invoice-${order.order_number}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export default generateInvoicePDF;
