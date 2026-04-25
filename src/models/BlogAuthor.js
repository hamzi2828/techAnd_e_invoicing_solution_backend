const mongoose = require('mongoose');

const blogAuthorSchema = new mongoose.Schema({
    // Author Details
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },

    // Role
    role: {
        type: String,
        enum: ['admin', 'editor', 'author', 'contributor'],
        default: 'author'
    },

    // Social Links
    socialLinks: {
        twitter: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        website: { type: String, trim: true }
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    // Statistics
    blogCount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalViews: {
        type: Number,
        default: 0,
        min: 0
    },

    // Link to User (optional - if author is also a system user)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
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
// Note: email already has unique: true in schema definition (creates index)
blogAuthorSchema.index({ status: 1 });
blogAuthorSchema.index({ role: 1 });
blogAuthorSchema.index({ isDeleted: 1 });
blogAuthorSchema.index({ firstName: 'text', lastName: 'text', bio: 'text' });

// Virtual for full name
blogAuthorSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Method to update blog count and total views
blogAuthorSchema.methods.updateStats = async function() {
    const Blog = mongoose.model('Blog');
    const blogs = await Blog.find({ author: this._id });

    this.blogCount = blogs.length;
    this.totalViews = blogs.reduce((sum, blog) => sum + (blog.views || 0), 0);

    return this.save();
};

// Static method to update all author stats
blogAuthorSchema.statics.updateAllStats = async function() {
    const authors = await this.find({ isDeleted: { $ne: true } });
    for (const author of authors) {
        await author.updateStats();
    }
};

// Method for soft delete
blogAuthorSchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
};

// Method to restore soft deleted author
blogAuthorSchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

module.exports = mongoose.model('BlogAuthor', blogAuthorSchema);
