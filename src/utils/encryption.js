// src/utils/encryption.js
const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Must be 32 characters

// Ensure encryption key is 32 characters
if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
}

/**
 * Encrypts text using AES-256-CBC encryption
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
    if (!text) {
        return '';
    }

    try {
        // Generate random initialization vector
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv(
            ALGORITHM,
            Buffer.from(ENCRYPTION_KEY),
            iv
        );

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return iv and encrypted data separated by colon
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts text that was encrypted with encrypt() function
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
    if (!encryptedText) {
        return '';
    }

    try {
        // Split iv and encrypted data
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];

        // Create decipher
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            Buffer.from(ENCRYPTION_KEY),
            iv
        );

        // Decrypt the data
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Hashes text using SHA-256
 * @param {string} text - Text to hash
 * @returns {string} - Hashed text in hex format
 */
function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generates a random token
 * @param {number} length - Length of the token in bytes (default 32)
 * @returns {string} - Random token in hex format
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Validates if text can be decrypted (useful for testing)
 * @param {string} encryptedText - Encrypted text to validate
 * @returns {boolean} - True if can be decrypted, false otherwise
 */
function canDecrypt(encryptedText) {
    try {
        decrypt(encryptedText);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    generateToken,
    canDecrypt
};
