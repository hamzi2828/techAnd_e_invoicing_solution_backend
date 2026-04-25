const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const mongoose = require('mongoose');

class ProductService {
    /**
     * Create a new product
     */
    async createProduct(userId, productData) {
        try {
            // Check if SKU already exists
            const existingSKU = await Product.findOne({
                userId,
                sku: productData.sku.toUpperCase()
            });

            if (existingSKU) {
                throw new Error('Product with this SKU already exists');
            }

            // Validate category exists
            const category = await Category.findOne({
                _id: productData.category,
                userId
            });

            if (!category) {
                throw new Error('Category not found');
            }

            // Validate subcategory if provided
            if (productData.subcategory) {
                const subcategory = await Category.findOne({
                    _id: productData.subcategory,
                    userId,
                    parentId: productData.category
                });

                if (!subcategory) {
                    throw new Error('Subcategory not found or does not belong to the selected category');
                }
            }

            const product = new Product({
                userId,
                companyId: null,
                name: productData.name,
                description: productData.description || '',
                shortDescription: productData.shortDescription || '',
                sku: productData.sku.toUpperCase(),
                category: productData.category,
                subcategory: productData.subcategory || null,
                price: productData.price,
                costPrice: productData.costPrice || 0,
                unit: productData.unit || 'piece',
                taxRate: productData.taxRate || 15,
                stock: productData.stock || 0,
                minStock: productData.minStock || 0,
                maxStock: productData.maxStock || 1000,
                barcode: productData.barcode || '',
                status: productData.status || 'active',
                tags: productData.tags || [],
                weight: productData.weight || 0,
                dimensions: productData.dimensions || { length: 0, width: 0, height: 0 },
                images: productData.images || [],
                attributes: productData.attributes || [],
                createdBy: userId
            });

            await product.save();

            // Populate category and subcategory
            await product.populate('category', 'name');
            if (product.subcategory) {
                await product.populate('subcategory', 'name');
            }

            return {
                success: true,
                message: 'Product created successfully',
                data: product
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to create product');
        }
    }

    /**
     * Get all products with optional filters
     */
    async getProducts(userId, filters = {}) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find products (user was created by someone else)
            let productOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                productOwnerId = currentUser.createdBy;
                console.log('Using createdBy for products:', productOwnerId);
            }

            const query = {
                userId: productOwnerId
            };

            // Apply filters
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.category) {
                query.category = filters.category;
            }

            if (filters.subcategory) {
                query.subcategory = filters.subcategory;
            }

            if (filters.search) {
                query.$or = [
                    { name: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } },
                    { sku: { $regex: filters.search, $options: 'i' } },
                    { tags: { $in: [new RegExp(filters.search, 'i')] } }
                ];
            }

            // Stock filters
            if (filters.stockStatus === 'low') {
                query.$expr = { $lte: ['$stock', '$minStock'] };
            } else if (filters.stockStatus === 'out') {
                query.stock = 0;
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 50;
            const skip = (page - 1) * limit;

            // Sort options
            let sortOptions = {};
            if (filters.sortBy) {
                const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
                sortOptions[filters.sortBy] = sortOrder;
            } else {
                sortOptions = { createdAt: -1 };
            }

            const [products, total] = await Promise.all([
                Product.find(query)
                    .populate('category', 'name icon')
                    .populate('subcategory', 'name')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments(query)
            ]);

            return {
                success: true,
                data: products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get products');
        }
    }

    /**
     * Get product by ID
     */
    async getProductById(productId, userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find product (user was created by someone else)
            let productOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                productOwnerId = currentUser.createdBy;
            }

            const product = await Product.findOne({
                _id: productId,
                userId: productOwnerId
            })
            .populate('category', 'name icon')
            .populate('subcategory', 'name')
            .lean();

            if (!product) {
                throw new Error('Product not found');
            }

            return {
                success: true,
                data: product
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get product');
        }
    }

    /**
     * Update product
     */
    async updateProduct(productId, userId, updateData) {
        try {
            const product = await Product.findOne({
                _id: productId,
                userId
            });

            if (!product) {
                throw new Error('Product not found');
            }

            // Check if updating SKU to existing one
            if (updateData.sku && updateData.sku.toUpperCase() !== product.sku) {
                const existingSKU = await Product.findOne({
                    userId,
                    sku: updateData.sku.toUpperCase(),
                    _id: { $ne: productId }
                });

                if (existingSKU) {
                    throw new Error('Product with this SKU already exists');
                }
            }

            // Validate category if updating
            if (updateData.category) {
                const category = await Category.findOne({
                    _id: updateData.category,
                    userId
                });

                if (!category) {
                    throw new Error('Category not found');
                }

                // If category changed, clear subcategory
                if (updateData.category !== product.category.toString()) {
                    product.subcategory = null;
                }
            }

            // Validate subcategory if provided
            if (updateData.subcategory) {
                const categoryId = updateData.category || product.category;
                const subcategory = await Category.findOne({
                    _id: updateData.subcategory,
                    userId,
                    parentId: categoryId
                });

                if (!subcategory) {
                    throw new Error('Subcategory not found or does not belong to the selected category');
                }
            }

            // Update fields
            if (updateData.name) product.name = updateData.name;
            if (updateData.description !== undefined) product.description = updateData.description;
            if (updateData.shortDescription !== undefined) product.shortDescription = updateData.shortDescription;
            if (updateData.sku) product.sku = updateData.sku.toUpperCase();
            if (updateData.category) product.category = updateData.category;
            if (updateData.subcategory !== undefined) product.subcategory = updateData.subcategory || null;
            if (updateData.price !== undefined) product.price = updateData.price;
            if (updateData.costPrice !== undefined) product.costPrice = updateData.costPrice;
            if (updateData.unit) product.unit = updateData.unit;
            if (updateData.taxRate !== undefined) product.taxRate = updateData.taxRate;
            if (updateData.stock !== undefined) product.stock = updateData.stock;
            if (updateData.minStock !== undefined) product.minStock = updateData.minStock;
            if (updateData.maxStock !== undefined) product.maxStock = updateData.maxStock;
            if (updateData.barcode !== undefined) product.barcode = updateData.barcode;
            if (updateData.status) product.status = updateData.status;
            if (updateData.tags !== undefined) product.tags = updateData.tags;
            if (updateData.weight !== undefined) product.weight = updateData.weight;
            if (updateData.dimensions) product.dimensions = updateData.dimensions;
            if (updateData.images !== undefined) product.images = updateData.images;
            if (updateData.attributes !== undefined) product.attributes = updateData.attributes;

            product.updatedBy = userId;

            await product.save();

            // Populate references
            await product.populate('category', 'name icon');
            if (product.subcategory) {
                await product.populate('subcategory', 'name');
            }

            return {
                success: true,
                message: 'Product updated successfully',
                data: product
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update product');
        }
    }

    /**
     * Delete product
     */
    async deleteProduct(productId, userId) {
        try {
            const product = await Product.findOne({
                _id: productId,
                userId
            });

            if (!product) {
                throw new Error('Product not found');
            }

            await Product.deleteOne({ _id: productId });

            return {
                success: true,
                message: 'Product deleted successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to delete product');
        }
    }

    /**
     * Get product statistics
     */
    async getProductStats(userId) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find products (user was created by someone else)
            let productOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                productOwnerId = currentUser.createdBy;
            }

            const [
                totalProducts,
                activeProducts,
                inactiveProducts,
                outOfStockProducts,
                lowStockProducts
            ] = await Promise.all([
                Product.countDocuments({ userId: productOwnerId }),
                Product.countDocuments({ userId: productOwnerId, status: 'active' }),
                Product.countDocuments({ userId: productOwnerId, status: 'inactive' }),
                Product.countDocuments({ userId: productOwnerId, stock: 0 }),
                Product.countDocuments({
                    userId: productOwnerId,
                    status: 'active',
                    $expr: { $lte: ['$stock', '$minStock'] }
                })
            ]);

            // Calculate total value
            const products = await Product.find({ userId: productOwnerId }).select('price stock').lean();
            const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

            // Get unique categories count
            const categories = await Product.distinct('category', { userId: productOwnerId });

            return {
                success: true,
                data: {
                    totalProducts,
                    activeProducts,
                    inactiveProducts,
                    outOfStockProducts,
                    lowStockProducts,
                    totalValue,
                    totalCategories: categories.length
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get product statistics');
        }
    }

    /**
     * Bulk update products
     */
    async bulkUpdateProducts(userId, updates) {
        try {
            const results = await Promise.all(
                updates.map(async (update) => {
                    try {
                        return await this.updateProduct(
                            update.productId,
                            userId,
                            update.data
                        );
                    } catch (error) {
                        return {
                            success: false,
                            productId: update.productId,
                            error: error.message
                        };
                    }
                })
            );

            return {
                success: true,
                message: 'Bulk update completed',
                data: results
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to bulk update products');
        }
    }

    /**
     * Bulk delete products
     */
    async bulkDeleteProducts(userId, productIds) {
        try {
            const result = await Product.deleteMany({
                _id: { $in: productIds },
                userId
            });

            return {
                success: true,
                message: `${result.deletedCount} products deleted successfully`,
                data: {
                    deletedCount: result.deletedCount
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to bulk delete products');
        }
    }

    /**
     * Update product stock
     */
    async updateStock(productId, userId, quantity, operation = 'set') {
        try {
            const product = await Product.findOne({
                _id: productId,
                userId
            });

            if (!product) {
                throw new Error('Product not found');
            }

            await product.updateStock(quantity, operation);

            return {
                success: true,
                message: 'Stock updated successfully',
                data: product
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update stock');
        }
    }

    /**
     * Get low stock products
     */
    async getLowStockProducts(userId, limit = 10) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find products (user was created by someone else)
            let productOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                productOwnerId = currentUser.createdBy;
            }

            const products = await Product.getLowStockProducts(productOwnerId, limit);

            return {
                success: true,
                data: products
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get low stock products');
        }
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId, userId, filters = {}) {
        try {
            // Find the current user to check if they have a createdBy
            const currentUser = await User.findById(userId);
            
            // If user has a createdBy, use that to find products (user was created by someone else)
            let productOwnerId = userId;
            if (currentUser && currentUser.createdBy) {
                productOwnerId = currentUser.createdBy;
            }

            const products = await Product.getByCategory(categoryId, productOwnerId, filters);

            return {
                success: true,
                data: products
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get products by category');
        }
    }
}

module.exports = new ProductService();
