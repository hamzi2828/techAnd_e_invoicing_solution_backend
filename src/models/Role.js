const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Role description cannot exceed 500 characters']
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  // Also store permission identifiers for quick access
  permissionIds: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    trim: true,
    maxlength: [100, 'Color class cannot exceed 100 characters']
  },
  level: {
    type: Number,
    default: 5,
    min: [1, 'Role level must be at least 1'],
    max: [10, 'Role level cannot exceed 10']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemRole: {
    type: Boolean,
    default: false
  },
  userCount: {
    type: Number,
    default: 0,
    min: [0, 'User count cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for efficient queries
roleSchema.index({ name: 1, isActive: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ isSystemRole: 1 });

// Pre-save middleware to set default color based on role name
roleSchema.pre('save', function(next) {
  if (this.isNew && !this.color) {
    this.color = this.getDefaultColor();
  }
  next();
});

// Method to get default color based on role name
roleSchema.methods.getDefaultColor = function() {
  const colorMap = {
    'super admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'admin': 'bg-blue-100 text-blue-800 border-blue-200',
    'manager': 'bg-green-100 text-green-800 border-green-200',
    'invoice manager': 'bg-green-100 text-green-800 border-green-200',
    'accountant': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'sales rep': 'bg-orange-100 text-orange-800 border-orange-200',
    'hr manager': 'bg-pink-100 text-pink-800 border-pink-200',
    'user': 'bg-gray-100 text-gray-800 border-gray-200',
    'viewer': 'bg-slate-100 text-slate-800 border-slate-200'
  };
  
  const normalizedName = this.name.toLowerCase();
  return colorMap[normalizedName] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function(permissionId) {
  return this.permissionIds.includes(permissionId) || this.permissionIds.includes('all');
};

// Method to add permission to role
roleSchema.methods.addPermission = async function(permissionId, permissionObjectId = null) {
  if (!this.permissionIds.includes(permissionId)) {
    this.permissionIds.push(permissionId);
    
    if (permissionObjectId && !this.permissions.includes(permissionObjectId)) {
      this.permissions.push(permissionObjectId);
    }
    
    return await this.save();
  }
  return this;
};

// Method to remove permission from role
roleSchema.methods.removePermission = async function(permissionId, permissionObjectId = null) {
  this.permissionIds = this.permissionIds.filter(id => id !== permissionId);
  
  if (permissionObjectId) {
    this.permissions = this.permissions.filter(id => !id.equals(permissionObjectId));
  }
  
  return await this.save();
};

// Static method to find system roles
roleSchema.statics.findSystemRoles = function() {
  return this.find({ isSystemRole: true, isActive: true }).sort({ level: 1 });
};

// Static method to find custom roles
roleSchema.statics.findCustomRoles = function() {
  return this.find({ isSystemRole: false, isActive: true }).sort({ name: 1 });
};

// Static method to find roles by level range
roleSchema.statics.findByLevelRange = function(minLevel, maxLevel) {
  return this.find({ 
    level: { $gte: minLevel, $lte: maxLevel },
    isActive: true 
  }).sort({ level: 1 });
};

// Method to update user count
roleSchema.methods.updateUserCount = async function() {
  try {
    const User = mongoose.model('User');
    // Only count users with ObjectId references (strings have been migrated)
    const count = await User.countDocuments({ 
      role: this._id,
      isActive: true 
    });
    this.userCount = count;
    return await this.save();
  } catch (error) {
    console.error(`Error updating user count for role ${this.name}:`, error.message);
    // Don't fail the entire operation, just set count to 0
    this.userCount = 0;
    return await this.save();
  }
};

// Virtual to populate permissions details
roleSchema.virtual('permissionDetails', {
  ref: 'Permission',
  localField: 'permissions',
  foreignField: '_id'
});

// Ensure virtual fields are serialized
roleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Role', roleSchema);