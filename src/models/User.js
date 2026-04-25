const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: false,
    default: null,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: {
    type: String,
    default: null,
    index: true
  },
  avatarUrl: {
    type: String,
    default: null
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  bio: {
    type: String,
    trim: true
  },
  // Legacy field - keeping for backward compatibility (free text company name)
  company: {
    type: String,
    trim: true
  },
  // Company ID assigned to this user by their creator
  assignedCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Payment gateway customer identifier (legacy: stripeCustomerId)
  paymentCustomerId: {
    type: String,
    default: null,
    index: true
  },
  // Current subscription status
  subscriptionStatus: {
    type: String,
    enum: ['none', 'active', 'canceled', 'past_due', 'trialing'],
    default: 'none'
  },
  // Current payment plan
  currentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // Appearance / theme preferences
  appearance: {
    gradientFrom: {
      type: String,
      default: null
    },
    gradientTo: {
      type: String,
      default: null
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Pre-save middleware to set default role
userSchema.pre('save', async function(next) {
  // Set default role if not provided
  if (!this.role && this.isNew) {
    try {
      const Role = mongoose.model('Role');
      const defaultRole = await Role.findOne({ name: /^user$/i });
      if (defaultRole) {
        this.role = defaultRole._id;
      }
    } catch (error) {
      console.error('Error setting default role:', error);
    }
  }
  
  // Hash password if modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  return user;
};

module.exports = mongoose.model('User', userSchema);