const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Permission ID is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Permission ID cannot exceed 100 characters']
  },
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    trim: true,
    maxlength: [100, 'Permission name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Permission description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Permission category is required'],
    trim: true,
    maxlength: [100, 'Permission category cannot exceed 100 characters']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Permission subcategory cannot exceed 100 characters']
  },
  resource: {
    type: String,
    trim: true,
    maxlength: [50, 'Resource cannot exceed 50 characters']
  },
  action: {
    type: String,
    trim: true,
    maxlength: [50, 'Action cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemPermission: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
permissionSchema.index({ category: 1, isActive: 1 });
permissionSchema.index({ resource: 1, action: 1 });

// Virtual for permission identifier (resource.action format)
permissionSchema.virtual('identifier').get(function() {
  if (this.resource && this.action) {
    return `${this.resource}.${this.action}`;
  }
  return this.name.toLowerCase().replace(/\s+/g, '.');
});

// Method to check if permission is system-level
permissionSchema.methods.isSystem = function() {
  return this.isSystemPermission;
};

// Static method to find permissions by category
permissionSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to find permissions by resource
permissionSchema.statics.findByResource = function(resource) {
  return this.find({ resource, isActive: true }).sort({ action: 1 });
};

// JSON transformation to include virtual fields
permissionSchema.methods.toJSON = function() {
  const permission = this.toObject({ virtuals: true });
  return permission;
};

module.exports = mongoose.model('Permission', permissionSchema);