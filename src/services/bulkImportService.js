const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Company = require('../models/Company');
const { parseImportFile, parseExcelDate } = require('../utils/excelGenerator');

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Find or create customer based on import data
 */
const findOrCreateCustomer = async (rowData, userId, companyId) => {
    const warnings = [];
    const customerId = rowData.Customer_ID?.toString()?.trim()?.toUpperCase();

    // If Customer_ID is "NEW", skip lookup and create new customer
    const isNewCustomer = customerId === 'NEW' || !customerId;

    // Priority 1: Match by Customer_ID (if not "NEW")
    if (!isNewCustomer && isValidObjectId(rowData.Customer_ID)) {
        const customer = await Customer.findOne({
            _id: rowData.Customer_ID,
            userId: userId,
            isDeleted: { $ne: true }
        });
        if (customer) {
            return { customer, isNew: false, warnings };
        }
    }

    // Priority 2: Match by VAT number (if not explicitly NEW)
    if (!isNewCustomer && rowData.Customer_VAT && rowData.Customer_VAT.trim()) {
        const customer = await Customer.findOne({
            userId: userId,
            'complianceInfo.taxId': rowData.Customer_VAT.trim(),
            isDeleted: { $ne: true }
        });
        if (customer) {
            return { customer, isNew: false, warnings };
        }
    }

    // Priority 3: Match by exact name (if not explicitly NEW)
    if (!isNewCustomer && rowData.Customer_Name && rowData.Customer_Name.trim()) {
        const customer = await Customer.findOne({
            userId: userId,
            customerName: rowData.Customer_Name.trim(),
            isDeleted: { $ne: true }
        });
        if (customer) {
            return { customer, isNew: false, warnings };
        }
    }

    // Customer not found or NEW selected - create new one
    if (!rowData.Customer_Name || !rowData.Customer_Name.trim()) {
        throw new Error('Customer not found and no Customer_Name provided to create new customer');
    }

    const invoiceType = rowData.Invoice_Type || 'standard';
    const customerType = invoiceType === 'simplified' ? 'individual' : 'company';

    const newCustomer = await Customer.create({
        userId: userId,
        companyId: companyId,
        customerName: rowData.Customer_Name.trim(),
        customerType: customerType,
        commercialRegistrationNumber: rowData.Customer_CR || '',
        contactInfo: {
            email: rowData.Customer_Email || '',
            phone: rowData.Customer_Phone || ''
        },
        address: {
            street: rowData.Customer_Street || '',
            city: rowData.Customer_City || '',
            postalCode: rowData.Customer_Postal_Code || '',
            country: rowData.Customer_Country || 'SA'
        },
        complianceInfo: {
            taxId: rowData.Customer_VAT || ''
        },
        status: 'active',
        verificationStatus: 'pending',
        isActive: true,
        createdBy: userId
    });

    warnings.push(`New customer created: ${newCustomer.customerName}`);
    return { customer: newCustomer, isNew: true, warnings };
};

/**
 * Find product by ID or SKU
 */
const findProduct = async (lineData, userId) => {
    const productId = lineData.Product_ID?.toString()?.trim()?.toUpperCase();

    // If Product_ID is "NEW" or empty, skip lookup and use manual entry
    if (productId === 'NEW' || !productId) {
        return null;
    }

    // Priority 1: Match by Product_ID
    if (isValidObjectId(lineData.Product_ID)) {
        const product = await Product.findOne({
            _id: lineData.Product_ID,
            userId: userId,
            status: { $ne: 'inactive' }
        });
        if (product) return product;
    }

    // Priority 2: Match by SKU
    if (lineData.Product_SKU && lineData.Product_SKU.trim()) {
        const product = await Product.findOne({
            userId: userId,
            sku: lineData.Product_SKU.trim().toUpperCase(),
            status: { $ne: 'inactive' }
        });
        if (product) return product;
    }

    // No product found - will use manual entry
    return null;
};

/**
 * Process line items for an invoice
 */
const processLineItems = async (lines, userId) => {
    const items = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        try {
            // Find product if ID or SKU provided
            const product = await findProduct(line, userId);

            // Get description - from product or manual entry
            let description = line.Item_Description?.trim();
            if (!description && product) {
                description = product.name || product.description;
            }
            if (!description) {
                errors.push(`Line ${lineNum}: Missing item description`);
                continue;
            }

            // Get quantity
            const quantity = parseFloat(line.Quantity) || 0;
            if (quantity <= 0) {
                errors.push(`Line ${lineNum}: Invalid quantity`);
                continue;
            }

            // Get unit price - from product or manual entry
            let unitPrice = parseFloat(line.Unit_Price);
            if (isNaN(unitPrice) && product) {
                unitPrice = product.price || 0;
            }
            if (isNaN(unitPrice) || unitPrice < 0) {
                errors.push(`Line ${lineNum}: Invalid unit price`);
                continue;
            }

            // Get tax rate - from product or manual entry, default 15%
            let taxRate = parseFloat(line.Tax_Rate);
            if (isNaN(taxRate) && product) {
                taxRate = product.taxRate || 15;
            }
            if (isNaN(taxRate)) {
                taxRate = 15;
            }

            // Get discount
            const discount = parseFloat(line.Discount_Amount) || 0;

            // Calculate total price
            const totalPrice = quantity * unitPrice;

            items.push({
                product: product?._id || undefined,
                description: description,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
                taxRate: taxRate,
                discount: discount
            });

        } catch (error) {
            errors.push(`Line ${lineNum}: ${error.message}`);
        }
    }

    return { items, errors };
};

/**
 * Convert B2B/B2C to standard/simplified
 */
const convertInvoiceType = (type) => {
    const typeUpper = (type || '').toUpperCase().trim();
    if (typeUpper === 'B2B') return 'standard';
    if (typeUpper === 'B2C') return 'simplified';
    // Also accept standard/simplified directly
    const typeLower = (type || '').toLowerCase().trim();
    if (typeLower === 'standard') return 'standard';
    if (typeLower === 'simplified') return 'simplified';
    return 'standard'; // Default to standard
};

/**
 * Validate invoice data
 */
const validateInvoiceData = (invoiceRow, lineItems) => {
    const errors = [];

    // Check invoice type (accept B2B, B2C, standard, simplified)
    const validTypes = ['b2b', 'b2c', 'standard', 'simplified'];
    const invoiceType = (invoiceRow.Invoice_Type || 'B2B').toLowerCase().trim();
    if (!validTypes.includes(invoiceType)) {
        errors.push(`Invalid Invoice_Type: ${invoiceRow.Invoice_Type}. Use B2B or B2C.`);
    }

    // Check dates
    const invoiceDate = parseExcelDate(invoiceRow.Invoice_Date);
    const dueDate = parseExcelDate(invoiceRow.Due_Date);

    if (!invoiceDate) {
        errors.push('Invalid or missing Invoice_Date');
    }
    if (!dueDate) {
        errors.push('Invalid or missing Due_Date');
    }
    if (invoiceDate && dueDate && dueDate < invoiceDate) {
        errors.push('Due_Date cannot be before Invoice_Date');
    }

    // Check line items
    if (!lineItems || lineItems.length === 0) {
        errors.push('No line items found for this invoice');
    }

    // Check currency
    const validCurrencies = ['SAR', 'USD', 'EUR', 'AED'];
    const currency = (invoiceRow.Currency || 'SAR').toUpperCase();
    if (!validCurrencies.includes(currency)) {
        errors.push(`Invalid Currency: ${invoiceRow.Currency}`);
    }

    return errors;
};

/**
 * Process bulk import
 */
const processBulkImport = async (fileBuffer, userId, companyId) => {
    const results = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        invoices: [],
        errors: [],
        warnings: []
    };

    try {
        // Parse the uploaded file
        const { invoices: invoiceRows, linesByInvoice, errors: parseErrors } = parseImportFile(fileBuffer);

        if (parseErrors.length > 0) {
            results.errors = parseErrors;
            return results;
        }

        if (invoiceRows.length === 0) {
            results.errors.push('No invoices found in the uploaded file');
            return results;
        }

        // Get company and verify
        const company = await Company.findOne({
            _id: companyId,
            $or: [
                { userId: userId },
                { createdBy: userId }
            ]
        });

        if (!company) {
            results.errors.push('Company not found or access denied');
            return results;
        }

        // Process each invoice
        for (let i = 0; i < invoiceRows.length; i++) {
            const invoiceRow = invoiceRows[i];
            const rowNum = i + 2; // Excel row number (1-indexed + header)
            results.totalProcessed++;

            const invoiceErrors = [];
            const invoiceWarnings = [];

            try {
                // Always auto-generate invoice number based on company settings
                const invoiceNumber = await Invoice.generateInvoiceNumber(companyId);

                // Find or create customer
                const { customer, isNew: isNewCustomer, warnings: customerWarnings } =
                    await findOrCreateCustomer(invoiceRow, userId, companyId);
                invoiceWarnings.push(...customerWarnings);

                // Get line items using Invoice_Row
                const invoiceRowId = invoiceRow.Invoice_Row?.toString() || '';
                const invoiceLines = linesByInvoice[invoiceRowId] || [];

                // If no lines found by Invoice_Row, check if this is the first invoice
                // and there are lines without Invoice_Row
                let linesToProcess = invoiceLines;
                if (linesToProcess.length === 0 && i === 0) {
                    // Check for lines with empty Invoice_Row
                    const emptyLines = linesByInvoice[''] || [];
                    if (emptyLines.length > 0) {
                        linesToProcess = emptyLines;
                    }
                }

                // Process line items
                const { items, errors: lineErrors } = await processLineItems(linesToProcess, userId);
                if (lineErrors.length > 0) {
                    invoiceErrors.push(...lineErrors);
                }

                // Validate invoice data
                const validationErrors = validateInvoiceData(invoiceRow, items);
                if (validationErrors.length > 0) {
                    invoiceErrors.push(...validationErrors);
                }

                // If there are errors, skip this invoice
                if (invoiceErrors.length > 0) {
                    results.failed++;
                    results.errors.push({
                        row: rowNum,
                        invoiceNumber: invoiceNumber,
                        errors: invoiceErrors
                    });
                    continue;
                }

                // Parse dates
                const invoiceDate = parseExcelDate(invoiceRow.Invoice_Date) || new Date();
                const dueDate = parseExcelDate(invoiceRow.Due_Date) ||
                               new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                // Parse discount
                const discount = parseFloat(invoiceRow.Discount) || 0;
                const discountType = invoiceRow.Discount_Type?.toLowerCase() === 'fixed' ? 'fixed' : 'percentage';

                // Calculate totals (required before validation)
                let subtotal = 0;
                let totalTax = 0;

                items.forEach(item => {
                    const itemTotal = item.quantity * item.unitPrice;
                    const itemDiscount = item.discount || 0;
                    const taxableAmount = itemTotal - itemDiscount;
                    const taxAmount = (taxableAmount * (item.taxRate || 0)) / 100;
                    totalTax += taxAmount;
                    subtotal += itemTotal - itemDiscount;
                });

                // Calculate discount amount
                let discountAmount = 0;
                if (discount > 0) {
                    if (discountType === 'percentage') {
                        discountAmount = (subtotal * discount) / 100;
                    } else {
                        discountAmount = discount;
                    }
                }

                const total = subtotal + totalTax - discountAmount;

                // Create invoice
                const invoice = new Invoice({
                    userId: userId,
                    companyId: companyId,
                    customerId: customer._id,
                    invoiceNumber: invoiceNumber,
                    invoiceType: convertInvoiceType(invoiceRow.Invoice_Type),
                    invoiceDate: invoiceDate,
                    dueDate: dueDate,
                    currency: (invoiceRow.Currency || 'SAR').toUpperCase(),
                    paymentTerms: invoiceRow.Payment_Terms || 'Net 30',
                    customerInfo: {
                        customerId: customer._id
                    },
                    items: items,
                    subtotal: subtotal,
                    totalTax: totalTax,
                    total: total,
                    discount: discount,
                    discountType: discountType,
                    notes: invoiceRow.Notes || '',
                    termsAndConditions: invoiceRow.Terms_And_Conditions || '',
                    status: 'draft',
                    paymentStatus: 'unpaid',
                    isVatApplicable: true,
                    createdBy: userId,
                    zatca: {
                        status: 'pending',
                        validationStatus: 'pending'
                    }
                });

                // Pre-save hook will calculate totals
                await invoice.save();

                // Populate for response
                await invoice.populate('customerId', 'customerName contactInfo');
                await invoice.populate('companyId', 'companyName');

                results.successful++;
                results.invoices.push({
                    invoiceNumber: invoice.invoiceNumber,
                    status: 'created',
                    id: invoice._id,
                    customerId: customer._id,
                    customerName: customer.customerName,
                    total: invoice.total,
                    itemCount: items.length
                });

                // Add warnings
                if (invoiceWarnings.length > 0) {
                    results.warnings.push({
                        row: rowNum,
                        invoiceNumber: invoiceNumber,
                        warnings: invoiceWarnings
                    });
                }

            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: rowNum,
                    invoiceNumber: invoiceRow.Invoice_Number || 'N/A',
                    errors: [error.message]
                });
            }
        }

        return results;

    } catch (error) {
        results.errors.push(`Import failed: ${error.message}`);
        return results;
    }
};

/**
 * Get data for template generation
 */
const getTemplateData = async (userId, companyId) => {
    // Get company
    const company = await Company.findOne({
        _id: companyId,
        $or: [
            { userId: userId },
            { createdBy: userId }
        ]
    }).lean();

    if (!company) {
        throw new Error('Company not found');
    }

    // Get customers
    const customers = await Customer.find({
        userId: userId,
        isDeleted: { $ne: true },
        isActive: true
    })
    .select('customerName customerType commercialRegistrationNumber contactInfo address complianceInfo')
    .sort({ customerName: 1 })
    .lean();

    // Get products
    const products = await Product.find({
        userId: userId,
        status: 'active'
    })
    .populate('category', 'name')
    .select('name description shortDescription sku price taxRate unit category')
    .sort({ name: 1 })
    .lean();

    return {
        company,
        customers,
        products
    };
};

module.exports = {
    processBulkImport,
    getTemplateData,
    findOrCreateCustomer,
    findProduct,
    processLineItems,
    validateInvoiceData
};
