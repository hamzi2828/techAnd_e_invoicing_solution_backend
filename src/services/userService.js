const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateToken } = require('../../helpers/authHelper');

const userService = {
  // User Registration Service
  async createUser(userData) {
    const { firstName, lastName, email, password, confirmPassword, role } = userData;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required fields');
    }

    // Optional: enforce password confirmation if provided
    if (typeof confirmPassword !== 'undefined' && password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error('Email already in use');
    }

    // Create user (password hashing handled by pre-save middleware)
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role,
    });

    // Return sanitized user data
    const { password: _pw, ...safe } = user.toObject();
    return { message: 'User created successfully', data: safe };
  },

  // Google OAuth Start Service
  async startGoogleOAuth(returnUrl) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      throw new Error('Server misconfiguration: missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
    }

    const scope = encodeURIComponent('openid email profile');
    const state = encodeURIComponent(returnUrl || '/');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&include_granted_scopes=true&prompt=consent&state=${state}`;

    return { authUrl };
  },

  // Google OAuth Callback Service
  async googleOAuthCallback(code, state, error) {
    if (error) {
      throw new Error(`Google OAuth error: ${error}`);
    }
    if (!code) {
      throw new Error('Missing authorization code');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Server misconfiguration: missing Google OAuth envs');
    }

    const oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauthClient.getToken({ code, redirect_uri: redirectUri });
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error('No ID token returned by Google');
    }

    const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid Google ID token');
    }

    const {
      sub: googleId,
      email,
      given_name: givenName,
      family_name: familyName,
      picture,
      email_verified: emailVerified,
      role_id: roleId,
    } = payload;

    if (!email || !emailVerified) {
      throw new Error('Unverified Google account');
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Upsert user by email
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Get default role for new Google users
      let defaultRoleId = null;
      try {
        const Role = require('../models/Role');
        // Try to find the same role used for regular signups (New_User_Role)
        const defaultRole = await Role.findById('68bedb7fff7fc8961da7a3f8') ||
                           await Role.findOne({ name: /^user$/i }) ||
                           await Role.findOne({ name: /^viewer$/i }) ||
                           await Role.findOne().sort({ _id: 1 }).limit(1); // Fallback to first available role

        if (defaultRole) {
          defaultRoleId = defaultRole._id;
        } else {
          throw new Error('Server configuration error: No default role available for new users');
        }
      } catch (roleError) {
        throw new Error('Failed to assign role to new user');
      }

      user = await User.create({
        firstName: givenName || 'Google',
        lastName: familyName || 'User',
        email: normalizedEmail,
        password: null,
        provider: 'google',
        googleId: googleId || null,
        avatarUrl: picture || null,
        role: defaultRoleId,
      });
    } else {
      // Check if existing user account is active
      if (user.isActive === false) {
        throw new Error('Your account has been deactivated. Please contact an administrator.');
      }

      const updates = {};
      if (!user.googleId && googleId) updates.googleId = googleId;
      if (user.provider !== 'google') updates.provider = 'google';
      if (picture && user.avatarUrl !== picture) updates.avatarUrl = picture;
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        user = await User.findById(user._id);
      }
    }

    const token = generateToken(user);

    user.lastLogin = new Date();
    await user.save();

    const returnUrl = decodeURIComponent(state || '/') || '/';
    const redirectTo = `${frontendOrigin}${returnUrl.startsWith('/') ? returnUrl : '/'}?token=${encodeURIComponent(token)}`;

    return { redirectTo, token, user };
  },

  // User Login Service
  async loginUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user account is active
    if (user.isActive === false) {
      throw new Error('Your account has been deactivated. Please contact an administrator.');
    }

    // Prevent password login for accounts created via Google
    if (!user.password) {
      throw new Error('This account uses Google login. Please sign in with Google.');
    }

    const match = await user.matchPassword(password);
    if (!match) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user);

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    const { password: _pw, ...safe } = user.toObject();
    return { message: 'Login successful', token, data: safe };
  },

  // Google Login Service
  async googleLoginUser(idToken) {
    if (!idToken) {
      throw new Error('idToken is required');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Server misconfiguration: missing GOOGLE_CLIENT_ID');
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid Google token');
    }

    const {
      sub: googleId,
      email,
      given_name: givenName,
      family_name: familyName,
      picture,
      email_verified: emailVerified,
    } = payload;

    if (!email || !emailVerified) {
      throw new Error('Unverified Google account');
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Upsert user by email
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Get default role for new Google users (same logic as OAuth callback)
      let defaultRoleId = null;
      try {
        const Role = require('../models/Role');
        // Try to find the same role used for regular signups (New_User_Role)
        const defaultRole = await Role.findById('68bedb7fff7fc8961da7a3f8') ||
                           await Role.findOne({ name: /^user$/i }) ||
                           await Role.findOne({ name: /^viewer$/i }) ||
                           await Role.findOne().sort({ _id: 1 }).limit(1); // Fallback to first available role

        if (defaultRole) {
          defaultRoleId = defaultRole._id;
        } else {
          throw new Error('Server configuration error: No default role available for new users');
        }
      } catch (roleError) {
        throw new Error('Failed to assign role to new user');
      }

      user = await User.create({
        firstName: givenName || 'Google',
        lastName: familyName || 'User',
        email: normalizedEmail,
        password: null,
        provider: 'google',
        googleId: googleId || null,
        avatarUrl: picture || null,
        role: defaultRoleId,
      });
    } else {
      // Check if existing user account is active
      if (user.isActive === false) {
        throw new Error('Your account has been deactivated. Please contact an administrator.');
      }

      // Update linkage if necessary
      const updates = {};
      if (!user.googleId && googleId) updates.googleId = googleId;
      if (user.provider !== 'google') updates.provider = 'google';
      if (picture && user.avatarUrl !== picture) updates.avatarUrl = picture;
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        user = await User.findById(user._id);
      }
    }

    const token = generateToken(user);

    user.lastLogin = new Date();
    await user.save();

    const { password: _pw, ...safe } = user.toObject();
    return { message: 'Login successful', token, data: safe };
  },

  // Update User Service
  async updateUser(userId, userData) {
    // Prevent updating sensitive fields
    const { password, ...safeUpdates } = userData;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = updatedUser.toObject();
    
    return { 
      message: 'User updated successfully', 
      data: userWithoutPassword 
    };
  },

  // Delete User Service
  async deleteUser(userId) {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new Error('User not found');
    }
    return { message: 'User deleted successfully', id: userId };
  },

  // Get User Profile Service
  async getUserProfile(userId) {
    try {
      // Populate the role with permissions when fetching user profile
      const user = await User.findById(userId)
        .populate({
          path: 'role',
          populate: {
            path: 'permissions',
            select: 'id name description category resource action'
          }
        });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive data from response
      const { password: _, ...userWithoutPassword } = user.toObject();

      return {
        message: 'User details retrieved successfully',
        data: userWithoutPassword
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Get All Users Service
  async getAllUsers() {
    try {
      // Populate the role details and current plan when fetching users
      const users = await User.find()
        .populate('role')
        .populate('currentPlanId', 'name monthlyPrice yearlyPrice currency');

      // Remove sensitive data from each user in the array
      const usersWithoutPasswords = users.map(user => {
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        return userWithoutPassword;
      });

      return {
        success: true,
        message: 'Users details retrieved successfully',
        users: usersWithoutPasswords
      };
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  },

  // Get Users Created By Me Service
  async getUsersCreatedByMe(currentUserId) {
    try {
      // Find only users created by the current user, and populate role and createdBy details
      const users = await User.find({ createdBy: currentUserId })
        .populate('role')
        .populate('createdBy', 'firstName lastName email');

      // Remove sensitive data from each user in the array
      const usersWithoutPasswords = users.map(user => {
        const userObject = user.toObject();
        const { password, ...userWithoutPassword } = userObject;
        return userWithoutPassword;
      });

      console.log(`Found ${usersWithoutPasswords.length} users created by user ${currentUserId}`);

      return {
        message: 'Users created by you retrieved successfully',
        data: usersWithoutPasswords
      };
    } catch (error) {
      console.error('Error fetching users created by me:', error);
      throw error;
    }
  },

  // Get Specific User By ID Created By Me Service
  async getUserByIdCreatedByMe(userId, currentUserId) {
    try {
      // Find user by ID and ensure it was created by the current user
      const user = await User.findOne({
        _id: userId,
        createdBy: currentUserId
      })
        .populate('role')
        .populate('assignedCompanyId') // Populate assigned company
        .populate('createdBy', 'firstName lastName email');

      if (!user) {
        // Check if user exists at all
        const userExists = await User.findById(userId);
        if (!userExists) {
          throw new Error('User not found');
        }
        // User exists but wasn't created by current user
        throw new Error('You do not have permission to view this user');
      }

      // Remove sensitive data
      const userObject = user.toObject();
      const { password, ...userWithoutPassword } = userObject;

      console.log(`Retrieved user ${userId} created by user ${currentUserId}`);

      return {
        message: 'User retrieved successfully',
        data: userWithoutPassword
      };
    } catch (error) {
      console.error('Error fetching user by ID created by me:', error);
      throw error;
    }
  },

  // Update User Status Service
  async updateUserStatusById(userId, isActive) {
    if (typeof isActive !== 'boolean') {
      throw new Error('isActive must be a boolean');
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true }
    );

    if (!updated) {
      throw new Error('User not found');
    }

    const { password: _pw, ...safe } = updated.toObject();
    return { message: 'Status updated successfully', data: safe };
  },

  // Update User Role Service
  async updateUserRoleById(userId, roleId) {
    try {
      const Role = require('../models/Role');
      
      // First, validate that the role ID exists in the roles collection
      const roleExists = await Role.findById(roleId);
      
      if (!roleExists) {
        // If role doesn't exist, get available roles for error message
        const availableRoles = await Role.find({}, 'name').lean();
        const roleNames = availableRoles.map(r => r.name);
        throw new Error(`Invalid role ID. Available roles: ${roleNames.join(', ')}`);
      }

      console.log('Updating user role:', { userId, roleId, roleName: roleExists.name });

      // Update the user with the role ID
      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: { role: roleId } }, // Store the role ID as reference
        { new: true, runValidators: true }
      ).populate('role'); // Populate the role details for the response

      if (!updated) {
        throw new Error('User not found');
      }

      const { password: _pw, ...safe } = updated.toObject();
      return { message: 'Role updated successfully', data: safe };

    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  },

  // Update User's Assigned Company Service
  async updateUserCompanyById(userId, companyId) {
    try {
      // If companyId is provided (not null), validate it exists
      if (companyId) {
        const Company = require('../models/Company');
        const companyExists = await Company.findById(companyId);

        if (!companyExists) {
          throw new Error('Company not found');
        }

        console.log('Assigning company to user:', { userId, companyId, companyName: companyExists.companyName });
      } else {
        console.log('Removing company assignment from user:', userId);
      }

      // Update the user with the assigned company ID (or null to remove assignment)
      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: { assignedCompanyId: companyId || null } },
        { new: true, runValidators: true }
      ).populate('assignedCompanyId'); // Populate the assigned company details

      if (!updated) {
        throw new Error('User not found');
      }

      const { password: _pw, ...safe } = updated.toObject();
      return { message: 'Assigned company updated successfully', data: safe };

    } catch (error) {
      console.error('Update user assigned company error:', error);
      throw error;
    }
  },

  // Delete User By ID Service
  async deleteUserById(userId) {
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully', id: userId };
  },

  // Update User Password By ID Service
  async updateUserPasswordById(userId, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Set the plain password - pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  },

  // Register User Service (Admin creating users)
  async registerUser(userData) {
    const { firstName, lastName, email, password, confirmPassword, role, companyId, createdBy, phone, isActive } = userData;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required fields');
    }

    // Enforce password confirmation
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new Error('Email already in use');
    }

    // Validate role if provided
    if (role) {
      const Role = require('../models/Role');
      const roleExists = await Role.findById(role);
      if (!roleExists) {
        throw new Error('Invalid role ID');
      }
    }

    // Validate company if provided (assign company to user)
    if (companyId) {
      const Company = require('../models/Company');
      const companyExists = await Company.findById(companyId);
      if (!companyExists) {
        throw new Error('Invalid company ID');
      }
    }

    // Create user (password hashing handled by pre-save middleware)
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role,
      assignedCompanyId: companyId || null, // Assign company to user
      phone: phone || null,
      createdBy: createdBy || null,
      isActive: typeof isActive !== 'undefined' ? isActive : true,
    });

    // Populate role, assignedCompanyId and createdBy for response
    await user.populate('role');
    if (user.assignedCompanyId) {
      await user.populate('assignedCompanyId');
    }
    if (user.createdBy) {
      await user.populate('createdBy', 'firstName lastName email');
    }

    // Return sanitized user data
    const { password: _pw, ...safe } = user.toObject();
    return { message: 'User registered successfully', data: safe };
  },
};

module.exports = userService;