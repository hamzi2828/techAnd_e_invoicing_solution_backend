// src/services/tluService.js
// TLU (Token Lifecycle Unit) Service for ZATCA e-invoicing

const crypto = require('crypto');

// TLU token expiry (24 hours by default)
const TLU_EXPIRY_HOURS = 24;

/**
 * Generate a TLU token
 * @param {Object} params - Token generation parameters
 * @param {string} params.companyId - Company ID
 * @param {string} params.vatNumber - VAT number
 * @param {string} params.environment - ZATCA environment
 * @returns {Object} TLU token data
 */
function generateTLUToken(params) {
    const { companyId, vatNumber, environment } = params;

    // Generate unique token ID
    const tokenId = crypto.randomUUID();
    const timestamp = Date.now();

    // Create token payload
    const payload = {
        tokenId,
        companyId,
        vatNumber,
        environment,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(timestamp + TLU_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
        version: '1.0'
    };

    // Generate signature for token integrity
    const signature = generateSignature(payload);
    payload.signature = signature;

    // Create the raw token string
    const tokenString = JSON.stringify(payload);

    // Base64 encode the token
    const base64Encoded = Buffer.from(tokenString).toString('base64');

    return {
        tokenId,
        token: tokenString,
        base64Encoded,
        generatedAt: payload.generatedAt,
        expiresAt: payload.expiresAt,
        environment,
        attachedToAPI: false
    };
}

/**
 * Generate signature for token integrity
 */
function generateSignature(payload) {
    const dataToSign = `${payload.tokenId}:${payload.companyId}:${payload.vatNumber}:${payload.generatedAt}`;
    return crypto.createHash('sha256').update(dataToSign).digest('hex');
}

/**
 * Validate a TLU token
 * @param {string} base64Token - Base64 encoded token
 * @returns {Object} Validation result
 */
function validateTLUToken(base64Token) {
    try {
        // Decode Base64
        const tokenString = Buffer.from(base64Token, 'base64').toString('utf-8');
        const payload = JSON.parse(tokenString);

        // Check required fields
        if (!payload.tokenId || !payload.companyId || !payload.expiresAt) {
            return {
                valid: false,
                error: 'Invalid token format: missing required fields'
            };
        }

        // Check expiry
        if (new Date() > new Date(payload.expiresAt)) {
            return {
                valid: false,
                error: 'Token has expired',
                expiredAt: payload.expiresAt
            };
        }

        // Verify signature
        const expectedSignature = generateSignature({
            tokenId: payload.tokenId,
            companyId: payload.companyId,
            vatNumber: payload.vatNumber,
            generatedAt: payload.generatedAt
        });

        if (payload.signature !== expectedSignature) {
            return {
                valid: false,
                error: 'Invalid token signature'
            };
        }

        return {
            valid: true,
            payload,
            expiresAt: payload.expiresAt,
            remainingHours: Math.max(0, (new Date(payload.expiresAt) - new Date()) / (1000 * 60 * 60))
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Failed to parse token: ' + error.message
        };
    }
}

/**
 * Refresh a TLU token (generate new one with extended expiry)
 * @param {string} base64Token - Existing Base64 encoded token
 * @returns {Object} New TLU token data or error
 */
function refreshTLUToken(base64Token) {
    const validation = validateTLUToken(base64Token);

    if (!validation.valid) {
        // If token is invalid/expired, cannot refresh
        return {
            success: false,
            error: validation.error
        };
    }

    // Generate new token with same company details
    const newToken = generateTLUToken({
        companyId: validation.payload.companyId,
        vatNumber: validation.payload.vatNumber,
        environment: validation.payload.environment
    });

    return {
        success: true,
        ...newToken,
        previousTokenId: validation.payload.tokenId
    };
}

/**
 * Attach TLU token to API request headers
 * @param {Object} headers - Request headers object
 * @param {string} base64Token - Base64 encoded TLU token
 * @returns {Object} Headers with TLU token attached
 */
function attachToAPIHeaders(headers, base64Token) {
    return {
        ...headers,
        'X-TLU-Token': base64Token,
        'X-TLU-Version': '1.0'
    };
}

/**
 * Get TLU token status
 * @param {string} base64Token - Base64 encoded token
 * @returns {Object} Token status information
 */
function getTLUStatus(base64Token) {
    if (!base64Token) {
        return {
            hasToken: false,
            status: 'not_generated'
        };
    }

    const validation = validateTLUToken(base64Token);

    if (!validation.valid) {
        return {
            hasToken: true,
            status: 'invalid',
            error: validation.error
        };
    }

    const remainingHours = validation.remainingHours;

    let status = 'valid';
    if (remainingHours < 1) {
        status = 'expiring_soon';
    } else if (remainingHours < 6) {
        status = 'expiring';
    }

    return {
        hasToken: true,
        status,
        tokenId: validation.payload.tokenId,
        environment: validation.payload.environment,
        generatedAt: validation.payload.generatedAt,
        expiresAt: validation.payload.expiresAt,
        remainingHours: Math.round(remainingHours * 100) / 100,
        attachedToAPI: validation.payload.attachedToAPI || false
    };
}

/**
 * Create TLU data for storage in database
 * @param {Object} tokenData - Generated token data
 * @returns {Object} Data structure for database storage
 */
function createTLUStorageData(tokenData) {
    return {
        token: tokenData.token,
        base64Encoded: tokenData.base64Encoded,
        tokenId: tokenData.tokenId,
        generatedAt: new Date(tokenData.generatedAt),
        expiresAt: new Date(tokenData.expiresAt),
        environment: tokenData.environment,
        attachedToAPI: false,
        attachedAt: null
    };
}

module.exports = {
    generateTLUToken,
    validateTLUToken,
    refreshTLUToken,
    attachToAPIHeaders,
    getTLUStatus,
    createTLUStorageData,
    TLU_EXPIRY_HOURS
};
