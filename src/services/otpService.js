// src/services/otpService.js
// OTP Service for SMS-based verification during ZATCA onboarding

const crypto = require('crypto');

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Rate limiting configuration
const RATE_LIMIT = {
    maxAttempts: 5,
    cooldownSeconds: 60,
    otpExpiryMinutes: 10
};

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Get OTP record for a company
 */
function getOTPRecord(companyId) {
    return otpStore.get(companyId) || null;
}

/**
 * Check if company is in cooldown period
 */
function isInCooldown(companyId) {
    const record = getOTPRecord(companyId);
    if (!record || !record.cooldownUntil) return false;
    return new Date() < new Date(record.cooldownUntil);
}

/**
 * Get remaining cooldown time in seconds
 */
function getCooldownRemaining(companyId) {
    const record = getOTPRecord(companyId);
    if (!record || !record.cooldownUntil) return 0;
    const remaining = Math.ceil((new Date(record.cooldownUntil) - new Date()) / 1000);
    return Math.max(0, remaining);
}

/**
 * Send OTP to phone number
 * @param {string} companyId - Company ID
 * @param {string} phoneNumber - Phone number to send OTP to
 * @returns {Promise<{success: boolean, message: string, expiresAt?: Date}>}
 */
async function sendOTP(companyId, phoneNumber) {
    // Check cooldown
    if (isInCooldown(companyId)) {
        const remaining = getCooldownRemaining(companyId);
        return {
            success: false,
            message: `Please wait ${remaining} seconds before requesting a new OTP`,
            cooldownRemaining: remaining
        };
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + RATE_LIMIT.otpExpiryMinutes * 60 * 1000);

    // Store OTP record
    const record = getOTPRecord(companyId) || {
        attemptsCount: 0,
        cooldownUntil: null
    };

    record.otp = otp;
    record.phoneNumber = phoneNumber;
    record.expiresAt = expiresAt;
    record.createdAt = new Date();
    record.verified = false;

    otpStore.set(companyId, record);

    // TODO: Integrate with SMS provider (Twilio, MessageBird, etc.)
    // For now, we'll simulate sending SMS
    console.log(`[OTP Service] Sending OTP ${otp} to ${phoneNumber} for company ${companyId}`);

    // In production, integrate with SMS gateway:
    // await smsProvider.send(phoneNumber, `Your ZATCA verification code is: ${otp}. Valid for ${RATE_LIMIT.otpExpiryMinutes} minutes.`);

    return {
        success: true,
        message: `OTP sent to ${maskPhoneNumber(phoneNumber)}`,
        expiresAt,
        // For development/testing only - remove in production
        ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
    };
}

/**
 * Verify OTP
 * @param {string} companyId - Company ID
 * @param {string} otp - OTP to verify
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function verifyOTP(companyId, otp) {
    const record = getOTPRecord(companyId);

    // Check if OTP exists
    if (!record || !record.otp) {
        return {
            success: false,
            message: 'No OTP found. Please request a new one.'
        };
    }

    // Check if in cooldown due to too many attempts
    if (isInCooldown(companyId)) {
        const remaining = getCooldownRemaining(companyId);
        return {
            success: false,
            message: `Too many attempts. Please wait ${remaining} seconds.`,
            cooldownRemaining: remaining
        };
    }

    // Check if OTP expired
    if (new Date() > new Date(record.expiresAt)) {
        return {
            success: false,
            message: 'OTP has expired. Please request a new one.'
        };
    }

    // Verify OTP
    if (record.otp !== otp) {
        record.attemptsCount = (record.attemptsCount || 0) + 1;

        // Check if max attempts reached
        if (record.attemptsCount >= RATE_LIMIT.maxAttempts) {
            record.cooldownUntil = new Date(Date.now() + RATE_LIMIT.cooldownSeconds * 1000);
            record.attemptsCount = 0;
            otpStore.set(companyId, record);
            return {
                success: false,
                message: `Too many failed attempts. Please wait ${RATE_LIMIT.cooldownSeconds} seconds.`,
                cooldownRemaining: RATE_LIMIT.cooldownSeconds
            };
        }

        otpStore.set(companyId, record);
        return {
            success: false,
            message: `Invalid OTP. ${RATE_LIMIT.maxAttempts - record.attemptsCount} attempts remaining.`,
            attemptsRemaining: RATE_LIMIT.maxAttempts - record.attemptsCount
        };
    }

    // OTP verified successfully
    record.verified = true;
    record.verifiedAt = new Date();
    record.otp = null; // Clear OTP after successful verification
    record.attemptsCount = 0;
    otpStore.set(companyId, record);

    return {
        success: true,
        message: 'Phone number verified successfully'
    };
}

/**
 * Resend OTP
 * @param {string} companyId - Company ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function resendOTP(companyId) {
    const record = getOTPRecord(companyId);

    if (!record || !record.phoneNumber) {
        return {
            success: false,
            message: 'No previous OTP request found. Please start a new verification.'
        };
    }

    // Check cooldown
    if (isInCooldown(companyId)) {
        const remaining = getCooldownRemaining(companyId);
        return {
            success: false,
            message: `Please wait ${remaining} seconds before requesting a new OTP`,
            cooldownRemaining: remaining
        };
    }

    // Send new OTP to the same phone number
    return sendOTP(companyId, record.phoneNumber);
}

/**
 * Get OTP verification status
 * @param {string} companyId - Company ID
 * @returns {{verified: boolean, phoneNumber?: string, verifiedAt?: Date}}
 */
function getVerificationStatus(companyId) {
    const record = getOTPRecord(companyId);

    if (!record) {
        return { verified: false };
    }

    return {
        verified: record.verified || false,
        phoneNumber: record.phoneNumber ? maskPhoneNumber(record.phoneNumber) : null,
        verifiedAt: record.verifiedAt || null,
        hasActiveOTP: !!record.otp && new Date() < new Date(record.expiresAt),
        cooldownRemaining: getCooldownRemaining(companyId)
    };
}

/**
 * Clear OTP record for a company (used when resetting onboarding)
 * @param {string} companyId - Company ID
 */
function clearOTPRecord(companyId) {
    otpStore.delete(companyId);
}

/**
 * Mask phone number for display
 */
function maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
    const lastFour = phoneNumber.slice(-4);
    return `****${lastFour}`;
}

module.exports = {
    sendOTP,
    verifyOTP,
    resendOTP,
    getVerificationStatus,
    clearOTPRecord,
    isInCooldown,
    getCooldownRemaining,
    RATE_LIMIT
};
