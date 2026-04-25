// src/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const zatcaController = require('../controllers/zatcaController');
const { protect } = require('../../middleware/auth');
const { attachPlan, checkLimit } = require('../../middleware/planMiddleware');

// Middleware to protect all company routes
router.use(protect);

// Attach plan info to all company routes
router.use(attachPlan);

// Specific routes first (no parameters)
router.get('/me', companyController.getUserCompany);
router.get('/created-by-me', companyController.getCompaniesCreatedByMe);
router.get('/default', companyController.getDefaultCompany);
router.get('/check-name', companyController.checkNameAvailability);
router.get('/statistics', companyController.getCompanyStatistics);
router.get('/export', companyController.exportCompanies);
router.post('/validate-registration', companyController.validateRegistrationDetails);
router.post('/validate-step', companyController.validateStep);
router.post('/batch-update', companyController.batchUpdateCompanies);

// Routes with specific paths
router.get('/user/:userId', companyController.getCompaniesByUser);

// General company list route
router.get('/', companyController.getAllCompanies);
router.post('/', checkLimit('company'), companyController.createCompany);

// ZATCA E-Invoicing Onboarding Routes (before :id routes to avoid conflicts)
router.post('/:id/zatca/generate-csr', zatcaController.generateCSR);
router.post('/:id/zatca/compliance-cert', zatcaController.getComplianceCertificate);
router.post('/:id/zatca/submit-test-invoices', zatcaController.submitTestInvoices);
router.post('/:id/zatca/production-csid', zatcaController.getProductionCSID);
router.get('/:id/zatca/status', zatcaController.getZatcaStatus);
// New multi-environment routes
router.post('/:id/zatca/skip-environment', zatcaController.skipEnvironment);
router.post('/:id/zatca/set-active-environment', zatcaController.setActiveEnvironment);
router.get('/:id/zatca/history', zatcaController.getZatcaHistory);
router.post('/:id/zatca/reset-onboarding', zatcaController.resetZatcaOnboarding);

// New onboarding management routes
router.post('/:id/zatca/set-phase', zatcaController.setOnboardingPhase);
router.post('/:id/zatca/set-business-type', zatcaController.setBusinessType);
router.post('/:id/zatca/submit-onboarding-details', zatcaController.submitOnboardingDetails);
router.get('/:id/zatca/onboarding-details', zatcaController.getOnboardingDetails);
router.post('/:id/zatca/generate-tlu', zatcaController.generateTLU);
router.get('/:id/zatca/tlu-status', zatcaController.getTLUStatus);
router.post('/:id/zatca/attach-tlu', zatcaController.attachTLUToAPI);
router.post('/:id/zatca/send-otp', zatcaController.sendOTP);
router.post('/:id/zatca/verify-otp', zatcaController.verifyOTP);
router.post('/:id/zatca/resend-otp', zatcaController.resendOTP);
router.get('/:id/zatca/configuration', zatcaController.getConfiguration);
router.post('/:id/zatca/configuration/keys', zatcaController.createConfigurationKey);
router.put('/:id/zatca/configuration/keys/:keyId/activate', zatcaController.activateConfigurationKey);
router.delete('/:id/zatca/configuration/keys/:keyId', zatcaController.deleteConfigurationKey);
router.get('/:id/zatca/verification-status', zatcaController.getVerificationStatus);
router.post('/:id/zatca/verify-api', zatcaController.verifyAPIConnection);

// Routes with :id parameter (should be last)
router.get('/:id', companyController.getCompanyById);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);
router.put('/:id/status', companyController.updateCompanyStatus);
router.put('/:id/set-default', companyController.setDefaultCompany);

// Document management routes (nested under :id)
router.post('/:id/documents', companyController.uploadDocument);
router.delete('/:id/documents/:documentId', companyController.removeDocument);

module.exports = router;