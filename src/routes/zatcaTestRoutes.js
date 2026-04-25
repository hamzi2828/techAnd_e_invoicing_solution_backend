// src/routes/zatcaTestRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const ZATCA_BASE_URL = 'https://bw.fatoortak.sa';

/**
 * ZATCA Test Endpoints - For testing and development only
 * These endpoints call the ZATCA API test methods directly
 */

// Test 1: Generate XML Test
router.get('/test/generate-xml', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/GenerateXMLTest`);

        res.json({
            success: true,
            message: 'XML generation test completed',
            data: response.data,
            testType: 'GenerateXMLTest'
        });
    } catch (error) {
        console.error('GenerateXMLTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'XML generation test failed',
            error: error.response?.data || error.message
        });
    }
});

// Test 2: Sign Invoice Test
router.get('/test/sign-invoice', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/SignInvoiceTest`);

        res.json({
            success: true,
            message: 'Invoice signing test completed',
            data: response.data,
            testType: 'SignInvoiceTest'
        });
    } catch (error) {
        console.error('SignInvoiceTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Invoice signing test failed',
            error: error.response?.data || error.message
        });
    }
});

// Test 3: Validate Invoice Test
router.get('/test/validate-invoice', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/ValidateInvoiceTest`);

        res.json({
            success: true,
            message: 'Invoice validation test completed',
            data: response.data,
            testType: 'ValidateInvoiceTest'
        });
    } catch (error) {
        console.error('ValidateInvoiceTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Invoice validation test failed',
            error: error.response?.data || error.message
        });
    }
});

// Test 4: Submit Documents for Compliance Test
router.get('/test/compliance-submission', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/SubmitDocumentsForComplianceTest`);

        res.json({
            success: true,
            message: 'Compliance submission test completed',
            data: response.data,
            testType: 'SubmitDocumentsForComplianceTest'
        });
    } catch (error) {
        console.error('ComplianceTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Compliance submission test failed',
            error: error.response?.data || error.message
        });
    }
});

// Test 5: Clear Invoice Test
router.get('/test/clear-invoice', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/TestClearInvoice`);

        res.json({
            success: true,
            message: 'Invoice clearance test completed',
            data: response.data,
            testType: 'TestClearInvoice'
        });
    } catch (error) {
        console.error('ClearInvoiceTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Invoice clearance test failed',
            error: error.response?.data || error.message
        });
    }
});

// Test 6: Report Invoice Test
router.get('/test/report-invoice', async (req, res) => {
    try {
        const response = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/TestReportInvoice`);

        res.json({
            success: true,
            message: 'Invoice reporting test completed',
            data: response.data,
            testType: 'TestReportInvoice'
        });
    } catch (error) {
        console.error('ReportInvoiceTest error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Invoice reporting test failed',
            error: error.response?.data || error.message
        });
    }
});

// Run All Tests
router.get('/test/run-all', async (req, res) => {
    const results = {
        generateXML: null,
        signInvoice: null,
        validateInvoice: null,
        complianceSubmission: null,
        clearInvoice: null,
        reportInvoice: null
    };

    // Run all tests sequentially
    try {
        // Test 1: Generate XML
        try {
            const xmlTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/GenerateXMLTest`);
            results.generateXML = { success: true, data: xmlTest.data };
        } catch (error) {
            results.generateXML = { success: false, error: error.message };
        }

        // Test 2: Sign Invoice
        try {
            const signTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/SignInvoiceTest`);
            results.signInvoice = { success: true, data: signTest.data };
        } catch (error) {
            results.signInvoice = { success: false, error: error.message };
        }

        // Test 3: Validate Invoice
        try {
            const validateTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/ValidateInvoiceTest`);
            results.validateInvoice = { success: true, data: validateTest.data };
        } catch (error) {
            results.validateInvoice = { success: false, error: error.message };
        }

        // Test 4: Compliance Submission
        try {
            const complianceTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/SubmitDocumentsForComplianceTest`);
            results.complianceSubmission = { success: true, data: complianceTest.data };
        } catch (error) {
            results.complianceSubmission = { success: false, error: error.message };
        }

        // Test 5: Clear Invoice
        try {
            const clearTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/TestClearInvoice`);
            results.clearInvoice = { success: true, data: clearTest.data };
        } catch (error) {
            results.clearInvoice = { success: false, error: error.message };
        }

        // Test 6: Report Invoice
        try {
            const reportTest = await axios.get(`${ZATCA_BASE_URL}/api/EInvoice/TestReportInvoice`);
            results.reportInvoice = { success: true, data: reportTest.data };
        } catch (error) {
            results.reportInvoice = { success: false, error: error.message };
        }

        // Calculate summary
        const totalTests = Object.keys(results).length;
        const passedTests = Object.values(results).filter(r => r?.success).length;
        const failedTests = totalTests - passedTests;

        res.json({
            success: true,
            message: `Completed ${totalTests} tests: ${passedTests} passed, ${failedTests} failed`,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
            },
            results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error running tests',
            error: error.message,
            results
        });
    }
});

module.exports = router;
