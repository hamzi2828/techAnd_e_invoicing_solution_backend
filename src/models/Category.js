const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: false,
        default: null
    },

    // Category Details
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },

    // Hierarchy
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },

    // Icon/Visual
    icon: {
        type: String,
        default: 'tag'
    },
    color: {
        type: String,
        default: '#6B7280'
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    // Metadata
    productsCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Sorting
    sortOrder: {
        type: Number,
        default: 0
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes
categorySchema.index({ userId: 1, status: 1 });
categorySchema.index({ userId: 1, parentId: 1 });
categorySchema.index({ slug: 1, userId: 1 }, { unique: true });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentId'
});

// Virtual to check if it's a parent category
categorySchema.virtual('isParent').get(function() {
    return this.parentId === null;
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function(companyId, userId) {
    const categories = await this.find({
        userId,
        status: 'active'
    }).sort({ sortOrder: 1, name: 1 });

    // Build tree structure
    const categoryMap = {};
    const tree = [];

    categories.forEach(cat => {
        categoryMap[cat._id] = { ...cat.toObject(), subcategories: [] };
    });

    categories.forEach(cat => {
        if (cat.parentId) {
            if (categoryMap[cat.parentId]) {
                categoryMap[cat.parentId].subcategories.push(categoryMap[cat._id]);
            }
        } else {
            tree.push(categoryMap[cat._id]);
        }
    });

    return tree;
};

// Method to update products count
categorySchema.methods.updateProductsCount = async function() {
    const Product = mongoose.model('Product');
    const count = await Product.countDocuments({ categoryId: this._id });
    this.productsCount = count;
    return this.save();
};

// Static method to get subcategories
categorySchema.statics.getSubcategories = async function(parentId, userId) {
    return this.find({
        parentId,
        userId,
        status: 'active'
    }).sort({ sortOrder: 1, name: 1 });
};

// Pre-remove middleware to handle cascading deletes
categorySchema.pre('remove', async function(next) {
    // Delete all subcategories
    await this.constructor.deleteMany({ parentId: this._id });

    // Optional: Handle products - either delete or unassign
    // const Product = mongoose.model('Product');
    // await Product.updateMany({ categoryId: this._id }, { categoryId: null });

    next();
});

module.exports = mongoose.model('Category', categorySchema);
