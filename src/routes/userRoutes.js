// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const planInfoController = require('../controllers/planInfoController');
const { protect } = require('../../middleware/auth');
const { attachPlan } = require('../../middleware/planMiddleware');
// Example: Import role middleware when you need it
// const { authorize, ROLE_IDS } = require('../middleware/roleAuth');

// Public routes (no authentication required)
router.post('/user/login', userController.loginUser);
router.post('/user/signup', userController.createUser);
router.post('/user/google-login', userController.googleLoginUser);

// Google OAuth 2.0 redirect flow
router.get('/auth/google', userController.startGoogleOAuth);
router.get('/auth/google/callback', userController.googleOAuthCallback);

// Protected routes (authentication required)
router.get('/users/created-by-me', protect, userController.getUsersCreatedByMe);
router.get('/users/created-by-me/:userId', protect, userController.getUserByIdCreatedByMe);
router.post('/user/register/created-by-me', protect, userController.registerUser);
router.put('/user/update', protect, userController.updateUser);
router.put('/user/profile/update', protect, userController.updateUser);
router.put('/user/appearance', protect, userController.updateAppearance);
router.get('/user/appearance', protect, userController.getAppearance);
router.delete('/user/delete', protect, userController.deleteUser);
router.get('/user/profile', protect, userController.getUserDetailForProfile);
router.get('/users/all', protect, userController.getAllUsers);

// Admin operations by ID - created-by-me pattern
// Example: You can add role authorization like this:
// router.put('/user/update/status/:id', protect, authorize(ROLE_IDS.ADMIN, ROLE_IDS.SUPER_ADMIN), userController.updateUserStatusById);
router.put('/user/update/status/:id/created-by-me', protect, userController.updateUserStatusById);
router.put('/user/update/role/:id/created-by-me', protect, userController.updateUserRoleById);
router.put('/user/update/company/:id/created-by-me', protect, userController.updateUserCompanyById);
router.put('/user/update/password/:id/created-by-me', protect, userController.updateUserPasswordById);
router.delete('/user/delete/:id/created-by-me', protect, userController.deleteUserById);

// Plan info routes (requires authentication and plan middleware)
router.get('/api/user/plan-info', protect, attachPlan, planInfoController.getPlanInfo);
router.get('/api/user/usage-history', protect, attachPlan, planInfoController.getUsageHistory);
router.get('/api/user/can-create/:resourceType', protect, attachPlan, planInfoController.checkCanCreate);
router.get('/api/user/has-feature/:featureName', protect, attachPlan, planInfoController.checkHasFeature);
router.get('/api/user/features', protect, attachPlan, planInfoController.getFeatures);

module.exports = router;