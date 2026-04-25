const ExcelJS = require('exceljs');
const XLSX = require('xlsx');

/**
 * Generate bulk import template with dynamic data using ExcelJS
 * @param {Object} data - Data to populate template
 * @param {Array} data.customers - User's customers
 * @param {Array} data.products - User's products
 * @param {Object} data.company - Selected company
 * @returns {Promise<Buffer>} Excel file buffer
 */
const generateBulkImportTemplate = async (data) => {
    const { customers = [], products = [], company = {} } = data;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-Invoice Pro';
    workbook.created = new Date();

    // ========== README Sheet ==========
    const wsReadme = workbook.addWorksheet('README', {
        properties: { tabColor: { argb: '4472C4' } }
    });

    const readmeData = [
        ['ZATCA Bulk Invoice Import Template'],
        [''],
        ['How to use:'],
        ['1) First, ensure your customers and products are created in the system.'],
        ['2) This template includes your existing customers and products for easy selection.'],
        ['3) Fill the Invoices sheet (one row per invoice). Use Invoice_Row (1, 2, 3...) to identify each invoice.'],
        ['4) Fill the InvoiceLines sheet (one row per line item). Use the same Invoice_Row to link items.'],
        ['5) You can reference Customer_ID or Product_ID from the lookup sheets, or enter new values.'],
        [''],
        ['Important Notes:'],
        ['- Invoice_Row: A simple number (1, 2, 3...) to link invoices with their line items.'],
        ['- Invoice numbers are AUTO-GENERATED based on company settings.'],
        ['- Dates should be in YYYY-MM-DD format (e.g., 2025-01-15).'],
        ['- VAT_Rate is a percentage (e.g., 15 for 15%).'],
        ['- All invoices will be created as DRAFT status.'],
        ['- If Customer_ID is provided, customer details are auto-filled from the system.'],
        ['- If Product_ID is provided, product details are auto-filled from the system.'],
        [''],
        ['Company: ' + (company.companyName || 'N/A')],
        ['VAT Number: ' + (company.taxIdNumber || 'N/A')],
        ['Generated: ' + new Date().toISOString().split('T')[0]]
    ];

    readmeData.forEach((row, index) => {
        const excelRow = wsReadme.addRow(row);
        if (index === 0) {
            excelRow.font = { bold: true, size: 16, color: { argb: '4472C4' } };
        } else if (row[0] && (row[0].startsWith('How to use') || row[0].startsWith('Important Notes'))) {
            excelRow.font = { bold: true, size: 12 };
        }
    });

    wsReadme.getColumn(1).width = 80;

    // ========== Lookups Sheet ==========
    const wsLookups = workbook.addWorksheet('Lookups', {
        properties: { tabColor: { argb: '70AD47' } }
    });

    const lookupsData = [
        ['Lookup_Name', 'Value', 'Description'],
        ['Invoice_Type', 'B2B', 'Business to Business - requires customer VAT'],
        ['Invoice_Type', 'B2C', 'Business to Consumer - for individuals'],
        ['Currency', 'SAR', 'Saudi Riyal'],
        ['Currency', 'USD', 'US Dollar'],
        ['Currency', 'EUR', 'Euro'],
        ['Currency', 'AED', 'UAE Dirham'],
        ['VAT_Category', 'Standard', '15% VAT'],
        ['VAT_Category', 'Zero', '0% VAT'],
        ['VAT_Category', 'Exempt', 'VAT Exempt'],
        ['Payment_Terms', 'Net 15', 'Due in 15 days'],
        ['Payment_Terms', 'Net 30', 'Due in 30 days'],
        ['Payment_Terms', 'Net 45', 'Due in 45 days'],
        ['Payment_Terms', 'Net 60', 'Due in 60 days'],
        ['Payment_Terms', 'Due on Receipt', 'Immediate payment'],
        ['Unit', 'piece', 'Per piece/unit'],
        ['Unit', 'hour', 'Per hour'],
        ['Unit', 'day', 'Per day'],
        ['Unit', 'kg', 'Per kilogram'],
        ['Unit', 'liter', 'Per liter'],
        ['Unit', 'meter', 'Per meter'],
        ['Unit', 'project', 'Per project']
    ];

    lookupsData.forEach((row, index) => {
        const excelRow = wsLookups.addRow(row);
        if (index === 0) {
            excelRow.font = { bold: true };
            excelRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        }
    });

    wsLookups.getColumn(1).width = 15;
    wsLookups.getColumn(2).width = 15;
    wsLookups.getColumn(3).width = 40;

    // Add CustomerList column (E) with "NEW" as first option
    wsLookups.getCell('E1').value = 'CustomerList';
    wsLookups.getCell('E1').font = { bold: true, color: { argb: 'FFFFFF' } };
    wsLookups.getCell('E1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '70AD47' }
    };
    wsLookups.getCell('E2').value = 'NEW';
    wsLookups.getCell('E2').font = { bold: true, color: { argb: '008000' } };

    // Add customer IDs to CustomerList
    customers.forEach((c, index) => {
        wsLookups.getCell(`E${index + 3}`).value = c._id?.toString() || '';
    });
    wsLookups.getColumn(5).width = 28;

    // Add ProductList column (F) with "NEW" as first option
    wsLookups.getCell('F1').value = 'ProductList';
    wsLookups.getCell('F1').font = { bold: true, color: { argb: 'FFFFFF' } };
    wsLookups.getCell('F1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ED7D31' }
    };
    wsLookups.getCell('F2').value = 'NEW';
    wsLookups.getCell('F2').font = { bold: true, color: { argb: '008000' } };

    // Add product IDs to ProductList
    products.forEach((p, index) => {
        wsLookups.getCell(`F${index + 3}`).value = p._id?.toString() || '';
    });
    wsLookups.getColumn(6).width = 28;

    // ========== Customers Sheet ==========
    const wsCustomers = workbook.addWorksheet('Customers', {
        properties: { tabColor: { argb: 'FFC000' } }
    });

    const customersHeader = [
        'Customer_ID',
        'Customer_Name',
        'Customer_Type',
        'VAT_Number',
        'CR_Number',
        'Email',
        'Phone',
        'Street',
        'City',
        'Postal_Code',
        'Country'
    ];

    const headerRow = wsCustomers.addRow(customersHeader);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    customers.forEach(c => {
        wsCustomers.addRow([
            c._id?.toString() || '',
            c.customerName || '',
            c.customerType || 'company',
            c.complianceInfo?.taxId || '',
            c.commercialRegistrationNumber || '',
            c.contactInfo?.email || '',
            c.contactInfo?.phone || '',
            c.address?.street || '',
            c.address?.city || '',
            c.address?.postalCode || '',
            c.address?.country || 'SA'
        ]);
    });

    // Set column widths
    wsCustomers.getColumn(1).width = 26;
    wsCustomers.getColumn(2).width = 30;
    wsCustomers.getColumn(3).width = 12;
    wsCustomers.getColumn(4).width = 18;
    wsCustomers.getColumn(5).width = 15;
    wsCustomers.getColumn(6).width = 25;
    wsCustomers.getColumn(7).width = 15;
    wsCustomers.getColumn(8).width = 30;
    wsCustomers.getColumn(9).width = 15;
    wsCustomers.getColumn(10).width = 10;
    wsCustomers.getColumn(11).width = 8;

    // ========== Products Sheet ==========
    const wsProducts = workbook.addWorksheet('Products', {
        properties: { tabColor: { argb: 'ED7D31' } }
    });

    const productsHeader = [
        'Product_ID',
        'SKU',
        'Product_Name',
        'Description',
        'Unit_Price',
        'Tax_Rate',
        'Unit',
        'Category'
    ];

    const prodHeaderRow = wsProducts.addRow(productsHeader);
    prodHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    prodHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    products.forEach(p => {
        wsProducts.addRow([
            p._id?.toString() || '',
            p.sku || '',
            p.name || '',
            p.description || p.shortDescription || '',
            p.price || 0,
            p.taxRate || 15,
            p.unit || 'piece',
            p.category?.name || ''
        ]);
    });

    // Set column widths
    wsProducts.getColumn(1).width = 26;
    wsProducts.getColumn(2).width = 15;
    wsProducts.getColumn(3).width = 30;
    wsProducts.getColumn(4).width = 40;
    wsProducts.getColumn(5).width = 12;
    wsProducts.getColumn(6).width = 10;
    wsProducts.getColumn(7).width = 10;
    wsProducts.getColumn(8).width = 15;

    // ========== Invoices Sheet ==========
    const wsInvoices = workbook.addWorksheet('Invoices', {
        properties: { tabColor: { argb: '5B9BD5' } }
    });

    const invoicesHeader = [
        'Invoice_Row',
        'Invoice_Type',
        'Invoice_Date',
        'Due_Date',
        'Currency',
        'Customer_ID',
        'Customer_Name',
        'Customer_VAT',
        'Customer_Street',
        'Customer_City',
        'Customer_Postal_Code',
        'Customer_Country',
        'Payment_Terms',
        'Notes',
        'Terms_And_Conditions',
        'Discount',
        'Discount_Type'
    ];

    const invHeaderRow = wsInvoices.addRow(invoicesHeader);
    invHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    invHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    // Add sample row
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    wsInvoices.addRow([
        '1',                        // Invoice_Row
        'B2B',                      // Invoice_Type
        today,                      // Invoice_Date
        dueDate,                    // Due_Date
        'SAR',                      // Currency
        customers[0]?._id?.toString() || '', // Customer_ID
        '',                         // Customer_Name
        '',                         // Customer_VAT
        '',                         // Customer_Street
        '',                         // Customer_City
        '',                         // Customer_Postal_Code
        'SA',                       // Customer_Country
        'Net 30',                   // Payment_Terms
        '',                         // Notes
        '',                         // Terms_And_Conditions
        '0',                        // Discount
        'percentage'                // Discount_Type
    ]);

    // Add empty rows
    for (let i = 0; i < 50; i++) {
        wsInvoices.addRow(Array(17).fill(''));
    }

    // Set column widths
    wsInvoices.getColumn(1).width = 12;
    wsInvoices.getColumn(2).width = 14;
    wsInvoices.getColumn(3).width = 12;
    wsInvoices.getColumn(4).width = 12;
    wsInvoices.getColumn(5).width = 10;
    wsInvoices.getColumn(6).width = 26;
    wsInvoices.getColumn(7).width = 25;
    wsInvoices.getColumn(8).width = 18;
    wsInvoices.getColumn(9).width = 25;
    wsInvoices.getColumn(10).width = 15;
    wsInvoices.getColumn(11).width = 18;
    wsInvoices.getColumn(12).width = 15;
    wsInvoices.getColumn(13).width = 15;
    wsInvoices.getColumn(14).width = 30;
    wsInvoices.getColumn(15).width = 30;
    wsInvoices.getColumn(16).width = 10;
    wsInvoices.getColumn(17).width = 14;

    // Add data validation (dropdowns) for Invoice_Type column (B2:B52)
    for (let row = 2; row <= 52; row++) {
        wsInvoices.getCell(`B${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"B2B,B2C"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Invoice Type',
            error: 'Please select B2B or B2C'
        };
    }

    // Add data validation for Currency column (E2:E52)
    for (let row = 2; row <= 52; row++) {
        wsInvoices.getCell(`E${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"SAR,USD,EUR,AED"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Currency',
            error: 'Please select a valid currency'
        };
    }

    // Add data validation for Discount_Type column (Q2:Q52)
    for (let row = 2; row <= 52; row++) {
        wsInvoices.getCell(`Q${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"percentage,fixed"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Discount Type',
            error: 'Please select percentage or fixed'
        };
    }

    // Add data validation for Customer_ID column (F2:F52) - reference Lookups CustomerList
    const customerListEndRow = customers.length + 2; // +2 for header and "NEW" row
    for (let row = 2; row <= 52; row++) {
        wsInvoices.getCell(`F${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Lookups!$E$2:$E$${customerListEndRow}`],
            showErrorMessage: false // Allow manual entry for new customers
        };
    }

    // ========== InvoiceLines Sheet ==========
    const wsLines = workbook.addWorksheet('InvoiceLines', {
        properties: { tabColor: { argb: '70AD47' } }
    });

    const linesHeader = [
        'Invoice_Row',
        'Line_ID',
        'Product_ID',
        'Product_SKU',
        'Item_Description',
        'Quantity',
        'Unit_Price',
        'Discount_Amount',
        'Tax_Rate',
        'Notes'
    ];

    const linesHeaderRow = wsLines.addRow(linesHeader);
    linesHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    linesHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    // Add sample rows
    wsLines.addRow([
        '1',                     // Invoice_Row
        '1',                     // Line_ID
        products[0]?._id?.toString() || '', // Product_ID
        '',                      // Product_SKU
        '',                      // Item_Description
        '1',                     // Quantity
        '',                      // Unit_Price
        '0',                     // Discount_Amount
        '15',                    // Tax_Rate
        ''                       // Notes
    ]);

    wsLines.addRow([
        '1',                     // Invoice_Row (same invoice)
        '2',                     // Line_ID
        '',                      // Product_ID
        '',                      // Product_SKU
        'Custom service item',   // Item_Description
        '1',                     // Quantity
        '500',                   // Unit_Price
        '0',                     // Discount_Amount
        '15',                    // Tax_Rate
        ''                       // Notes
    ]);

    // Add empty rows
    for (let i = 0; i < 200; i++) {
        wsLines.addRow(Array(10).fill(''));
    }

    // Set column widths
    wsLines.getColumn(1).width = 12;
    wsLines.getColumn(2).width = 8;
    wsLines.getColumn(3).width = 26;
    wsLines.getColumn(4).width = 15;
    wsLines.getColumn(5).width = 40;
    wsLines.getColumn(6).width = 10;
    wsLines.getColumn(7).width = 12;
    wsLines.getColumn(8).width = 15;
    wsLines.getColumn(9).width = 10;
    wsLines.getColumn(10).width = 25;

    // Add data validation for Product_ID column (C2:C203) - reference Lookups ProductList
    const productListEndRow = products.length + 2; // +2 for header and "NEW" row
    for (let row = 2; row <= 203; row++) {
        wsLines.getCell(`C${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Lookups!$F$2:$F$${productListEndRow}`],
            showErrorMessage: false // Allow manual entry for custom items
        };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

/**
 * Parse uploaded Excel file for bulk import
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Object} Parsed data { invoices, invoiceLines, errors }
 */
const parseImportFile = (buffer) => {
    try {
        const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

        // Check required sheets exist
        if (!wb.SheetNames.includes('Invoices')) {
            throw new Error('Missing required sheet: Invoices');
        }
        if (!wb.SheetNames.includes('InvoiceLines')) {
            throw new Error('Missing required sheet: InvoiceLines');
        }

        // Parse Invoices sheet
        const invoicesSheet = wb.Sheets['Invoices'];
        const invoicesRaw = XLSX.utils.sheet_to_json(invoicesSheet, {
            defval: '',
            raw: false
        });

        // Filter out empty rows - use Invoice_Row to identify invoices
        const invoices = invoicesRaw.filter(row => {
            return row.Invoice_Row || row.Customer_ID || row.Customer_Name;
        });

        // Parse InvoiceLines sheet
        const linesSheet = wb.Sheets['InvoiceLines'];
        const linesRaw = XLSX.utils.sheet_to_json(linesSheet, {
            defval: '',
            raw: false
        });

        // Filter out empty rows - use Invoice_Row to link lines
        const invoiceLines = linesRaw.filter(row => {
            return row.Invoice_Row && (row.Item_Description || row.Product_ID);
        });

        // Group lines by Invoice_Row
        const linesByInvoice = {};
        invoiceLines.forEach(line => {
            const invRow = line.Invoice_Row?.toString() || '';
            if (!linesByInvoice[invRow]) {
                linesByInvoice[invRow] = [];
            }
            linesByInvoice[invRow].push(line);
        });

        return {
            invoices,
            invoiceLines,
            linesByInvoice,
            errors: []
        };
    } catch (error) {
        return {
            invoices: [],
            invoiceLines: [],
            linesByInvoice: {},
            errors: [error.message]
        };
    }
};

/**
 * Parse date from Excel format
 * @param {any} value - Date value from Excel
 * @returns {Date|null}
 */
const parseExcelDate = (value) => {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
        return value;
    }

    // If it's a string in YYYY-MM-DD format
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    // If it's an Excel serial date number
    if (typeof value === 'number') {
        // Excel serial date to JS date
        const date = new Date((value - 25569) * 86400 * 1000);
        return date;
    }

    return null;
};

module.exports = {
    generateBulkImportTemplate,
    parseImportFile,
    parseExcelDate
};
