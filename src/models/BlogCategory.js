const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
    // Category Details
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
        unique: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    // Metadata
    blogCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Sorting
    sortOrder: {
        type: Number,
        default: 0
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Soft Delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
// Note: slug already has unique: true in schema definition (creates index)
blogCategorySchema.index({ status: 1 });
blogCategorySchema.index({ isDeleted: 1 });
blogCategorySchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
blogCategorySchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

// Method to update blog count
blogCategorySchema.methods.updateBlogCount = async function() {
    const Blog = mongoose.model('Blog');
    const count = await Blog.countDocuments({ category: this._id, status: 'published' });
    this.blogCount = count;
    return this.save();
};

// Static method to update all blog counts
blogCategorySchema.statics.updateAllBlogCounts = async function() {
    const categories = await this.find({ isDeleted: { $ne: true } });
    for (const category of categories) {
        await category.updateBlogCount();
    }
};

// Method for soft delete
blogCategorySchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
};

// Method to restore soft deleted category
blogCategorySchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
