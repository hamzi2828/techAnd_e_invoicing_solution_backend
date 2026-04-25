const bulkImportService = require('../services/bulkImportService');
const { generateBulkImportTemplate } = require('../utils/excelGenerator');

/**
 * Download bulk import template
 * GET /api/invoices/bulk-import/template/:companyId
 */
const downloadTemplate = async (req, res) => {
    try {
        const { companyId } = req.params;
        const userId = req.user.createdBy || req.user._id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        // Get template data
        const templateData = await bulkImportService.getTemplateData(userId, companyId);

        // Generate Excel template (async with exceljs)
        const buffer = await generateBulkImportTemplate(templateData);

        // Set headers for file download
        const filename = `invoice_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);

        // Send buffer
        res.send(buffer);

    } catch (error) {
        console.error('Download template error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate template'
        });
    }
};

/**
 * Process bulk import
 * POST /api/invoices/bulk-import
 */
const processBulkImport = async (req, res) => {
    try {
        const userId = req.user.createdBy || req.user._id;
        const { companyId } = req.body;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.'
            });
        }

        // Process the import
        const results = await bulkImportService.processBulkImport(
            req.file.buffer,
            userId,
            companyId
        );

        // Determine response status
        const status = results.successful > 0 ? 200 : 400;

        res.status(status).json({
            success: results.successful > 0,
            message: results.successful > 0
                ? `Successfully imported ${results.successful} of ${results.totalProcessed} invoices`
                : 'Import failed - no invoices were created',
            data: results
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process bulk import'
        });
    }
};

/**
 * Get import history/status
 * GET /api/invoices/bulk-import/history
 */
const getImportHistory = async (req, res) => {
    try {
        // This could be implemented to track import batches
        // For now, return empty array
        res.json({
            success: true,
            data: {
                imports: []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get import history'
        });
    }
};

/**
 * Validate import file without creating invoices
 * POST /api/invoices/bulk-import/validate
 */
const validateImportFile = async (req, res) => {
    try {
        const userId = req.user.createdBy || req.user._id;
        const { companyId } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Parse the file
        const { parseImportFile } = require('../utils/excelGenerator');
        const { invoices, linesByInvoice, errors } = parseImportFile(req.file.buffer);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'File parsing errors',
                data: { errors }
            });
        }

        // Validate structure
        const validationResults = {
            totalInvoices: invoices.length,
            totalLineItems: Object.values(linesByInvoice).flat().length,
            invoicesWithLines: 0,
            invoicesWithoutLines: 0,
            warnings: []
        };

        invoices.forEach(inv => {
            const invRow = inv.Invoice_Row?.toString() || '';
            const lines = linesByInvoice[invRow] || [];
            if (lines.length > 0) {
                validationResults.invoicesWithLines++;
            } else {
                validationResults.invoicesWithoutLines++;
                validationResults.warnings.push(
                    `Invoice row ${invRow || 'unknown'} has no line items`
                );
            }
        });

        res.json({
            success: true,
            message: 'Validation completed',
            data: validationResults
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Validation failed'
        });
    }
};

module.exports = {
    downloadTemplate,
    processBulkImport,
    getImportHistory,
    validateImportFile
};
