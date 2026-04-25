// src/controllers/zatcaController.js
const Company = require('../models/Company');
const zatcaService = require('../services/zatcaService');
const { encrypt, decrypt } = require('../utils/encryption');

// Environment order for validation (Phase 2 primarily uses simulation and production)
const ENVIRONMENT_ORDER = ['sandbox', 'simulation', 'production'];
// Default environment for new Phase 2 onboarding
const DEFAULT_PHASE2_ENVIRONMENT = 'simulation';

// ============== Console Logging Helpers ==============

/**
 * Structured console logging for ZATCA onboarding steps
 */
const zatcaLog = {
    header: (step, title) => {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log(`║  ZATCA ONBOARDING - STEP ${step}: ${title.padEnd(40)}║`);
        console.log('╚════════════════════════════════════════════════════════════════╝');
    },
    subHeader: (title) => {
        console.log(`\n┌─── ${title} ${'─'.repeat(50 - title.length)}┐`);
    },
    step: (stepNum, description) => {
        console.log(`│  [${stepNum}] ${description}`);
    },
    info: (label, value) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        console.log(`│      • ${label}: ${valueStr}`);
    },
    success: (message) => {
        console.log(`│  ✅ SUCCESS: ${message}`);
    },
    error: (message) => {
        console.log(`│  ❌ ERROR: ${message}`);
    },
    warning: (message) => {
        console.log(`│  ⚠️  WARNING: ${message}`);
    },
    end: () => {
        console.log('└' + '─'.repeat(65) + '┘\n');
    },
    divider: () => {
        console.log('│' + '─'.repeat(63) + '│');
    }
};

// ============== Helper Functions ==============

/**
 * Get environment credentials for a specific business type
 * @param {Object} company - Company document
 * @param {string} environment - Environment name (sandbox, simulation, production)
 * @param {string} businessType - Business type (B2B or B2C). Required.
 */
function getEnvironmentCredentials(company, environment, businessType) {
    const envData = company.zatcaCredentials?.environments?.[environment];

    if (!envData) {
        return null;
    }

    // Return the specific B2B/B2C credentials
    const typeKey = businessType?.toLowerCase() || 'b2b'; // default to b2b if not specified
    return envData[typeKey] || null;
}

/**
 * Get invoice type code based on business type
 * B2B (Standard Invoice) → '0100000'
 * B2C (Simplified Invoice) → '0200000'
 */
function getInvoiceTypeCode(businessType) {
    return businessType === 'B2C' ? '0200000' : '0100000';
}

/**
 * Get invoice type for CSR based on business type
 * B2B → '1000' (Standard)
 * B2C → '0100' (Simplified)
 */
function getCSRInvoiceType(businessType) {
    return businessType === 'B2C' ? '0100' : '1000';
}

/**
 * Validate environment transition (enforce unidirectional flow)
 * @param {Object} company - Company document
 * @param {string} targetEnv - Target environment
 * @param {string} businessType - Business type (B2B or B2C) to check locks for
 */
function validateEnvironmentTransition(company, targetEnv, businessType = null) {
    const progression = company.zatcaCredentials?.progression || {};
    const environments = company.zatcaCredentials?.environments || {};

    // Check if the specific business type production is locked
    if (businessType) {
        const businessTypeKey = businessType.toLowerCase();
        const productionLockedKey = `${businessTypeKey}ProductionLocked`;
        if (progression[productionLockedKey]) {
            return {
                valid: false,
                message: `Production is locked for ${businessType}. No further environment modifications allowed for this business type.`
            };
        }
    }

    const targetIndex = ENVIRONMENT_ORDER.indexOf(targetEnv);

    // Check if any higher environment has been started for this business type
    for (let i = targetIndex + 1; i < ENVIRONMENT_ORDER.length; i++) {
        const higherEnv = ENVIRONMENT_ORDER[i];
        const businessTypeKey = businessType?.toLowerCase();
        const higherStatus = businessTypeKey
            ? environments[higherEnv]?.[businessTypeKey]?.status
            : null;
        if (higherStatus && higherStatus !== 'not_started') {
            return {
                valid: false,
                message: `Cannot modify ${targetEnv} environment because ${higherEnv} environment has already been started for ${businessType}.`
            };
        }
    }

    return { valid: true };
}

/**
 * Calculate which environments can be skipped to
 * Takes into account per-business-type progression
 */
function calculateCanSkipTo(company) {
    const progression = company.zatcaCredentials?.progression || {};
    const environments = company.zatcaCredentials?.environments || {};
    const canSkipTo = [];

    // If both B2B and B2C production are locked, nothing can be skipped
    if (progression.b2bProductionLocked && progression.b2cProductionLocked) {
        return canSkipTo;
    }

    // Find the current highest started environment across both business types
    let highestStartedIndex = -1;
    for (let i = 0; i < ENVIRONMENT_ORDER.length; i++) {
        const env = ENVIRONMENT_ORDER[i];
        const b2bStatus = environments[env]?.b2b?.status;
        const b2cStatus = environments[env]?.b2c?.status;
        if ((b2bStatus && b2bStatus !== 'not_started') ||
            (b2cStatus && b2cStatus !== 'not_started')) {
            highestStartedIndex = i;
        }
    }

    // Can skip to any environment higher than current highest started
    for (let i = highestStartedIndex + 1; i < ENVIRONMENT_ORDER.length; i++) {
        canSkipTo.push(ENVIRONMENT_ORDER[i]);
    }

    return canSkipTo;
}

/**
 * Add history entry to company
 * @param {Object} company - Company document
 * @param {string} environment - Environment name
 * @param {string} action - Action performed
 * @param {string} userId - User who performed the action
 * @param {Object} metadata - Additional metadata
 * @param {string} businessType - Optional business type (B2B or B2C)
 */
function addHistoryEntry(company, environment, action, userId, metadata = {}, businessType = null) {
    if (!company.zatcaCredentials.history) {
        company.zatcaCredentials.history = [];
    }
    company.zatcaCredentials.history.push({
        environment,
        action,
        businessType,
        timestamp: new Date(),
        metadata: { ...metadata, businessType },
        performedBy: userId
    });
}

/**
 * Determine current environment from new structure
 */
function determineCurrentEnvironment(company) {
    // Check activeEnvironment first
    if (company.zatcaCredentials?.activeEnvironment) {
        return company.zatcaCredentials.activeEnvironment;
    }

    // Check which environment has progress (check both B2B and B2C)
    const environments = company.zatcaCredentials?.environments || {};
    for (let i = ENVIRONMENT_ORDER.length - 1; i >= 0; i--) {
        const env = ENVIRONMENT_ORDER[i];
        const b2bStatus = environments[env]?.b2b?.status;
        const b2cStatus = environments[env]?.b2c?.status;
        if ((b2bStatus && b2bStatus !== 'not_started') ||
            (b2cStatus && b2cStatus !== 'not_started')) {
            return env;
        }
    }

    // Use simulation as default for Phase 2
    return DEFAULT_PHASE2_ENVIRONMENT;
}

// ============== Controller Methods ==============

/**
 * Generate CSR and Private Key
 * POST /api/companies/:id/zatca/generate-csr
 *
 * Now accepts businessType parameter for separate B2B/B2C onboarding.
 * Stores credentials in environments[env].b2b or environments[env].b2c
 */
async function generateCSR(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { request, environment, environmentType, pemFormat, businessType } = req.body;

        // Support both 'environment' (new) and 'environmentType' (legacy)
        const targetEnv = environment ||
            (environmentType === 3 ? 'production' : environmentType === 2 ? 'simulation' : environmentType === 1 ? 'sandbox' : DEFAULT_PHASE2_ENVIRONMENT);

        // Determine business type - B2B or B2C (defaults to B2B for backward compatibility)
        const targetBusinessType = businessType || 'B2B';
        const businessTypeKey = targetBusinessType.toLowerCase(); // 'b2b' or 'b2c'

        // ═══════════════════════════════════════════════════════════════
        zatcaLog.header('1', 'GENERATE CSR');
        // ═══════════════════════════════════════════════════════════════

        zatcaLog.subHeader('Request Details');
        zatcaLog.info('Company ID', id);
        zatcaLog.info('Environment', targetEnv);
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.info('Organization', request?.organizationName || request?.OrganizationName);
        zatcaLog.info('VAT Number', request?.organizationIdentifier || request?.OrganizationIdentifier);

        // Normalize request keys - support both camelCase and PascalCase
        const normalizedRequest = request ? {
            CommonName: request.CommonName || request.commonName,
            OrganizationIdentifier: request.OrganizationIdentifier || request.organizationIdentifier,
            SerialNumber: request.SerialNumber || request.serialNumber,
            OrganizationUnitName: request.OrganizationUnitName || request.organizationUnitName,
            OrganizationName: request.OrganizationName || request.organizationName,
            CountryName: request.CountryName || request.countryName,
            InvoiceType: request.InvoiceType || request.invoiceType,
            LocationAddress: request.LocationAddress || request.locationAddress,
            IndustryBusinessCategory: request.IndustryBusinessCategory || request.industryBusinessCategory
        } : null;

        zatcaLog.divider();
        zatcaLog.step('1.1', 'Validating request parameters...');

        // Validate request
        if (!normalizedRequest || !normalizedRequest.CommonName || !normalizedRequest.OrganizationIdentifier) {
            zatcaLog.error('Validation failed - Missing required fields');
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: 'CommonName and OrganizationIdentifier are required'
            });
        }
        zatcaLog.info('Validation', 'PASSED');

        // Get company and verify ownership
        zatcaLog.step('1.2', 'Verifying company ownership...');
        const company = await Company.findById(id);
        if (!company) {
            zatcaLog.error('Company not found');
            zatcaLog.end();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            zatcaLog.error('Permission denied');
            zatcaLog.end();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }
        zatcaLog.info('Company', company.companyName);

        // Validate environment transition
        const validation = validateEnvironmentTransition(company, targetEnv);
        if (!validation.valid) {
            zatcaLog.error(validation.message);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Call ZATCA API to generate CSR
        zatcaLog.divider();
        zatcaLog.step('1.3', 'Calling ZATCA API to generate CSR...');
        const envTypeInt = targetEnv === 'production' ? 3 : targetEnv === 'simulation' ? 2 : 1;
        const csrData = {
            request: normalizedRequest,
            environmentType: envTypeInt,
            pemFormat: pemFormat !== false
        };

        const result = await zatcaService.generateCSR(csrData);
        zatcaLog.info('CSR Generated', result.csr ? `${result.csr.length} bytes` : 'FAILED');
        zatcaLog.info('Private Key', result.privateKey ? 'Generated (encrypted)' : 'FAILED');

        // Encrypt private key before storing
        zatcaLog.step('1.4', 'Encrypting and storing credentials...');
        const encryptedPrivateKey = encrypt(result.privateKey);

        // Initialize structures if needed
        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }
        if (!company.zatcaCredentials.environments) {
            company.zatcaCredentials.environments = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv]) {
            company.zatcaCredentials.environments[targetEnv] = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv][businessTypeKey]) {
            company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {};
        }
        if (!company.zatcaCredentials.progression) {
            company.zatcaCredentials.progression = {
                b2bCompletedEnvironments: [],
                b2bProductionLocked: false,
                b2cCompletedEnvironments: [],
                b2cProductionLocked: false,
                skippedEnvironments: []
            };
        }

        // Update the specific business type within the environment
        company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {
            ...company.zatcaCredentials.environments[targetEnv][businessTypeKey],
            status: 'csr_generated',
            csr: result.csr,
            privateKey: encryptedPrivateKey,
            createdAt: company.zatcaCredentials.environments[targetEnv][businessTypeKey]?.createdAt || new Date(),
            updatedAt: new Date()
        };

        // Track current business type being onboarded
        company.zatcaCredentials.currentBusinessType = targetBusinessType;

        // Add history entry with business type
        addHistoryEntry(company, targetEnv, `${businessTypeKey}_csr_generated`, userId, {}, targetBusinessType);

        // Mark document as modified (for nested objects)
        company.markModified('zatcaCredentials');
        await company.save();

        zatcaLog.divider();
        zatcaLog.success('CSR generated and stored successfully!');
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.info('Next Step', 'Get Compliance Certificate (Step 2)');
        zatcaLog.end();

        return res.status(200).json({
            success: true,
            message: `CSR generated successfully for ${targetBusinessType}`,
            data: {
                csr: result.csr,
                environment: targetEnv,
                businessType: targetBusinessType
            }
        });
    } catch (error) {
        zatcaLog.error(error.message);
        zatcaLog.end();
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate CSR'
        });
    }
}

/**
 * Get Compliance Certificate
 * POST /api/companies/:id/zatca/compliance-cert
 *
 * Now accepts businessType parameter for separate B2B/B2C onboarding.
 */
async function getComplianceCertificate(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { otp, environment, businessType } = req.body;

        // ═══════════════════════════════════════════════════════════════
        zatcaLog.header('2', 'GET COMPLIANCE CERTIFICATE');
        // ═══════════════════════════════════════════════════════════════

        zatcaLog.subHeader('Request Details');
        zatcaLog.info('Company ID', id);
        zatcaLog.info('Business Type', businessType || 'Not specified');
        zatcaLog.info('OTP', otp ? `${otp.substring(0, 3)}***` : 'NOT PROVIDED');

        // Validate OTP
        if (!otp) {
            zatcaLog.error('OTP is required');
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        // Get company and verify
        zatcaLog.step('2.1', 'Loading company details...');
        const company = await Company.findById(id);
        if (!company) {
            zatcaLog.error('Company not found');
            zatcaLog.end();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            zatcaLog.error('Permission denied');
            zatcaLog.end();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }
        zatcaLog.info('Company', company.companyName);

        // Determine target environment
        const targetEnv = environment || company.zatcaCredentials?.activeEnvironment ||
            determineCurrentEnvironment(company);
        zatcaLog.info('Environment', targetEnv);

        // Determine business type - use from request, or fallback to current tracking
        const targetBusinessType = businessType || company.zatcaCredentials?.currentBusinessType || 'B2B';
        const businessTypeKey = targetBusinessType.toLowerCase();
        zatcaLog.info('Business Type', targetBusinessType);

        // Get credentials for this environment and business type
        zatcaLog.step('2.2', 'Checking CSR credentials...');
        const envCredentials = getEnvironmentCredentials(company, targetEnv, targetBusinessType);

        if (!envCredentials?.csr || !envCredentials?.privateKey) {
            zatcaLog.error(`CSR not generated for ${targetBusinessType} - Please complete Step 1 first`);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: `CSR not generated yet for ${targetBusinessType} in ${targetEnv} environment. Please generate CSR first.`
            });
        }
        zatcaLog.info('CSR', `Found (${envCredentials.csr.length} bytes)`);
        zatcaLog.info('Private Key', 'Found (encrypted)');

        // Validate environment transition
        const validation = validateEnvironmentTransition(company, targetEnv);
        if (!validation.valid) {
            zatcaLog.error(validation.message);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Decrypt private key
        const privateKey = decrypt(envCredentials.privateKey);

        const fullVATNumber = company.taxIdNumber || company.vatNumber;
        const vatNumber = fullVATNumber;

        // Normalize line endings
        const normalizedCSR = envCredentials.csr.replace(/\r\n/g, '\n');

        // Map environment name to environmentType integer (1=sandbox, 2=simulation, 3=production)
        const environmentTypeMap = { sandbox: 1, simulation: 2, production: 3 };
        const environmentType = environmentTypeMap[targetEnv] || 1;

        // Prepare compliance request data
        zatcaLog.divider();
        zatcaLog.step('2.3', 'Calling ZATCA API for compliance certificate...');
        zatcaLog.info('VAT Number', vatNumber);
        zatcaLog.info('CR Number', company.commercialRegistrationNumber);

        const complianceData = {
            environmentType: environmentType,
            csr: normalizedCSR,
            otp: otp,
            currentPCSID: "",
            complianceRequestId: "",
            userName: "",
            password: "",
            vatNumber: vatNumber,
            companyName: company.companyName,
            crNumber: company.commercialRegistrationNumber || ""
        };

        // Call ZATCA API
        const result = await zatcaService.getComplianceCertificate(complianceData);

        zatcaLog.step('2.4', 'Processing ZATCA response...');
        zatcaLog.info('Certificate', result.binarySecurityToken ? `Received (${result.binarySecurityToken.length} bytes)` : 'NOT RECEIVED');
        zatcaLog.info('Secret', result.secret ? 'Received' : 'NOT RECEIVED');
        zatcaLog.info('Request ID', result.requestId || 'NOT RECEIVED');

        // Initialize environments if needed
        zatcaLog.step('2.5', 'Storing credentials in database...');
        if (!company.zatcaCredentials.environments) {
            company.zatcaCredentials.environments = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv]) {
            company.zatcaCredentials.environments[targetEnv] = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv][businessTypeKey]) {
            company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {};
        }

        // Update the specific business type within the environment
        // CRITICAL: complianceRequestId must be stored correctly for Production CSID step
        company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {
            ...company.zatcaCredentials.environments[targetEnv][businessTypeKey],
            status: 'compliance',
            complianceCertificate: result.binarySecurityToken,
            complianceSecret: encrypt(result.secret),
            complianceRequestId: result.requestId,
            updatedAt: new Date()
        };

        zatcaLog.info('Compliance Request ID', result.requestId);
        zatcaLog.info('Status', 'compliance');
        zatcaLog.info('Business Type', targetBusinessType);

        // Add history entry with business type
        addHistoryEntry(company, targetEnv, `${businessTypeKey}_compliance_obtained`, userId, {}, targetBusinessType);

        company.markModified('zatcaCredentials');
        await company.save();

        zatcaLog.divider();
        zatcaLog.success('Compliance certificate obtained successfully!');
        zatcaLog.info('Next Step', 'Submit Test Invoices (Step 3)');
        zatcaLog.end();

        return res.status(200).json({
            success: true,
            message: `Compliance certificate obtained successfully for ${targetBusinessType}`,
            data: {
                status: 'compliance',
                environment: targetEnv,
                businessType: targetBusinessType
            }
        });
    } catch (error) {
        zatcaLog.error(error.message);
        zatcaLog.end();
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get compliance certificate'
        });
    }
}

/**
 * Submit Test Invoices
 * POST /api/companies/:id/zatca/submit-test-invoices
 *
 * ZATCA requires 3 compliance checks for Production CSID:
 * For B2B (Standard Invoice - 0100000):
 * 1. standard-compliant - Standard invoice (388)
 * 2. standard-credit-note-compliant - Credit note (381)
 * 3. standard-debit-note-compliant - Debit note (383)
 *
 * For B2C (Simplified Invoice - 0200000):
 * 1. simplified-compliant - Simplified invoice (388)
 * 2. simplified-credit-note-compliant - Credit note (381)
 * 3. simplified-debit-note-compliant - Debit note (383)
 */
async function submitTestInvoices(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment, businessType } = req.body;

        // ═══════════════════════════════════════════════════════════════
        zatcaLog.header('3', 'SUBMIT TEST INVOICES');
        // ═══════════════════════════════════════════════════════════════

        zatcaLog.subHeader('Request Details');
        zatcaLog.info('Company ID', id);
        zatcaLog.info('Business Type', businessType || 'Not specified');

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            zatcaLog.error('Company not found');
            zatcaLog.end();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            zatcaLog.error('Permission denied');
            zatcaLog.end();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        zatcaLog.info('Company', company.companyName);

        // Determine target environment
        const targetEnv = environment || company.zatcaCredentials?.activeEnvironment ||
            determineCurrentEnvironment(company);
        zatcaLog.info('Environment', targetEnv);

        // Determine business type
        const targetBusinessType = businessType || company.zatcaCredentials?.currentBusinessType || 'B2B';
        const businessTypeKey = targetBusinessType.toLowerCase();
        zatcaLog.info('Business Type', targetBusinessType);

        // Get credentials for this environment and business type
        zatcaLog.step('3.1', 'Checking compliance credentials...');
        const envCredentials = getEnvironmentCredentials(company, targetEnv, targetBusinessType);

        zatcaLog.info('Compliance Certificate', envCredentials?.complianceCertificate ? 'Found' : 'NOT FOUND');
        zatcaLog.info('Compliance Secret', envCredentials?.complianceSecret ? 'Found' : 'NOT FOUND');
        zatcaLog.info('Compliance Request ID', envCredentials?.complianceRequestId || 'NOT FOUND');

        if (!envCredentials?.complianceCertificate) {
            zatcaLog.error(`Compliance certificate not found for ${targetBusinessType} - Complete Step 2 first`);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: `Compliance certificate not obtained yet for ${targetBusinessType} in ${targetEnv} environment`
            });
        }

        // Validate environment transition
        const validation = validateEnvironmentTransition(company, targetEnv);
        if (!validation.valid) {
            zatcaLog.error(validation.message);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Decrypt credentials
        const privateKey = decrypt(envCredentials.privateKey);
        const secret = decrypt(envCredentials.complianceSecret);

        // Strip PEM headers from private key - API expects raw Base64
        const cleanPrivateKey = privateKey
            .replace(/-----BEGIN [A-Z ]+-----/g, '')
            .replace(/-----END [A-Z ]+-----/g, '')
            .replace(/\r?\n/g, '')
            .trim();

        // Get environment type as integer
        const environmentTypeInt = targetEnv === 'production' ? 3 :
                                  targetEnv === 'simulation' ? 2 : 1;

        // Base organization information for all invoice types
        const organizationInfo = {
            buildingNumber: company.address?.buildingNumber || '0000',
            cr: company.commercialRegistrationNumber,
            cityName: company.address.city,
            citySubdivisionName: company.address.district,
            country: 'SA',
            countrySubentity: company.address.province,
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceTime: new Date().toTimeString().split(' ')[0],
            name: company.companyName,
            plotIdentification: company.address?.additionalNumber || '0000',
            postalZone: company.address.postalCode,
            streetName: company.address.street,
            vatRegistrationNumber: company.taxIdNumber || company.vatNumber
        };

        // ZATCA requires 3 compliance checks - must submit all 3 invoice types
        // Invoice type code depends on business type:
        // B2B (Standard) → 0100000
        // B2C (Simplified) → 0200000
        const invoiceTypeCode = getInvoiceTypeCode(targetBusinessType);
        const invoiceTypeName = targetBusinessType === 'B2C' ? 'Simplified' : 'Standard';

        const complianceInvoiceTypes = [
            { type: invoiceTypeCode, code: '388', name: `${invoiceTypeName} Invoice`, complianceStep: `${invoiceTypeName.toLowerCase()}-compliant` },
            { type: invoiceTypeCode, code: '381', name: `${invoiceTypeName} Credit Note`, complianceStep: `${invoiceTypeName.toLowerCase()}-credit-note-compliant` },
            { type: invoiceTypeCode, code: '383', name: `${invoiceTypeName} Debit Note`, complianceStep: `${invoiceTypeName.toLowerCase()}-debit-note-compliant` }
        ];

        zatcaLog.divider();
        zatcaLog.step('3.2', `Submitting 3 ${invoiceTypeName.toLowerCase()} compliance invoice types to ZATCA...`);
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.info('Invoice Type Code', invoiceTypeCode);
        zatcaLog.info('Required Types', `${invoiceTypeName} Invoice, ${invoiceTypeName} Credit Note, ${invoiceTypeName} Debit Note`);

        const results = {
            submitted: [],
            failed: [],
            allWarnings: []
        };

        // Submit each invoice type for compliance
        let invoiceNum = 1;
        for (const invoiceTypeConfig of complianceInvoiceTypes) {
            zatcaLog.divider();
            zatcaLog.step(`3.2.${invoiceNum}`, `Processing ${invoiceTypeConfig.name}...`);
            zatcaLog.info('Invoice Type Code', invoiceTypeConfig.code);
            zatcaLog.info('Compliance Step', invoiceTypeConfig.complianceStep);

            const submissionData = {
                organizationInformation: { ...organizationInfo },
                eguPrivateKey: cleanPrivateKey,
                eguComplianceBinarySecurityToken: envCredentials.complianceCertificate,
                eguComplianceSecret: secret,
                complianceRequestId: envCredentials.complianceRequestId,  // Link to compliance certificate
                subscriptionInfo: {
                    vatNumber: company.taxIdNumber || company.vatNumber,
                    crNumber: company.commercialRegistrationNumber
                },
                invoiceType: invoiceTypeConfig.type,
                invoiceTypeCode: invoiceTypeConfig.code,  // 388=Standard, 381=Credit, 383=Debit
                environmentType: environmentTypeInt
            };

            try {
                // Use the REAL compliance submission that generates XML, signs, and submits
                const result = await zatcaService.submitRealComplianceInvoice(submissionData);

                if (result.success && (!result.errors || result.errors.length === 0)) {
                    zatcaLog.success(`${invoiceTypeConfig.name} - Submitted successfully`);
                    if (result.clearanceStatus) {
                        zatcaLog.info('Clearance Status', result.clearanceStatus);
                    }
                    results.submitted.push({
                        type: invoiceTypeConfig.name,
                        code: invoiceTypeConfig.code,
                        complianceStep: invoiceTypeConfig.complianceStep
                    });
                    if (result.warnings) {
                        results.allWarnings.push(...result.warnings.map(w => `${invoiceTypeConfig.name}: ${w}`));
                    }
                } else {
                    zatcaLog.error(`${invoiceTypeConfig.name} - Failed`);
                    if (result.errors) {
                        result.errors.forEach(e => zatcaLog.info('Error', e));
                    }
                    results.failed.push({
                        type: invoiceTypeConfig.name,
                        code: invoiceTypeConfig.code,
                        complianceStep: invoiceTypeConfig.complianceStep,
                        errors: result.errors
                    });
                }
            } catch (submitError) {
                zatcaLog.error(`${invoiceTypeConfig.name} - Exception: ${submitError.message}`);
                results.failed.push({
                    type: invoiceTypeConfig.name,
                    code: invoiceTypeConfig.code,
                    complianceStep: invoiceTypeConfig.complianceStep,
                    errors: [submitError.message]
                });
            }
            invoiceNum++;
        }

        // Summary
        zatcaLog.divider();
        zatcaLog.subHeader('Submission Summary');
        zatcaLog.info('Submitted', `${results.submitted.length} of 3`);
        zatcaLog.info('Failed', `${results.failed.length} of 3`);

        // Check if any submissions failed
        if (results.failed.length > 0) {
            zatcaLog.error('Compliance submission incomplete');
            results.failed.forEach(f => {
                zatcaLog.info(`Failed: ${f.type}`, f.errors?.join(', '));
            });
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: `Compliance submission incomplete. ${results.failed.length} of 3 invoice types failed.`,
                data: {
                    submitted: results.submitted,
                    failed: results.failed,
                    requiredSteps: ['standard-compliant', 'standard-credit-note-compliant', 'standard-debit-note-compliant'],
                    completedSteps: results.submitted.map(s => s.complianceStep)
                },
                errors: results.failed.flatMap(f => f.errors || []),
                warnings: results.allWarnings
            });
        }

        // Update environment status to indicate all test invoices were submitted
        zatcaLog.step('3.3', 'Storing compliance results...');
        if (!company.zatcaCredentials.environments) {
            company.zatcaCredentials.environments = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv]) {
            company.zatcaCredentials.environments[targetEnv] = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv][businessTypeKey]) {
            company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {};
        }

        // Update the specific business type within the environment
        company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {
            ...company.zatcaCredentials.environments[targetEnv][businessTypeKey],
            status: 'test_invoices_submitted',
            testInvoicesSubmittedAt: new Date(),
            complianceStepsCompleted: results.submitted.map(s => s.complianceStep),
            updatedAt: new Date()
        };

        // Add history entry with business type
        addHistoryEntry(company, targetEnv, `${businessTypeKey}_test_invoices_submitted`, userId, {
            warnings: results.allWarnings,
            completedSteps: results.submitted.map(s => s.complianceStep),
            invoiceTypeCode
        }, targetBusinessType);

        company.markModified('zatcaCredentials');
        await company.save();

        zatcaLog.divider();
        zatcaLog.success(`All 3 ${invoiceTypeName.toLowerCase()} compliance invoice types submitted successfully!`);
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.info('Invoice Type Code', invoiceTypeCode);
        zatcaLog.info('Completed Steps', results.submitted.map(s => s.complianceStep).join(', '));
        zatcaLog.info('Next Step', 'Get Production CSID (Step 4)');
        zatcaLog.end();

        return res.status(200).json({
            success: true,
            message: `All 3 ${invoiceTypeName.toLowerCase()} compliance invoice types submitted successfully for ${targetBusinessType}`,
            data: {
                submitted: results.submitted,
                completedSteps: results.submitted.map(s => s.complianceStep),
                warnings: results.allWarnings,
                environment: targetEnv,
                businessType: targetBusinessType,
                invoiceTypeCode
            }
        });
    } catch (error) {
        zatcaLog.error(error.message);
        zatcaLog.end();
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit test invoices'
        });
    }
}

/**
 * Get Production CSID
 * POST /api/companies/:id/zatca/production-csid
 *
 * Now accepts businessType parameter for separate B2B/B2C onboarding.
 * Stores credentials in environments[env].b2b or environments[env].b2c
 * Sets b2bEnabled or b2cEnabled flag when respective onboarding completes.
 */
async function getProductionCSID(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment, businessType } = req.body;

        // ═══════════════════════════════════════════════════════════════
        zatcaLog.header('4', 'GET PRODUCTION CSID');
        // ═══════════════════════════════════════════════════════════════

        zatcaLog.subHeader('Request Details');
        zatcaLog.info('Company ID', id);
        zatcaLog.info('Business Type', businessType || 'Not specified');

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            zatcaLog.error('Company not found');
            zatcaLog.end();
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            zatcaLog.error('Permission denied');
            zatcaLog.end();
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        zatcaLog.info('Company', company.companyName);

        // Determine target environment
        const targetEnv = environment || company.zatcaCredentials?.activeEnvironment ||
            determineCurrentEnvironment(company);
        zatcaLog.info('Environment', targetEnv);

        // Determine business type
        const targetBusinessType = businessType || company.zatcaCredentials?.currentBusinessType || 'B2B';
        const businessTypeKey = targetBusinessType.toLowerCase();
        zatcaLog.info('Business Type', targetBusinessType);

        // Get credentials for this environment and business type
        zatcaLog.step('4.1', 'Checking prerequisites...');
        const envCredentials = getEnvironmentCredentials(company, targetEnv, targetBusinessType);

        zatcaLog.info('Current Status', envCredentials?.status || 'NOT SET');
        zatcaLog.info('Compliance Request ID', envCredentials?.complianceRequestId || 'NOT SET');

        // Allow both 'compliance' (legacy) and 'test_invoices_submitted' (new) statuses
        if (envCredentials?.status !== 'compliance' && envCredentials?.status !== 'test_invoices_submitted') {
            zatcaLog.error(`Test invoices must be submitted first for ${targetBusinessType} (Step 3)`);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: `Test invoices must be submitted before obtaining production CSID for ${targetBusinessType} in ${targetEnv} environment`
            });
        }

        // Validate environment transition
        const validation = validateEnvironmentTransition(company, targetEnv);
        if (!validation.valid) {
            zatcaLog.error(validation.message);
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Decrypt credentials
        const secret = decrypt(envCredentials.complianceSecret);

        const username = envCredentials.complianceCertificate;
        const password = secret;

        // Get environment type as integer
        const environmentTypeInt = targetEnv === 'production' ? 3 :
                                  targetEnv === 'simulation' ? 2 : 1;

        zatcaLog.info('Compliance Certificate', username ? `Found (${username.length} bytes)` : 'NOT FOUND');
        zatcaLog.info('Compliance Secret', password ? 'Found' : 'NOT FOUND');

        // Check if all 3 compliance steps were completed
        zatcaLog.step('4.2', 'Validating compliance steps...');
        const requiredSteps = ['standard-compliant', 'standard-credit-note-compliant', 'standard-debit-note-compliant'];
        const completedSteps = envCredentials?.complianceStepsCompleted || [];
        const missingSteps = requiredSteps.filter(step => !completedSteps.includes(step));

        zatcaLog.info('Completed Steps', completedSteps.length > 0 ? completedSteps.join(', ') : 'NONE');
        zatcaLog.info('Missing Steps', missingSteps.length > 0 ? missingSteps.join(', ') : 'NONE');

        // AUTO-SUBMIT TEST INVOICES if compliance steps are not completed
        if (missingSteps.length > 0) {
            zatcaLog.warning('Compliance steps incomplete - Auto-submitting...');

            // Decrypt credentials for test invoice submission
            const privateKey = decrypt(envCredentials.privateKey);
            const complianceSecret = decrypt(envCredentials.complianceSecret);

            // Strip PEM headers from private key
            const cleanPrivateKey = privateKey
                .replace(/-----BEGIN [A-Z ]+-----/g, '')
                .replace(/-----END [A-Z ]+-----/g, '')
                .replace(/\r?\n/g, '')
                .trim();

            // Get environment type as integer
            const envTypeInt = targetEnv === 'production' ? 3 :
                              targetEnv === 'simulation' ? 2 : 1;

            // Base organization information
            const organizationInfo = {
                buildingNumber: company.address?.buildingNumber || '0000',
                cr: company.commercialRegistrationNumber,
                cityName: company.address.city,
                citySubdivisionName: company.address.district,
                country: 'SA',
                countrySubentity: company.address.province,
                invoiceDate: new Date().toISOString().split('T')[0],
                invoiceTime: new Date().toTimeString().split(' ')[0],
                name: company.companyName,
                plotIdentification: company.address?.additionalNumber || '0000',
                postalZone: company.address.postalCode,
                streetName: company.address.street,
                vatRegistrationNumber: company.taxIdNumber || company.vatNumber
            };

            // Submit all 3 invoice types for compliance
            // Use correct invoice type code based on business type
            const autoInvoiceTypeCode = getInvoiceTypeCode(targetBusinessType);
            const autoInvoiceTypeName = targetBusinessType === 'B2C' ? 'Simplified' : 'Standard';

            const complianceInvoiceTypes = [
                { type: autoInvoiceTypeCode, code: '388', name: `${autoInvoiceTypeName} Invoice`, complianceStep: `${autoInvoiceTypeName.toLowerCase()}-compliant` },
                { type: autoInvoiceTypeCode, code: '381', name: `${autoInvoiceTypeName} Credit Note`, complianceStep: `${autoInvoiceTypeName.toLowerCase()}-credit-note-compliant` },
                { type: autoInvoiceTypeCode, code: '383', name: `${autoInvoiceTypeName} Debit Note`, complianceStep: `${autoInvoiceTypeName.toLowerCase()}-debit-note-compliant` }
            ];

            const submissionResults = { submitted: [], failed: [] };

            for (const invoiceTypeConfig of complianceInvoiceTypes) {
                console.log(`\n--- Auto-submitting ${invoiceTypeConfig.name} (Code: ${invoiceTypeConfig.code}) ---`);

                const submissionData = {
                    organizationInformation: { ...organizationInfo },
                    eguPrivateKey: cleanPrivateKey,
                    eguComplianceBinarySecurityToken: envCredentials.complianceCertificate,
                    eguComplianceSecret: complianceSecret,
                    complianceRequestId: envCredentials.complianceRequestId,  // Link to compliance certificate
                    subscriptionInfo: {
                        vatNumber: company.taxIdNumber || company.vatNumber,
                        crNumber: company.commercialRegistrationNumber
                    },
                    invoiceType: invoiceTypeConfig.type,
                    invoiceTypeCode: invoiceTypeConfig.code,
                    environmentType: envTypeInt
                };

                try {
                    // Use the REAL compliance submission
                    const result = await zatcaService.submitRealComplianceInvoice(submissionData);
                    console.log(`${invoiceTypeConfig.name} Result:`, {
                        success: result.success,
                        clearanceStatus: result.clearanceStatus,
                        errors: result.errors
                    });

                    if (result.success && (!result.errors || result.errors.length === 0)) {
                        submissionResults.submitted.push(invoiceTypeConfig.complianceStep);
                    } else {
                        submissionResults.failed.push({
                            step: invoiceTypeConfig.complianceStep,
                            errors: result.errors
                        });
                    }
                } catch (submitError) {
                    console.error(`Error submitting ${invoiceTypeConfig.name}:`, submitError.message);
                    submissionResults.failed.push({
                        step: invoiceTypeConfig.complianceStep,
                        errors: [submitError.message]
                    });
                }
            }

            zatcaLog.info('Auto-submitted', `${submissionResults.submitted.length} of 3`);

            // If any submissions failed, return error
            if (submissionResults.failed.length > 0) {
                zatcaLog.error('Auto-submission failed');
                zatcaLog.end();
                return res.status(400).json({
                    success: false,
                    message: `Failed to complete compliance steps. ${submissionResults.failed.length} of 3 invoice types failed.`,
                    data: {
                        submitted: submissionResults.submitted,
                        failed: submissionResults.failed,
                        requiredSteps: requiredSteps
                    },
                    errors: submissionResults.failed.flatMap(f => f.errors || [])
                });
            }

            // Update company with completed compliance steps for the specific business type
            if (!company.zatcaCredentials.environments[targetEnv]) {
                company.zatcaCredentials.environments[targetEnv] = {};
            }
            if (!company.zatcaCredentials.environments[targetEnv][businessTypeKey]) {
                company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {};
            }
            company.zatcaCredentials.environments[targetEnv][businessTypeKey].complianceStepsCompleted = submissionResults.submitted;
            company.zatcaCredentials.environments[targetEnv][businessTypeKey].testInvoicesSubmittedAt = new Date();
            company.zatcaCredentials.environments[targetEnv][businessTypeKey].status = 'test_invoices_submitted';
            company.markModified('zatcaCredentials');
            await company.save();

            zatcaLog.success('Auto-submission completed successfully');
        }

        if (!envCredentials.complianceRequestId) {
            zatcaLog.error('Compliance Request ID is missing');
            zatcaLog.end();
            return res.status(400).json({
                success: false,
                message: 'Compliance Request ID is missing. Please re-do the compliance certificate step (Step 2) to obtain a valid compliance request ID.'
            });
        }

        // Prepare production CSID request
        zatcaLog.divider();
        zatcaLog.step('4.3', 'Requesting Production CSID from ZATCA...');
        zatcaLog.info('Compliance Request ID', envCredentials.complianceRequestId);

        const productionData = {
            complianceRequestId: envCredentials.complianceRequestId,
            userName: username,
            password: password,
            vatNumber: company.taxIdNumber || company.vatNumber,
            companyName: company.companyName,
            crNumber: company.commercialRegistrationNumber,
            environmentType: environmentTypeInt
        };

        // Call ZATCA API
        const result = await zatcaService.getProductionCSID(productionData);

        zatcaLog.step('4.4', 'Processing ZATCA response...');
        zatcaLog.info('Production CSID', result.binarySecurityToken ? `Received (${result.binarySecurityToken.length} bytes)` : 'NOT RECEIVED');
        zatcaLog.info('Production Secret', result.secret ? 'Received' : 'NOT RECEIVED');

        // Initialize if needed
        if (!company.zatcaCredentials.environments) {
            company.zatcaCredentials.environments = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv]) {
            company.zatcaCredentials.environments[targetEnv] = {};
        }
        if (!company.zatcaCredentials.environments[targetEnv][businessTypeKey]) {
            company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {};
        }
        if (!company.zatcaCredentials.progression) {
            company.zatcaCredentials.progression = {
                b2bCompletedEnvironments: [],
                b2bProductionLocked: false,
                b2cCompletedEnvironments: [],
                b2cProductionLocked: false,
                skippedEnvironments: []
            };
        }

        // Update the specific business type within the environment
        company.zatcaCredentials.environments[targetEnv][businessTypeKey] = {
            ...company.zatcaCredentials.environments[targetEnv][businessTypeKey],
            status: 'verified',
            productionCSID: result.binarySecurityToken,
            productionSecret: encrypt(result.secret),
            onboardedAt: new Date(),
            updatedAt: new Date()
        };

        // Mark environment as completed for this business type
        const completedEnvsKey = `${businessTypeKey}CompletedEnvironments`;
        if (!company.zatcaCredentials.progression[completedEnvsKey]) {
            company.zatcaCredentials.progression[completedEnvsKey] = [];
        }
        if (!company.zatcaCredentials.progression[completedEnvsKey].includes(targetEnv)) {
            company.zatcaCredentials.progression[completedEnvsKey].push(targetEnv);
        }

        // Set as active environment
        company.zatcaCredentials.activeEnvironment = targetEnv;

        // If production is completed for this business type, lock that type
        if (targetEnv === 'production') {
            const productionLockedKey = `${businessTypeKey}ProductionLocked`;
            const productionLockedAtKey = `${businessTypeKey}ProductionLockedAt`;
            company.zatcaCredentials.progression[productionLockedKey] = true;
            company.zatcaCredentials.progression[productionLockedAtKey] = new Date();
            company.verificationStatus = 'verified';
        }

        // Clear current business type tracking (onboarding complete)
        company.zatcaCredentials.currentBusinessType = null;

        // Add history entry with business type
        addHistoryEntry(company, targetEnv, `${businessTypeKey}_production_csid_obtained`, userId, {}, targetBusinessType);

        company.markModified('zatcaCredentials');
        await company.save();

        zatcaLog.divider();
        zatcaLog.success('Production CSID obtained successfully!');
        zatcaLog.info('Environment', targetEnv);
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.info('Status', 'VERIFIED');
        if (targetEnv === 'production') {
            zatcaLog.info(`${targetBusinessType} Production Locked`, 'YES');
        }
        zatcaLog.divider();
        zatcaLog.success(`ZATCA ${targetBusinessType} ONBOARDING COMPLETE!`);
        zatcaLog.info('Company', company.companyName);
        zatcaLog.info('Business Type', targetBusinessType);
        zatcaLog.end();

        return res.status(200).json({
            success: true,
            message: `Production CSID obtained successfully for ${targetBusinessType} in ${targetEnv}. ${targetEnv === 'production' ? `Company is now verified for ${targetBusinessType} ZATCA e-invoicing!` : ''}`,
            data: {
                status: 'verified',
                environment: targetEnv,
                businessType: targetBusinessType,
                onboardedAt: company.zatcaCredentials.environments[targetEnv][businessTypeKey].onboardedAt,
                b2bProductionLocked: company.zatcaCredentials.progression.b2bProductionLocked || false,
                b2cProductionLocked: company.zatcaCredentials.progression.b2cProductionLocked || false
            }
        });
    } catch (error) {
        zatcaLog.error(error.message);
        zatcaLog.end();
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get production CSID'
        });
    }
}

/**
 * Get ZATCA Status - Returns multi-environment status with separate B2B/B2C data
 * GET /api/companies/:id/zatca/status
 */
async function getZatcaStatus(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        const zatca = company.zatcaCredentials || {};
        const progression = zatca.progression || {};

        // Helper function to build status for a business type
        const buildBusinessTypeStatus = (envData, businessTypeKey) => {
            const typeData = envData?.[businessTypeKey];
            if (!typeData) {
                return {
                    status: 'not_started',
                    hasCSR: false,
                    hasComplianceCert: false,
                    hasTestInvoicesSubmitted: false,
                    hasProductionCSID: false,
                    onboardedAt: null
                };
            }
            const status = typeData.status || 'not_started';
            return {
                status: status,
                hasCSR: !!typeData.csr,
                hasComplianceCert: !!typeData.complianceCertificate,
                hasTestInvoicesSubmitted: status === 'test_invoices_submitted' || status === 'verified',
                hasProductionCSID: !!typeData.productionCSID,
                onboardedAt: typeData.onboardedAt
            };
        };

        // Build environment status for each environment with B2B/B2C sub-objects only
        const environmentStatus = {};
        for (const env of ENVIRONMENT_ORDER) {
            const envData = zatca.environments?.[env];

            environmentStatus[env] = {
                // B2B status
                b2b: buildBusinessTypeStatus(envData, 'b2b'),
                // B2C status
                b2c: buildBusinessTypeStatus(envData, 'b2c')
            };
        }

        // Determine current step for active/working environment
        const activeEnv = zatca.activeEnvironment || null;
        const currentBusinessType = zatca.currentBusinessType || null;
        const activeEnvStatus = activeEnv ? environmentStatus[activeEnv] : null;

        // Prevent caching to ensure fresh data after reset
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return res.status(200).json({
            success: true,
            data: {
                // Active environment for invoicing
                activeEnvironment: activeEnv,
                // Current business type being onboarded
                currentBusinessType: currentBusinessType,
                // Per-environment credentials with B2B/B2C nested structure
                environments: environmentStatus,
                // Progression tracking per business type
                progression: {
                    b2bCompletedEnvironments: progression.b2bCompletedEnvironments || [],
                    b2bProductionLocked: progression.b2bProductionLocked || false,
                    b2bProductionLockedAt: progression.b2bProductionLockedAt || null,
                    b2cCompletedEnvironments: progression.b2cCompletedEnvironments || [],
                    b2cProductionLocked: progression.b2cProductionLocked || false,
                    b2cProductionLockedAt: progression.b2cProductionLockedAt || null,
                    skippedEnvironments: progression.skippedEnvironments || []
                },
                canSkipTo: calculateCanSkipTo(company),
                // B2B/B2C enablement
                b2bEnabled: zatca.b2bEnabled || false,
                b2cEnabled: zatca.b2cEnabled || false
            }
        });
    } catch (error) {
        console.error('Get ZATCA status error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get ZATCA status'
        });
    }
}

/**
 * Skip to Environment
 * POST /api/companies/:id/zatca/skip-environment
 */
async function skipEnvironment(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { targetEnvironment } = req.body;

        if (!targetEnvironment || !ENVIRONMENT_ORDER.includes(targetEnvironment)) {
            return res.status(400).json({
                success: false,
                message: 'Valid target environment is required (sandbox, simulation, or production)'
            });
        }

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        // Calculate what can be skipped to
        const canSkipTo = calculateCanSkipTo(company);
        if (!canSkipTo.includes(targetEnvironment)) {
            return res.status(400).json({
                success: false,
                message: `Cannot skip to ${targetEnvironment}. Allowed targets: ${canSkipTo.join(', ') || 'none'}`
            });
        }

        // Initialize structures if needed
        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }
        if (!company.zatcaCredentials.progression) {
            company.zatcaCredentials.progression = {
                b2bCompletedEnvironments: [],
                b2bProductionLocked: false,
                b2cCompletedEnvironments: [],
                b2cProductionLocked: false,
                skippedEnvironments: []
            };
        }
        if (!company.zatcaCredentials.environments) {
            company.zatcaCredentials.environments = {};
        }

        // Mark all lower environments as skipped
        const targetIndex = ENVIRONMENT_ORDER.indexOf(targetEnvironment);
        for (let i = 0; i < targetIndex; i++) {
            const envToSkip = ENVIRONMENT_ORDER[i];
            if (!company.zatcaCredentials.progression.skippedEnvironments) {
                company.zatcaCredentials.progression.skippedEnvironments = [];
            }
            // Check if any business type has completed this environment
            const b2bCompleted = company.zatcaCredentials.progression.b2bCompletedEnvironments?.includes(envToSkip);
            const b2cCompleted = company.zatcaCredentials.progression.b2cCompletedEnvironments?.includes(envToSkip);
            if (!company.zatcaCredentials.progression.skippedEnvironments.includes(envToSkip) &&
                !b2bCompleted && !b2cCompleted) {
                company.zatcaCredentials.progression.skippedEnvironments.push(envToSkip);

                // Add history entry for skipped environment
                addHistoryEntry(company, envToSkip, 'environment_skipped', userId, {
                    skippedTo: targetEnvironment
                });
            }
        }

        // Set the target as active (but not started yet)
        company.zatcaCredentials.activeEnvironment = targetEnvironment;

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: `Skipped to ${targetEnvironment} environment`,
            data: {
                activeEnvironment: targetEnvironment,
                skippedEnvironments: company.zatcaCredentials.progression.skippedEnvironments
            }
        });
    } catch (error) {
        console.error('Skip environment error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to skip environment'
        });
    }
}

/**
 * Set Active Environment
 * POST /api/companies/:id/zatca/set-active-environment
 */
async function setActiveEnvironment(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment } = req.body;

        if (!environment || !ENVIRONMENT_ORDER.includes(environment)) {
            return res.status(400).json({
                success: false,
                message: 'Valid environment is required (sandbox, simulation, or production)'
            });
        }

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        // Only verified environments can be set as active for invoicing
        const envCredentials = getEnvironmentCredentials(company, environment);
        if (envCredentials?.status !== 'verified') {
            return res.status(400).json({
                success: false,
                message: `Cannot set ${environment} as active. Only verified environments can be used for invoicing.`
            });
        }

        // Initialize if needed
        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        company.zatcaCredentials.activeEnvironment = environment;

        // Add history entry
        addHistoryEntry(company, environment, 'environment_activated', userId);

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: `${environment} environment is now active for invoicing`,
            data: {
                activeEnvironment: environment
            }
        });
    } catch (error) {
        console.error('Set active environment error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to set active environment'
        });
    }
}

/**
 * Get ZATCA History
 * GET /api/companies/:id/zatca/history
 */
async function getZatcaHistory(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment } = req.query;

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        let history = company.zatcaCredentials?.history || [];

        // Filter by environment if specified
        if (environment && ENVIRONMENT_ORDER.includes(environment)) {
            history = history.filter(entry => entry.environment === environment);
        }

        // Sort by timestamp descending (most recent first)
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return res.status(200).json({
            success: true,
            data: {
                history,
                total: history.length
            }
        });
    } catch (error) {
        console.error('Get ZATCA history error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get ZATCA history'
        });
    }
}

/**
 * Reset ZATCA Onboarding
 * POST /api/companies/:id/zatca/reset-onboarding
 * Clears ZATCA credentials to restart the onboarding process
 *
 * Parameters:
 * - environment: Optional. Reset only specific environment.
 * - businessType: Optional. Reset only specific business type (B2B or B2C).
 *   If both environment and businessType provided, resets that specific combination.
 */
async function resetZatcaOnboarding(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment, businessType } = req.body;

        // Get company and verify
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        // Check production lock based on what's being reset
        const targetBusinessTypeKey = businessType?.toLowerCase();
        if (targetBusinessTypeKey) {
            // Check if production is locked for this specific business type
            const productionLockedKey = `${targetBusinessTypeKey}ProductionLocked`;
            if (company.zatcaCredentials?.progression?.[productionLockedKey]) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot reset ${businessType} onboarding after production environment has been completed. This is a permanent action that cannot be undone.`
                });
            }
        } else if (company.zatcaCredentials?.progression?.productionLocked) {
            // Legacy check - cannot reset if any production is locked
            return res.status(400).json({
                success: false,
                message: 'Cannot reset onboarding after production environment has been completed. This is a permanent action that cannot be undone.'
            });
        }

        // Initialize structures if needed
        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }
        if (!company.zatcaCredentials.history) {
            company.zatcaCredentials.history = [];
        }

        if (environment && ENVIRONMENT_ORDER.includes(environment)) {
            // Reset specific environment
            console.log(`Resetting ZATCA onboarding for environment: ${environment}, businessType: ${businessType || 'all'}`);

            if (company.zatcaCredentials.environments?.[environment]) {
                if (businessType && ['B2B', 'B2C'].includes(businessType)) {
                    // Reset specific business type within environment
                    const typeKey = businessType.toLowerCase();
                    company.zatcaCredentials.environments[environment][typeKey] = {
                        status: 'not_started',
                        csr: null,
                        privateKey: null,
                        complianceCertificate: null,
                        complianceSecret: null,
                        complianceRequestId: null,
                        productionCSID: null,
                        productionSecret: null,
                        onboardedAt: null,
                        updatedAt: new Date()
                    };

                    // Remove from business type specific completed environments
                    const completedEnvsKey = `${typeKey}CompletedEnvironments`;
                    if (company.zatcaCredentials.progression?.[completedEnvsKey]) {
                        company.zatcaCredentials.progression[completedEnvsKey] =
                            company.zatcaCredentials.progression[completedEnvsKey].filter(env => env !== environment);
                    }

                    // Add history entry
                    addHistoryEntry(company, environment, 'onboarding_reset', userId, {
                        resetType: 'single_business_type',
                        businessType
                    }, businessType);
                } else {
                    // Reset entire environment (both B2B and B2C) - only nested structure
                    company.zatcaCredentials.environments[environment] = {
                        b2b: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() },
                        b2c: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() }
                    };

                    // Remove from B2B/B2C completed environments
                    if (company.zatcaCredentials.progression?.b2bCompletedEnvironments) {
                        company.zatcaCredentials.progression.b2bCompletedEnvironments =
                            company.zatcaCredentials.progression.b2bCompletedEnvironments.filter(env => env !== environment);
                    }
                    if (company.zatcaCredentials.progression?.b2cCompletedEnvironments) {
                        company.zatcaCredentials.progression.b2cCompletedEnvironments =
                            company.zatcaCredentials.progression.b2cCompletedEnvironments.filter(env => env !== environment);
                    }

                    // Add history entry
                    addHistoryEntry(company, environment, 'onboarding_reset', userId, {
                        resetType: 'single_environment'
                    });
                }
            }

            // If resetting the active environment, clear it
            if (company.zatcaCredentials.activeEnvironment === environment) {
                company.zatcaCredentials.activeEnvironment = null;
            }
        } else if (businessType && ['B2B', 'B2C'].includes(businessType)) {
            // Reset specific business type across all environments
            const typeKey = businessType.toLowerCase();
            console.log(`Resetting ZATCA onboarding for businessType: ${businessType} across all environments`);

            for (const env of ENVIRONMENT_ORDER) {
                if (company.zatcaCredentials.environments?.[env]) {
                    company.zatcaCredentials.environments[env][typeKey] = {
                        status: 'not_started',
                        csr: null,
                        privateKey: null,
                        complianceCertificate: null,
                        complianceSecret: null,
                        complianceRequestId: null,
                        productionCSID: null,
                        productionSecret: null,
                        onboardedAt: null,
                        updatedAt: new Date()
                    };
                }
            }

            // Clear business type specific progression
            const completedEnvsKey = `${typeKey}CompletedEnvironments`;
            const productionLockedKey = `${typeKey}ProductionLocked`;
            if (company.zatcaCredentials.progression) {
                company.zatcaCredentials.progression[completedEnvsKey] = [];
                company.zatcaCredentials.progression[productionLockedKey] = false;
            }

            // Reset enabled flag
            // Clear current business type if it matches
            if (company.zatcaCredentials.currentBusinessType === businessType) {
                company.zatcaCredentials.currentBusinessType = null;
            }

            // Add history entry
            addHistoryEntry(company, 'all', 'onboarding_reset', userId, {
                resetType: 'all_environments_single_business_type',
                businessType
            }, businessType);
        } else {
            // Reset all environments and business types - ONLY B2B/B2C nested structure
            console.log('=== ZATCA FULL RESET ===');

            company.zatcaCredentials.environments = {
                sandbox: {
                    b2b: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() },
                    b2c: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() }
                },
                simulation: {
                    b2b: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() },
                    b2c: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() }
                },
                production: {
                    b2b: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() },
                    b2c: { status: 'not_started', hashChainCounter: 0, previousInvoiceHash: null, updatedAt: new Date() }
                }
            };

            company.zatcaCredentials.progression = {
                b2bCompletedEnvironments: [],
                b2bProductionLocked: false,
                b2cCompletedEnvironments: [],
                b2cProductionLocked: false,
                skippedEnvironments: []
            };

            company.zatcaCredentials.activeEnvironment = null;
            company.zatcaCredentials.currentBusinessType = null;

            // Reset onboarding phase
            company.zatcaCredentials.onboardingPhase = null;

            // Reset other onboarding-related data
            company.zatcaCredentials.onboardingDetails = null;
            company.zatcaCredentials.otpVerification = null;
            company.zatcaCredentials.tluData = null;
            company.zatcaCredentials.apiVerificationStatus = 'not_verified';
            company.zatcaCredentials.configurationKeys = [];

            // Add history entry
            addHistoryEntry(company, 'all', 'onboarding_reset', userId, {
                resetType: 'all_environments_all_business_types'
            });
        }

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: environment
                ? `ZATCA onboarding reset for ${environment} environment`
                : 'ZATCA onboarding reset for all environments'
        });
    } catch (error) {
        console.error('Reset ZATCA onboarding error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to reset ZATCA onboarding'
        });
    }
}

// ============== NEW Onboarding Management Methods ==============

const otpService = require('../services/otpService');
const tluService = require('../services/tluService');

/**
 * Set Onboarding Phase (Phase 1 or Phase 2)
 * POST /api/companies/:id/zatca/set-phase
 */
async function setOnboardingPhase(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { phase } = req.body;

        const validPhases = ['phase1_generation', 'phase2_integration'];
        if (!phase || !validPhases.includes(phase)) {
            return res.status(400).json({
                success: false,
                message: 'Valid phase is required: phase1_generation or phase2_integration'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        company.zatcaCredentials.onboardingPhase = phase;
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: `Onboarding phase set to ${phase}`,
            data: { phase }
        });
    } catch (error) {
        console.error('Set onboarding phase error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to set onboarding phase'
        });
    }
}

/**
 * Set Business Type (B2B, B2C, or both)
 * POST /api/companies/:id/zatca/set-business-type
 */
async function setBusinessType(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { businessType } = req.body;

        const validTypes = ['B2B', 'B2C', 'both'];
        if (!businessType || !validTypes.includes(businessType)) {
            return res.status(400).json({
                success: false,
                message: 'Valid business type is required: B2B, B2C, or both'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        // Track which business type is currently being onboarded
        company.zatcaCredentials.currentBusinessType = businessType;

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: `Business type set to ${businessType}`,
            data: {
                currentBusinessType: businessType
            }
        });
    } catch (error) {
        console.error('Set business type error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to set business type'
        });
    }
}

/**
 * Submit Onboarding Details
 * POST /api/companies/:id/zatca/submit-onboarding-details
 */
async function submitOnboardingDetails(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { sellerName, sellerNumber, totalAmount, buyerDetails } = req.body;

        if (!sellerName || !sellerNumber) {
            return res.status(400).json({
                success: false,
                message: 'Seller name and seller number are required'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        company.zatcaCredentials.onboardingDetails = {
            sellerName,
            sellerNumber,
            totalAmount: totalAmount || 0,
            buyerDetails: buyerDetails || {},
            submittedAt: new Date()
        };

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: 'Onboarding details submitted successfully',
            data: company.zatcaCredentials.onboardingDetails
        });
    } catch (error) {
        console.error('Submit onboarding details error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit onboarding details'
        });
    }
}

/**
 * Get Onboarding Details
 * GET /api/companies/:id/zatca/onboarding-details
 */
async function getOnboardingDetails(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        const data = {
            phase: company.zatcaCredentials?.onboardingPhase || null,
            businessType: company.zatcaCredentials?.currentBusinessType || null,
            onboardingDetails: company.zatcaCredentials?.onboardingDetails || null,
            b2bEnabled: company.zatcaCredentials?.b2bEnabled === true,
            b2cEnabled: company.zatcaCredentials?.b2cEnabled === true
        };

        console.log('=== GET ONBOARDING DETAILS ===');
        console.log('Returning:', data);

        // Prevent caching to ensure fresh data after reset
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get onboarding details error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get onboarding details'
        });
    }
}

/**
 * Generate TLU Token
 * POST /api/companies/:id/zatca/generate-tlu
 */
async function generateTLU(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { environment } = req.body;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const targetEnv = environment || company.zatcaCredentials?.activeEnvironment || DEFAULT_PHASE2_ENVIRONMENT;

        const tokenData = tluService.generateTLUToken({
            companyId: id,
            vatNumber: company.taxIdNumber || company.vatNumber,
            environment: targetEnv
        });

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        company.zatcaCredentials.tluData = tluService.createTLUStorageData(tokenData);
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: 'TLU token generated successfully',
            data: {
                tokenId: tokenData.tokenId,
                base64Encoded: tokenData.base64Encoded,
                generatedAt: tokenData.generatedAt,
                expiresAt: tokenData.expiresAt,
                environment: targetEnv
            }
        });
    } catch (error) {
        console.error('Generate TLU error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate TLU token'
        });
    }
}

/**
 * Get TLU Status
 * GET /api/companies/:id/zatca/tlu-status
 */
async function getTLUStatus(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        const tluData = company.zatcaCredentials?.tluData;
        const status = tluService.getTLUStatus(tluData?.base64Encoded);

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Get TLU status error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get TLU status'
        });
    }
}

/**
 * Attach TLU to API
 * POST /api/companies/:id/zatca/attach-tlu
 */
async function attachTLUToAPI(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const tluData = company.zatcaCredentials?.tluData;
        if (!tluData?.base64Encoded) {
            return res.status(400).json({
                success: false,
                message: 'No TLU token found. Please generate one first.'
            });
        }

        const validation = tluService.validateTLUToken(tluData.base64Encoded);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: `TLU token is invalid: ${validation.error}`
            });
        }

        company.zatcaCredentials.tluData.attachedToAPI = true;
        company.zatcaCredentials.tluData.attachedAt = new Date();
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: 'TLU token attached to API successfully',
            data: {
                attachedAt: company.zatcaCredentials.tluData.attachedAt,
                tokenId: tluData.tokenId
            }
        });
    } catch (error) {
        console.error('Attach TLU error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to attach TLU token'
        });
    }
}

/**
 * Send OTP for phone verification
 * POST /api/companies/:id/zatca/send-otp
 */
async function sendOTP(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const result = await otpService.sendOTP(id, phoneNumber);

        if (result.success) {
            if (!company.zatcaCredentials) {
                company.zatcaCredentials = {};
            }
            if (!company.zatcaCredentials.otpVerification) {
                company.zatcaCredentials.otpVerification = {};
            }
            company.zatcaCredentials.otpVerification.phoneNumber = phoneNumber;
            company.markModified('zatcaCredentials');
            await company.save();
        }

        return res.status(result.success ? 200 : 429).json(result);
    } catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
}

/**
 * Verify OTP
 * POST /api/companies/:id/zatca/verify-otp
 */
async function verifyOTP(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const result = await otpService.verifyOTP(id, otp);

        if (result.success) {
            if (!company.zatcaCredentials) {
                company.zatcaCredentials = {};
            }
            if (!company.zatcaCredentials.otpVerification) {
                company.zatcaCredentials.otpVerification = {};
            }
            company.zatcaCredentials.otpVerification.verified = true;
            company.zatcaCredentials.otpVerification.verifiedAt = new Date();
            company.markModified('zatcaCredentials');
            await company.save();
        }

        return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
}

/**
 * Resend OTP
 * POST /api/companies/:id/zatca/resend-otp
 */
async function resendOTP(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const result = await otpService.resendOTP(id);
        return res.status(result.success ? 200 : 429).json(result);
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to resend OTP'
        });
    }
}

/**
 * Get Configuration
 * GET /api/companies/:id/zatca/configuration
 */
async function getConfiguration(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        // Get current values - use strict equality to avoid truthy/falsy issues
        const businessType = company.zatcaCredentials?.businessType || null;
        const b2bEnabled = company.zatcaCredentials?.b2bEnabled === true;
        const b2cEnabled = company.zatcaCredentials?.b2cEnabled === true;

        console.log('=== GET CONFIGURATION ===');
        console.log('Raw b2bEnabled:', company.zatcaCredentials?.b2bEnabled, 'Raw b2cEnabled:', company.zatcaCredentials?.b2cEnabled);
        console.log('Parsed values - phase:', company.zatcaCredentials?.onboardingPhase, 'businessType:', businessType, 'b2bEnabled:', b2bEnabled, 'b2cEnabled:', b2cEnabled);

        const config = {
            phase: company.zatcaCredentials?.onboardingPhase || null,
            businessType,
            b2bEnabled,
            b2cEnabled,
            keys: company.zatcaCredentials?.configurationKeys || [],
            tluStatus: tluService.getTLUStatus(company.zatcaCredentials?.tluData?.base64Encoded),
            otpVerification: {
                verified: company.zatcaCredentials?.otpVerification?.verified || false,
                verifiedAt: company.zatcaCredentials?.otpVerification?.verifiedAt
            },
            apiVerificationStatus: company.zatcaCredentials?.apiVerificationStatus || 'not_verified',
            activeEnvironment: company.zatcaCredentials?.activeEnvironment || null,
            onboardingDetails: company.zatcaCredentials?.onboardingDetails || null
        };

        return res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Get configuration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get configuration'
        });
    }
}

/**
 * Create Configuration Key
 * POST /api/companies/:id/zatca/configuration/keys
 */
async function createConfigurationKey(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { keyType, keyName } = req.body;

        const validTypes = ['signing', 'encryption', 'authentication'];
        if (!keyType || !validTypes.includes(keyType)) {
            return res.status(400).json({
                success: false,
                message: 'Valid key type is required: signing, encryption, or authentication'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }
        if (!company.zatcaCredentials.configurationKeys) {
            company.zatcaCredentials.configurationKeys = [];
        }

        const newKey = {
            keyId: require('crypto').randomUUID(),
            keyType,
            keyName: keyName || `${keyType}-key-${Date.now()}`,
            isActive: false,
            createdAt: new Date()
        };

        company.zatcaCredentials.configurationKeys.push(newKey);
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(201).json({
            success: true,
            message: 'Configuration key created successfully',
            data: newKey
        });
    } catch (error) {
        console.error('Create configuration key error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create configuration key'
        });
    }
}

/**
 * Activate Configuration Key
 * PUT /api/companies/:id/zatca/configuration/keys/:keyId/activate
 */
async function activateConfigurationKey(req, res) {
    try {
        const { id, keyId } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const keys = company.zatcaCredentials?.configurationKeys || [];
        const keyIndex = keys.findIndex(k => k.keyId === keyId);

        if (keyIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Configuration key not found'
            });
        }

        // Deactivate all keys of the same type
        const keyType = keys[keyIndex].keyType;
        keys.forEach((k, i) => {
            if (k.keyType === keyType) {
                keys[i].isActive = false;
            }
        });

        // Activate the selected key
        keys[keyIndex].isActive = true;
        keys[keyIndex].activatedAt = new Date();

        company.zatcaCredentials.configurationKeys = keys;
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: 'Configuration key activated successfully',
            data: keys[keyIndex]
        });
    } catch (error) {
        console.error('Activate configuration key error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to activate configuration key'
        });
    }
}

/**
 * Delete Configuration Key
 * DELETE /api/companies/:id/zatca/configuration/keys/:keyId
 */
async function deleteConfigurationKey(req, res) {
    try {
        const { id, keyId } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const keys = company.zatcaCredentials?.configurationKeys || [];
        const keyIndex = keys.findIndex(k => k.keyId === keyId);

        if (keyIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Configuration key not found'
            });
        }

        if (keys[keyIndex].isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete an active key. Please activate another key first.'
            });
        }

        keys.splice(keyIndex, 1);
        company.zatcaCredentials.configurationKeys = keys;
        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: 'Configuration key deleted successfully'
        });
    } catch (error) {
        console.error('Delete configuration key error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete configuration key'
        });
    }
}

/**
 * Get Verification Status
 * GET /api/companies/:id/zatca/verification-status
 */
async function getVerificationStatus(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this company'
            });
        }

        const zatca = company.zatcaCredentials || {};
        const activeEnv = zatca.activeEnvironment;
        const currentBusinessType = zatca.currentBusinessType;
        const envCreds = activeEnv && currentBusinessType
            ? getEnvironmentCredentials(company, activeEnv, currentBusinessType)
            : null;

        // Derive b2bEnabled/b2cEnabled from whether any environment has verified status for that type
        const hasB2BVerified = ['sandbox', 'simulation', 'production'].some(env =>
            zatca.environments?.[env]?.b2b?.status === 'verified' ||
            zatca.environments?.[env]?.b2b?.productionCSID
        );
        const hasB2CVerified = ['sandbox', 'simulation', 'production'].some(env =>
            zatca.environments?.[env]?.b2c?.status === 'verified' ||
            zatca.environments?.[env]?.b2c?.productionCSID
        );

        // Prevent caching to ensure fresh data after reset
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return res.status(200).json({
            success: true,
            data: {
                b2bEnabled: hasB2BVerified,
                b2cEnabled: hasB2CVerified,
                currentBusinessType,
                apiVerificationStatus: zatca.apiVerificationStatus || 'not_verified',
                apiVerifiedAt: zatca.apiVerifiedAt,
                lastAPICheckAt: zatca.lastAPICheckAt,
                activeEnvironment: activeEnv,
                environmentStatus: envCreds?.status || 'not_started',
                otpVerified: zatca.otpVerification?.verified || false,
                tluAttached: zatca.tluData?.attachedToAPI || false,
                onboardingPhase: zatca.onboardingPhase || 'phase1_generation',
                b2bProductionLocked: zatca.progression?.b2bProductionLocked || false,
                b2cProductionLocked: zatca.progression?.b2cProductionLocked || false
            }
        });
    } catch (error) {
        console.error('Get verification status error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get verification status'
        });
    }
}

/**
 * Verify API Connection
 * POST /api/companies/:id/zatca/verify-api
 */
async function verifyAPIConnection(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        if (company.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this company'
            });
        }

        const activeEnv = company.zatcaCredentials?.activeEnvironment;
        if (!activeEnv) {
            return res.status(400).json({
                success: false,
                message: 'No active environment set. Please complete onboarding first.'
            });
        }

        const envCreds = getEnvironmentCredentials(company, activeEnv);
        if (!envCreds?.productionCSID) {
            return res.status(400).json({
                success: false,
                message: 'Production CSID not obtained. Please complete onboarding first.'
            });
        }

        // TODO: Make actual API call to ZATCA to verify credentials
        // For now, simulate successful verification
        const verificationResult = {
            success: true,
            verified: true,
            message: 'API connection verified successfully'
        };

        if (!company.zatcaCredentials) {
            company.zatcaCredentials = {};
        }

        company.zatcaCredentials.apiVerificationStatus = verificationResult.verified ? 'verified' : 'failed';
        company.zatcaCredentials.apiVerifiedAt = verificationResult.verified ? new Date() : null;
        company.zatcaCredentials.lastAPICheckAt = new Date();

        company.markModified('zatcaCredentials');
        await company.save();

        return res.status(200).json({
            success: true,
            message: verificationResult.message,
            data: {
                verified: verificationResult.verified,
                apiVerificationStatus: company.zatcaCredentials.apiVerificationStatus,
                verifiedAt: company.zatcaCredentials.apiVerifiedAt
            }
        });
    } catch (error) {
        console.error('Verify API connection error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify API connection'
        });
    }
}

// Export controller methods
module.exports = {
    generateCSR,
    getComplianceCertificate,
    submitTestInvoices,
    getProductionCSID,
    getZatcaStatus,
    skipEnvironment,
    setActiveEnvironment,
    getZatcaHistory,
    resetZatcaOnboarding,
    // New onboarding management methods
    setOnboardingPhase,
    setBusinessType,
    submitOnboardingDetails,
    getOnboardingDetails,
    generateTLU,
    getTLUStatus,
    attachTLUToAPI,
    sendOTP,
    verifyOTP,
    resendOTP,
    getConfiguration,
    createConfigurationKey,
    activateConfigurationKey,
    deleteConfigurationKey,
    getVerificationStatus,
    verifyAPIConnection
};
