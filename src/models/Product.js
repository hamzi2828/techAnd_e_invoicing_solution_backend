const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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

    // Basic Details
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    },
    shortDescription: {
        type: String,
        required: false,
        trim: true
    },
    sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    slug: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },

    // Category
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
        default: null
    },

    // Pricing
    price: {
        type: Number,
        required: true,
        min: 0
    },
    costPrice: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['piece', 'hour', 'day', 'month', 'year', 'project', 'kg', 'liter', 'meter'],
        default: 'piece'
    },
    taxRate: {
        type: Number,
        required: false,
        default: 15,
        min: 0,
        max: 100
    },

    // Inventory
    stock: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    },
    minStock: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    },
    maxStock: {
        type: Number,
        required: false,
        default: 1000,
        min: 0
    },
    barcode: {
        type: String,
        required: false,
        trim: true
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'out_of_stock'],
        default: 'active'
    },

    // Additional Details
    tags: [{
        type: String,
        trim: true
    }],
    weight: {
        type: Number,
        required: false,
        default: 0,
        min: 0
    },
    dimensions: {
        length: {
            type: Number,
            default: 0,
            min: 0
        },
        width: {
            type: Number,
            default: 0,
            min: 0
        },
        height: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // Images
    images: [{
        url: String,
        filename: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],

    // Custom Attributes
    attributes: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        value: {
            type: String,
            required: true,
            trim: true
        }
    }],

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
productSchema.index({ userId: 1, status: 1 });
productSchema.index({ userId: 1, category: 1 });
productSchema.index({ userId: 1, sku: 1 }, { unique: true });
productSchema.index({ slug: 1, userId: 1 });
productSchema.index({ barcode: 1, userId: 1 });
productSchema.index({ tags: 1 });

// Text search index
productSchema.index({
    name: 'text',
    description: 'text',
    shortDescription: 'text',
    sku: 'text',
    tags: 'text'
});

// Virtual for profit
productSchema.virtual('profit').get(function() {
    return this.price - this.costPrice;
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
    if (this.price === 0) return 0;
    return ((this.price - this.costPrice) / this.price) * 100;
});

// Virtual for total value (price * stock)
productSchema.virtual('totalValue').get(function() {
    return this.price * this.stock;
});

// Virtual to check if stock is low
productSchema.virtual('isLowStock').get(function() {
    return this.stock <= this.minStock;
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Auto update status to out_of_stock if stock is 0
    if (this.stock === 0 && this.status === 'active') {
        this.status = 'out_of_stock';
    }

    next();
});

// Static method to get products with low stock
productSchema.statics.getLowStockProducts = async function(userId, limit = 10) {
    return this.find({
        userId,
        status: 'active',
        $expr: { $lte: ['$stock', '$minStock'] }
    })
    .sort({ stock: 1 })
    .limit(limit)
    .populate('category', 'name')
    .lean();
};

// Static method to get products by category
productSchema.statics.getByCategory = async function(categoryId, userId, filters = {}) {
    const query = {
        userId,
        category: categoryId
    };

    if (filters.status) {
        query.status = filters.status;
    }

    return this.find(query)
        .sort({ name: 1 })
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .lean();
};

// Method to update stock
productSchema.methods.updateStock = async function(quantity, operation = 'add') {
    if (operation === 'add') {
        this.stock += quantity;
    } else if (operation === 'subtract') {
        this.stock = Math.max(0, this.stock - quantity);
    } else if (operation === 'set') {
        this.stock = Math.max(0, quantity);
    }

    // Update status based on stock
    if (this.stock === 0) {
        this.status = 'out_of_stock';
    } else if (this.status === 'out_of_stock' && this.stock > 0) {
        this.status = 'active';
    }

    return this.save();
};

// Pre-remove middleware
productSchema.pre('remove', async function(next) {
    // Update category products count
    const Category = mongoose.model('Category');
    await Category.findByIdAndUpdate(this.category, {
        $inc: { productsCount: -1 }
    });

    next();
});

// Post-save middleware to update category products count
productSchema.post('save', async function(doc, next) {
    if (this.isNew) {
        const Category = mongoose.model('Category');
        await Category.findByIdAndUpdate(doc.category, {
            $inc: { productsCount: 1 }
        });
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);
