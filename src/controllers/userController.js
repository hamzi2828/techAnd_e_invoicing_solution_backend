// src/controllers/userController.js
const userService = require('../services/userService');
const { getUserFromToken } = require('../../helpers/authHelper');

const userController = {

    // POST /user/signup - Create a new user (public signup)
    createUser: async (req, res) => {
        try {
            console.log("userData", req.body);
            const result = await userService.createUser(req.body);
            return res.status(201).json(result);
        } catch (error) {
            // Handle duplicate key error from unique index
            if (error && error.code === 11000) {
                return res.status(409).json({ message: 'Email already in use' });
            }
            if (error.message === 'Email already in use') {
                return res.status(409).json({ message: error.message });
            }
            res.status(400).json({ message: 'Error creating user', error: error.message });
        }
    },

    // POST /user/register - Register a new user (admin creating users)
    registerUser: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            console.log("Admin registering user:", req.body);
            console.log("Created by:", currentUser.id);

            // Add createdBy to the request body
            const userData = {
                ...req.body,
                createdBy: currentUser.id
            };

            const result = await userService.registerUser(userData);
            return res.status(201).json(result);
        } catch (error) {
            console.error('Register user error:', error);
            // Handle duplicate key error from unique index
            if (error && error.code === 11000) {
                return res.status(409).json({ message: 'Email already in use' });
            }
            if (error.message === 'Email already in use') {
                return res.status(409).json({ message: error.message });
            }
            if (error.message === 'Missing required fields') {
                return res.status(400).json({ message: error.message });
            }
            if (error.message === 'Passwords do not match') {
                return res.status(400).json({ message: error.message });
            }
            res.status(400).json({ message: 'Error registering user', error: error.message });
        }
    },

    // GET /auth/google - Start OAuth 2.0 Authorization Code flow (redirect)
    startGoogleOAuth: async (req, res) => {
        try {
            const { authUrl } = await userService.startGoogleOAuth(req.query.returnUrl);
            return res.redirect(authUrl);
        } catch (error) {
            console.error('startGoogleOAuth error:', error);
            return res.status(400).send('Failed to start Google OAuth');
        }
    },

    // GET /auth/google/callback - Handle OAuth callback, exchange code, verify ID token, login
    googleOAuthCallback: async (req, res) => {
        try {
            const { code, state, error } = req.query;
            const { redirectTo } = await userService.googleOAuthCallback(code, state, error);
            return res.redirect(redirectTo);
        } catch (error) {
            console.error('googleOAuthCallback error:', error);
            if (error.message === 'Your account has been deactivated. Please contact an administrator.') {
                // Redirect to frontend with error message
                const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
                return res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent('account_deactivated')}`);
            }
            return res.status(400).send('Failed to complete Google OAuth');
        }
    },

    // POST /user/login - Authenticate user and return JWT
    loginUser: async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await userService.loginUser(email, password);
            return res.status(200).json(result);
        } catch (error) {
            if (error.message === 'Invalid credentials') {
                return res.status(401).json({ message: error.message });
            }
            if (error.message === 'Your account has been deactivated. Please contact an administrator.') {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === 'This account uses Google login. Please sign in with Google.') {
                return res.status(401).json({ message: error.message });
            }
            if (error.message === 'Email and password are required') {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Error during login', error: error.message });
        }
    },

    // POST /user/google-login - Verify Google ID token and login or create user
    googleLoginUser: async (req, res) => {
        try {
            const { idToken } = req.body || {};
            const result = await userService.googleLoginUser(idToken);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Google login error:', error);
            if (error.message === 'idToken is required') {
                return res.status(400).json({ message: error.message });
            }
            if (error.message === 'Your account has been deactivated. Please contact an administrator.') {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === 'Server misconfiguration: missing GOOGLE_CLIENT_ID') {
                return res.status(500).json({ message: error.message });
            }
            if (error.message === 'Invalid Google token' || error.message === 'Unverified Google account') {
                return res.status(401).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error during Google login', error: error.message });
        }
    },

    // PUT /user - Update an existing user
    updateUser: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);
            console.log('Current user:', currentUser);
            console.log('Request body:', req.body);
            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
            
            const result = await userService.updateUser(currentUser.id, req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Update user error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            res.status(400).json({ 
                message: 'Error updating user', 
                error: error.message 
            });
        }
    },

    // DELETE /user - Delete a user
    deleteUser: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);
            
            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
            
            const result = await userService.deleteUser(currentUser.id);
            res.status(200).json(result);
        } catch (error) {
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            res.status(400).json({ message: 'Error deleting user', error: error.message });
        }
    },

    // GET /user/profile - Get user profile
    getUserDetailForProfile: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);
            
            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
            
            const result = await userService.getUserProfile(currentUser.id);
            res.status(200).json(result);
        } catch (error) {
            console.error('Get user details error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            res.status(400).json({ 
                message: 'Error getting user details', 
                error: error.message 
            });
        }
    },

    // GET /users - Get all users (admin only)
    getAllUsers: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const result = await userService.getAllUsers();
            res.status(200).json(result);
        } catch (error) {
            console.error('Get user details error:', error);
            res.status(400).json({
                message: 'Error getting user details',
                error: error.message
            });
        }
    },

    // GET /users/created-by-me - Get users created by the logged-in user
    getUsersCreatedByMe: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            console.log('Fetching users created by:', currentUser.id);
            const result = await userService.getUsersCreatedByMe(currentUser.id);
            res.status(200).json(result);
        } catch (error) {
            console.error('Get users created by me error:', error);
            res.status(400).json({
                message: 'Error getting users created by you',
                error: error.message
            });
        }
    },

    // GET /users/created-by-me/:userId - Get specific user by ID (only if created by logged-in user)
    getUserByIdCreatedByMe: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { userId } = req.params;

            console.log('Fetching user by ID:', userId, 'created by:', currentUser.id);
            const result = await userService.getUserByIdCreatedByMe(userId, currentUser.id);
            res.status(200).json(result);
        } catch (error) {
            console.error('Get user by ID created by me error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'You do not have permission to view this user') {
                return res.status(403).json({ message: error.message });
            }
            res.status(400).json({
                message: 'Error getting user details',
                error: error.message
            });
        }
    },

    // PUT /update/status/:id - Update a user's active status by ID
    updateUserStatusById: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { id } = req.params;
            const { isActive } = req.body;
            
            const result = await userService.updateUserStatusById(id, isActive);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update user status error:', error);
            if (error.message === 'isActive must be a boolean') {
                return res.status(400).json({ message: error.message });
            }
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error updating user status', error: error.message });
        }
    },

    // PUT /update/role/:id - Update a user's role by ID
    updateUserRoleById: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { id } = req.params;
            const { roleId } = req.body;

            if (!roleId) {
                return res.status(400).json({ message: 'roleId is required' });
            }

            const result = await userService.updateUserRoleById(id, roleId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update user role error:', error);
            if (error.message.includes('role must be one of:')) {
                return res.status(400).json({ message: error.message });
            }
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error updating user role', error: error.message });
        }
    },

    // PUT /update/company/:id - Assign a company to a user (from companies created by logged-in user)
    updateUserCompanyById: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { id } = req.params;
            const { companyId } = req.body;

            const result = await userService.updateUserCompanyById(id, companyId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Assign company to user error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'Company not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error assigning company to user', error: error.message });
        }
    },

    // DELETE /delete/:id - Delete a user by ID
    deleteUserById: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { id } = req.params;
            const result = await userService.deleteUserById(id);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Delete user error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error deleting user', error: error.message });
        }
    },

    // GET /user/appearance - Get user appearance + company default gradient
    getAppearance: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const User = require('../models/User');
            const Company = require('../models/Company');

            const user = await User.findById(currentUser.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get company default gradient
            let companyDefault = { gradientFrom: '#1b1b7f', gradientTo: '#4f46e5' };
            const companyOwnerId = user.createdBy || user._id;
            const company = await Company.findOne({ userId: companyOwnerId, isDefault: true, isDeleted: { $ne: true } });
            if (company && company.settings) {
                companyDefault = {
                    gradientFrom: company.settings.defaultGradientFrom || '#1b1b7f',
                    gradientTo: company.settings.defaultGradientTo || '#4f46e5'
                };
            }

            return res.status(200).json({
                success: true,
                data: {
                    userAppearance: user.appearance || { gradientFrom: null, gradientTo: null },
                    companyDefault
                }
            });
        } catch (error) {
            console.error('Get appearance error:', error);
            return res.status(400).json({ message: 'Error getting appearance', error: error.message });
        }
    },

    // PUT /user/appearance - Update user appearance/theme settings
    updateAppearance: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { gradientFrom, gradientTo } = req.body;
            const User = require('../models/User');
            const user = await User.findById(currentUser.id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.appearance = {
                gradientFrom: gradientFrom || null,
                gradientTo: gradientTo || null
            };

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Appearance updated successfully',
                data: { appearance: user.appearance }
            });
        } catch (error) {
            console.error('Update appearance error:', error);
            return res.status(400).json({ message: 'Error updating appearance', error: error.message });
        }
    },

    // PUT /update/password/:id - Update a user's password by ID
    updateUserPasswordById: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const currentUser = getUserFromToken(token);

            if (!currentUser) {
                return res.status(401).json({ message: 'Invalid or expired token' });
            }

            const { id } = req.params;
            const { newPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({ message: 'newPassword is required' });
            }

            const result = await userService.updateUserPasswordById(id, newPassword);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Update user password error:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === 'Password must be at least 8 characters') {
                return res.status(400).json({ message: error.message });
            }
            return res.status(400).json({ message: 'Error updating user password', error: error.message });
        }
    },
};

module.exports = userController;