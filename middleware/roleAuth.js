/**
 * Role-based authorization middleware
 */

const ROLE_IDS = {
  SUPER_ADMIN: '68bed8982bb19cac89def499',
  ADMIN: '68bed8982bb19cac89def49b',
  INVOICE_MANAGER: '68bed8982bb19cac89def49d',
  HR_MANAGER: '68bed8992bb19cac89def4a3',
  ACCOUNTANT: '68bed8992bb19cac89def49f',
  CUSTOMER_SERVICE: '68bed89a2bb19cac89def4a7',
  SALES_REP: '68bed8992bb19cac89def4a1',
  VIEWER: '68bed8992bb19cac89def4a5'
};

/**
 * Middleware to authorize specific role IDs
 * 
 * Usage examples:
 * - authorize(ROLE_IDS.ADMIN) - only admin can access
 * - authorize(ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN) - admin or super admin can access
 * - authorize(ROLE_IDS.INVOICE_MANAGER, ROLE_IDS.ACCOUNTANT) - invoice manager or accountant can access
 * 
 * @param {...string} allowedRoleIds - Role IDs that are allowed to access the route
 */
const authorize = (...allowedRoleIds) => {
  return (req, res, next) => {
    // Check if user exists (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has a role
    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'User role not found'
      });
    }
    
    // Extract user's role ID (handle both populated and non-populated role)
    const userRoleId = req.user.role._id 
      ? req.user.role._id.toString() 
      : req.user.role.toString();
    
    // Check if user's role is in the allowed roles list
    if (!allowedRoleIds.includes(userRoleId)) {
      // Get role name for better error message
      const roleName = req.user.role.name || 'Unknown';
      
      // Build list of required role names for error message
      const allowedRoleNames = Object.entries(ROLE_IDS)
        .filter(([_, id]) => allowedRoleIds.includes(id))
        .map(([name]) => name.replace(/_/g, ' ').toLowerCase())
        .join(', ');
      
      return res.status(403).json({
        success: false,
        message: `Access denied. User role '${roleName}' is not authorized. Required roles: ${allowedRoleNames}`
      });
    }
    
    // User has one of the allowed roles, proceed to next middleware
    next();
  };
};

/**
 * Utility function to check if user has a specific role
 * Can be used in controllers for conditional logic
 */
const hasRole = (user, roleId) => {
  if (!user || !user.role) return false;
  const userRoleId = user.role._id 
    ? user.role._id.toString() 
    : user.role.toString();
  return userRoleId === roleId;
};

/**
 * Utility function to check if user is admin or super admin
 * Can be used in controllers for conditional logic
 */
const isAdmin = (user) => {
  if (!user || !user.role) return false;
  const userRoleId = user.role._id 
    ? user.role._id.toString() 
    : user.role.toString();
  return userRoleId === ROLE_IDS.SUPER_ADMIN || userRoleId === ROLE_IDS.ADMIN;
};

/**
 * Utility function to check if user is super admin
 * Can be used in controllers for conditional logic
 */
const isSuperAdmin = (user) => {
  return hasRole(user, ROLE_IDS.SUPER_ADMIN);
};

module.exports = {
  ROLE_IDS,
  authorize,
  hasRole,
  isAdmin,
  isSuperAdmin
};