const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    // Blog Details
    title: {
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
    excerpt: {
        type: String,
        trim: true,
        default: ''
    },
    content: {
        type: String,
        required: true
    },

    // Media
    featuredImage: {
        type: String,
        default: null
    },

    // Relations
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlogCategory',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BlogAuthor',
        required: true
    },

    // Tags
    tags: [{
        type: String,
        trim: true
    }],

    // Status and Publishing
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'archived'],
        default: 'draft'
    },
    publishedAt: {
        type: Date,
        default: null
    },
    scheduledAt: {
        type: Date,
        default: null
    },

    // Statistics
    views: {
        type: Number,
        default: 0,
        min: 0
    },

    // SEO
    metaTitle: {
        type: String,
        trim: true,
        default: ''
    },
    metaDescription: {
        type: String,
        trim: true,
        default: ''
    },

    // Featured
    isFeatured: {
        type: Boolean,
        default: false
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
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ author: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ isDeleted: 1 });
blogSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

// Pre-save middleware to generate slug
blogSchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    next();
});

// Post-save middleware to update category and author counts
blogSchema.post('save', async function() {
    try {
        const BlogCategory = mongoose.model('BlogCategory');
        const BlogAuthor = mongoose.model('BlogAuthor');

        if (this.category) {
            const category = await BlogCategory.findById(this.category);
            if (category) {
                await category.updateBlogCount();
            }
        }

        if (this.author) {
            const author = await BlogAuthor.findById(this.author);
            if (author) {
                await author.updateStats();
            }
        }
    } catch (error) {
        console.error('Error updating counts after blog save:', error);
    }
});

// Post-remove middleware to update counts
blogSchema.post('remove', async function() {
    try {
        const BlogCategory = mongoose.model('BlogCategory');
        const BlogAuthor = mongoose.model('BlogAuthor');

        if (this.category) {
            const category = await BlogCategory.findById(this.category);
            if (category) {
                await category.updateBlogCount();
            }
        }

        if (this.author) {
            const author = await BlogAuthor.findById(this.author);
            if (author) {
                await author.updateStats();
            }
        }
    } catch (error) {
        console.error('Error updating counts after blog remove:', error);
    }
});

// Method to increment views
blogSchema.methods.incrementViews = async function() {
    this.views += 1;
    return this.save();
};

// Static method to get published blogs
blogSchema.statics.getPublished = function(options = {}) {
    const { limit = 10, page = 1, category, author, tag } = options;

    const query = { status: 'published', isDeleted: { $ne: true } };

    if (category) query.category = category;
    if (author) query.author = author;
    if (tag) query.tags = tag;

    return this.find(query)
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatar')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
};

// Static method to get featured blogs
blogSchema.statics.getFeatured = function(limit = 5) {
    return this.find({ status: 'published', isFeatured: true, isDeleted: { $ne: true } })
        .populate('category', 'name slug')
        .populate('author', 'firstName lastName avatar')
        .sort({ publishedAt: -1 })
        .limit(limit);
};

// Method for soft delete
blogSchema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
};

// Method to restore soft deleted blog
blogSchema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
};

module.exports = mongoose.model('Blog', blogSchema);
