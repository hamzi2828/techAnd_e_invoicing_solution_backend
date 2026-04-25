const PDFDocument = require('pdfkit');

/**
 * Generate a PDF invoice from invoice data
 * @param {Object} invoiceData - Invoice data object
 * @param {String} qrCodeBase64 - Optional QR code image as Base64 string
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateInvoicePDF(invoiceData, qrCodeBase64 = null) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            // Collect PDF data into buffers
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Extract invoice data
            const invoice = invoiceData.invoiceHeader || invoiceData;
            const supplier = invoiceData.accountingSupplierParty || {};
            const customer = invoiceData.accountingCustomerParty || {};

            // Header
            doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
            doc.moveDown();

            // Invoice Details
            doc.fontSize(10);
            doc.text(`Invoice Number: ${invoice.invoiceId || invoiceData.invoiceID || 'N/A'}`, { align: 'right' });
            doc.text(`Date: ${invoice.issueDate || invoiceData.issueDate || 'N/A'}`, { align: 'right' });
            doc.text(`Time: ${invoice.issueTime || invoiceData.issueTime || 'N/A'}`, { align: 'right' });
            doc.moveDown();

            // Supplier Information
            doc.fontSize(12).text('From:', { underline: true });
            doc.fontSize(10);
            doc.text(supplier.name || 'N/A');
            doc.text(`CR: ${supplier.cr || 'N/A'}`);
            doc.text(`VAT: ${supplier.vatRegistration || 'N/A'}`);
            if (supplier.streetName) {
                doc.text(`${supplier.streetName}, ${supplier.district || ''}`);
                doc.text(`${supplier.cityName || ''}, ${supplier.postalZone || ''}`);
            }
            doc.moveDown();

            // Customer Information
            doc.fontSize(12).text('To:', { underline: true });
            doc.fontSize(10);
            doc.text(customer.name || 'N/A');
            if (customer.cr) doc.text(`CR: ${customer.cr}`);
            doc.text(`VAT: ${customer.vatRegistration || 'N/A'}`);
            if (customer.streetName) {
                doc.text(`${customer.streetName}, ${customer.district || ''}`);
                doc.text(`${customer.cityName || ''}, ${customer.postalZone || ''}`);
            }
            doc.moveDown(2);

            // Helper function to get tax rate from VAT category
            const getTaxRateFromCategory = (categoryCode) => {
                const rates = { 'S': 15, 'Z': 0, 'E': 0, 'O': 0 };
                return rates[categoryCode] ?? 15;
            };

            // Helper function to get VAT category label (matching invoice view page format)
            const getVatCategoryLabel = (categoryCode) => {
                const labels = {
                    'S': 'S - 15%',
                    'Z': 'Z - 0%',
                    'E': 'E - 0%',
                    'O': 'O - 0%'
                };
                return labels[categoryCode] || 'S - 15%';
            };

            // Line Items Table Header (matching invoice view page: Description, Qty, Unit Price, VAT, Tax, Total)
            const tableTop = doc.y;
            const descX = 50;
            const qtyX = 220;
            const priceX = 270;
            const vatX = 340;
            const taxX = 410;
            const totalX = 480;

            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Description', descX, tableTop);
            doc.text('Qty', qtyX, tableTop);
            doc.text('Unit Price', priceX, tableTop);
            doc.text('VAT', vatX, tableTop);
            doc.text('Tax', taxX, tableTop);
            doc.text('Total', totalX, tableTop);
            doc.moveDown();

            // Draw line under header
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            // Line Items
            const invoiceLines = invoiceData.invoiceLines || [];
            let yPosition = doc.y;
            const currency = invoiceData.documentCurrency || 'SAR';

            // Calculate totals from line items to ensure accuracy
            let calculatedSubtotal = 0;
            let calculatedTax = 0;

            invoiceLines.forEach((line) => {
                // Get VAT category and calculate tax
                const vatCategoryCode = line.vatCategoryCode || line.taxCategoryType || 'S';
                const taxRate = getTaxRateFromCategory(vatCategoryCode);
                const lineAmount = line.lineExtensionAmount || 0;
                const taxAmount = lineAmount * (taxRate / 100);
                const lineTotal = lineAmount + taxAmount;
                const vatLabel = getVatCategoryLabel(vatCategoryCode);
                const exemptionReason = line.taxExemptionReason || line.taxExemptionReasonText || '';

                // Accumulate totals
                calculatedSubtotal += lineAmount;
                calculatedTax += taxAmount;

                // Description (with exemption reason for non-S categories)
                doc.font('Helvetica').fontSize(8);
                const itemName = line.name || line.description || 'N/A';
                doc.text(itemName, descX, yPosition, { width: 160 });

                // Check if we need to show exemption reason
                const showExemptionReason = vatCategoryCode !== 'S' && exemptionReason;

                // Other columns on same line as description
                doc.text(line.invoicedQuantity || 0, qtyX, yPosition);
                doc.text(`${currency} ${(line.price || 0).toFixed(2)}`, priceX, yPosition);
                doc.text(vatLabel, vatX, yPosition);
                doc.text(`${currency} ${taxAmount.toFixed(2)}`, taxX, yPosition);
                doc.text(`${currency} ${lineTotal.toFixed(2)}`, totalX, yPosition);

                yPosition += 15;

                // Show exemption reason on next line for non-S categories (like invoice view page)
                if (showExemptionReason) {
                    doc.fontSize(7).fillColor('#666666');
                    doc.text(`Reason: ${exemptionReason}`, descX, yPosition, { width: 160 });
                    doc.fillColor('#000000'); // Reset color
                    yPosition += 12;
                }

                yPosition += 10; // Space between items
            });

            // Use calculated values or fallback to passed values
            const subtotal = calculatedSubtotal || invoiceData.legalMonetaryTotalTaxExclusiveAmount || 0;
            const totalTax = calculatedTax || invoiceData.taxTotalSummary || 0;
            const grandTotal = subtotal + totalTax;

            doc.y = yPosition;
            doc.moveDown();

            // Draw line before totals
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            // Totals (matching invoice view page format)
            const totalsLabelX = 380;
            const totalsValueX = 480;
            doc.font('Helvetica').fontSize(10);

            doc.text('Subtotal:', totalsLabelX, doc.y);
            doc.text(`${currency} ${subtotal.toFixed(2)}`, totalsValueX, doc.y);
            doc.moveDown(0.5);

            doc.text('Tax (VAT):', totalsLabelX, doc.y);
            doc.text(`${currency} ${totalTax.toFixed(2)}`, totalsValueX, doc.y);
            doc.moveDown(0.5);

            // Draw line before total
            doc.moveTo(totalsLabelX, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.3);

            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('Total:', totalsLabelX, doc.y);
            doc.text(`${currency} ${grandTotal.toFixed(2)}`, totalsValueX, doc.y);
            doc.moveDown(2);

            // Payment Terms
            if (invoiceData.paymentMeanInstructionNote) {
                doc.font('Helvetica').fontSize(9);
                doc.text(`Payment Terms: ${invoiceData.paymentMeanInstructionNote}`);
                doc.moveDown();
            }

            // Notes
            if (invoiceData.notes) {
                doc.fontSize(9).text(`Notes: ${invoiceData.notes}`);
            }

            // Add ZATCA QR Code if available
            if (qrCodeBase64) {
                try {
                    // Convert Base64 to Buffer
                    const qrImageBuffer = Buffer.from(qrCodeBase64, 'base64');

                    // Position QR code in bottom right corner
                    const qrSize = 120;
                    const qrX = doc.page.width - qrSize - 50;
                    const qrY = doc.page.height - qrSize - 100;

                    // Reset fill color to black for text
                    doc.fillColor('#000000');

                    // Add label above QR code
                    doc.fontSize(9)
                       .text('ZATCA E-Invoice', qrX, qrY - 20, {
                           width: qrSize,
                           align: 'center'
                       });

                    // Embed QR code image
                    doc.image(qrImageBuffer, qrX, qrY, {
                        width: qrSize,
                        height: qrSize,
                        fit: [qrSize, qrSize],
                        align: 'center',
                        valign: 'center'
                    });

                    // Add instruction text below QR code
                    doc.fontSize(7)
                       .fillColor('#666666')
                       .text('Scan to verify', qrX, qrY + qrSize + 5, {
                           width: qrSize,
                           align: 'center'
                       });
                } catch (qrError) {
                    console.error('Error embedding QR code in PDF:', qrError.message);
                    // Continue without QR code if there's an error
                }
            }

            // Add watermark - diagonal text across the page
            const watermarkText = 'This is a computer-generated invoice and requires no signature';

            // Save the current state
            doc.save();

            // Position watermark in center of page, rotated diagonally
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;

            // Move to center and rotate
            doc.translate(pageWidth / 2, pageHeight / 2);
            doc.rotate(-45, { origin: [0, 0] });

            // Draw watermark text
            doc.fontSize(18)
               .fillColor('#e0e0e0', 0.3)  // Light gray with 30% opacity
               .text(watermarkText, -250, 0, {
                   width: 500,
                   align: 'center'
               });

            // Restore the state
            doc.restore();

            // Finalize PDF
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Convert PDF buffer to Base64
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {String} - Base64 encoded PDF
 */
function pdfToBase64(pdfBuffer) {
    return pdfBuffer.toString('base64');
}

module.exports = {
    generateInvoicePDF,
    pdfToBase64
};
