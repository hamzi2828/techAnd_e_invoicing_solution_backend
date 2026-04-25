// helpers/authHelper.js
const jwt = require('jsonwebtoken');

/**
 * Extracts user information from JWT token
 * @param {string} token - JWT token from Authorization header
 * @returns {Object|null} User object or null if invalid token
 */
function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      return null;
    }
    
    // Verify and decode the token
    const decoded = jwt.verify(tokenValue, secret);
    
    // Return only the user information we need
    return {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role
    };
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: user.role && user.role._id ? user.role._id.toString() : user.role ? user.role.toString() : null
  };

  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    return jwt.verify(tokenValue, secret);
  } catch (error) {
    return null;
  }
}

module.exports = {
  getUserFromToken,
  generateToken,
  verifyToken
};