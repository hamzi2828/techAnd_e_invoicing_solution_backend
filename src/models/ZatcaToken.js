// src/models/ZatcaToken.js
const mongoose = require('mongoose');

/**
 * ZATCA OAuth Token Model
 * Stores OAuth2 access tokens for ZATCA API authentication
 * Singleton pattern - only one active token at a time
 */
const zatcaTokenSchema = new mongoose.Schema({
    // Token identifier (singleton key)
    tokenKey: {
        type: String,
        default: 'zatca_oauth_token',
        unique: true,
        required: true
    },

    // OAuth2 access token
    accessToken: {
        type: String,
        required: true
    },

    // Token type (usually "Bearer")
    tokenType: {
        type: String,
        default: 'Bearer'
    },

    // Token expiration timestamp
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    // Token lifetime in seconds (from OAuth response)
    expiresIn: {
        type: Number,
        required: true
    },

    // Scope granted for the token
    scope: {
        type: String,
        required: true
    },

    // Client ID used to obtain the token
    clientId: {
        type: String,
        required: true
    },

    // Token generation metadata
    metadata: {
        // When the token was generated
        generatedAt: {
            type: Date,
            default: Date.now
        },
        // How many times this token was refreshed
        refreshCount: {
            type: Number,
            default: 0
        },
        // Last time the token was used for an API call
        lastUsedAt: {
            type: Date,
            default: null
        },
        // IP address or server identifier that generated the token
        generatedBy: {
            type: String,
            default: null
        }
    },

    // Token status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick token lookup
zatcaTokenSchema.index({ tokenKey: 1, isActive: 1 });

/**
 * Check if token is expired
 * @param {number} bufferSeconds - Buffer time before actual expiry (default 60 seconds)
 * @returns {boolean} - True if token is expired or will expire within buffer time
 */
zatcaTokenSchema.methods.isExpired = function(bufferSeconds = 60) {
    if (!this.expiresAt) return true;
    const bufferMs = bufferSeconds * 1000;
    return Date.now() >= (this.expiresAt.getTime() - bufferMs);
};

/**
 * Get remaining validity in seconds
 * @returns {number} - Seconds until token expires (can be negative if expired)
 */
zatcaTokenSchema.methods.getRemainingSeconds = function() {
    if (!this.expiresAt) return 0;
    return Math.floor((this.expiresAt.getTime() - Date.now()) / 1000);
};

/**
 * Update last used timestamp
 * @returns {Promise<void>}
 */
zatcaTokenSchema.methods.markAsUsed = async function() {
    this.metadata.lastUsedAt = new Date();
    await this.save();
};

/**
 * Static method to get or create singleton token document
 * @returns {Promise<Document>} - Token document
 */
zatcaTokenSchema.statics.getTokenDocument = async function() {
    let token = await this.findOne({ tokenKey: 'zatca_oauth_token', isActive: true });
    return token;
};

/**
 * Static method to save new token
 * @param {Object} tokenData - Token data from OAuth response
 * @param {string} tokenData.access_token - Access token string
 * @param {string} tokenData.token_type - Token type (Bearer)
 * @param {number} tokenData.expires_in - Expiry in seconds
 * @param {string} tokenData.scope - Token scope
 * @param {string} clientId - Client ID used
 * @returns {Promise<Document>} - Saved token document
 */
zatcaTokenSchema.statics.saveToken = async function(tokenData, clientId) {
    // Ensure expires_in is a valid number, default to 3600 seconds (1 hour)
    const expiresInSeconds = parseInt(tokenData.expires_in, 10) || 3600;
    const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));

    // Upsert to ensure singleton pattern
    const token = await this.findOneAndUpdate(
        { tokenKey: 'zatca_oauth_token' },
        {
            $set: {
                accessToken: tokenData.access_token,
                tokenType: tokenData.token_type || 'Bearer',
                expiresAt: expiresAt,
                expiresIn: expiresInSeconds,
                scope: tokenData.scope || '',
                clientId: clientId,
                isActive: true,
                'metadata.generatedAt': new Date(),
                'metadata.generatedBy': process.env.HOSTNAME || 'api-server'
            },
            $inc: { 'metadata.refreshCount': 1 }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );

    return token;
};

/**
 * Static method to invalidate current token
 * @returns {Promise<void>}
 */
zatcaTokenSchema.statics.invalidateToken = async function() {
    await this.updateOne(
        { tokenKey: 'zatca_oauth_token' },
        { $set: { isActive: false } }
    );
};

/**
 * Static method to get token statistics
 * @returns {Promise<Object>} - Token stats
 */
zatcaTokenSchema.statics.getTokenStats = async function() {
    const token = await this.findOne({ tokenKey: 'zatca_oauth_token' });
    if (!token) {
        return {
            exists: false,
            isActive: false,
            isExpired: true,
            remainingSeconds: 0,
            refreshCount: 0
        };
    }

    return {
        exists: true,
        isActive: token.isActive,
        isExpired: token.isExpired(),
        remainingSeconds: token.getRemainingSeconds(),
        refreshCount: token.metadata.refreshCount,
        lastUsedAt: token.metadata.lastUsedAt,
        generatedAt: token.metadata.generatedAt
    };
};

module.exports = mongoose.model('ZatcaToken', zatcaTokenSchema);
