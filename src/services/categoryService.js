const Category = require('../models/Category');
const mongoose = require('mongoose');

class CategoryService {
    /**
     * Create a new category
     */
    async createCategory(userId, categoryData) {
        try {
            // Generate slug from name
            const slug = categoryData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            // Check if category with same name/slug exists
            const existingCategory = await Category.findOne({
                userId,
                slug
            });

            if (existingCategory) {
                throw new Error('Category with this name already exists');
            }

            // If parentId is provided, validate it exists
            if (categoryData.parentId) {
                const parentCategory = await Category.findOne({
                    _id: categoryData.parentId,
                    userId
                });

                if (!parentCategory) {
                    throw new Error('Parent category not found');
                }
            }

            const category = new Category({
                userId,
                companyId: null,
                name: categoryData.name,
                description: categoryData.description,
                slug: slug,
                parentId: categoryData.parentId || null,
                icon: categoryData.icon || 'tag',
                color: categoryData.color || '#6B7280',
                status: categoryData.isActive ? 'active' : 'inactive',
                sortOrder: categoryData.sortOrder || 0,
                createdBy: userId
            });

            await category.save();

            return {
                success: true,
                message: 'Category created successfully',
                data: category
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to create category');
        }
    }

    /**
     * Get all categories with optional filters
     */
    async getCategories(userId, filters = {}) {
        try {
            const query = {
                userId: userId
            };

            // Apply filters
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.parentId !== undefined) {
                query.parentId = filters.parentId === 'null' || filters.parentId === null ? null : filters.parentId;
            }

            if (filters.search) {
                query.$or = [
                    { name: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 50;
            const skip = (page - 1) * limit;

            const [categories, total] = await Promise.all([
                Category.find(query)
                    .populate('parentId', 'name')
                    .sort({ sortOrder: 1, name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Category.countDocuments(query)
            ]);

            // Get subcategories for each category
            const categoriesWithSubcategories = await Promise.all(
                categories.map(async (category) => {
                    const subcategories = await Category.find({
                        parentId: category._id,
                        userId
                    }).sort({ sortOrder: 1, name: 1 }).lean();

                    return {
                        ...category,
                        subcategories
                    };
                })
            );

            return {
                success: true,
                data: categoriesWithSubcategories,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get categories');
        }
    }

    /**
     * Get category tree structure
     */
    async getCategoryTree(userId) {
        try {
            const tree = await Category.getCategoryTree(null, userId);

            return {
                success: true,
                data: tree
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get category tree');
        }
    }

    /**
     * Get category by ID
     */
    async getCategoryById(categoryId, userId) {
        try {
            const category = await Category.findOne({
                _id: categoryId,
                userId
            }).populate('parentId', 'name').lean();

            if (!category) {
                throw new Error('Category not found');
            }

            // Get subcategories
            const subcategories = await Category.find({
                parentId: category._id,
                userId
            }).sort({ sortOrder: 1, name: 1 }).lean();

            return {
                success: true,
                data: {
                    ...category,
                    subcategories
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get category');
        }
    }

    /**
     * Update category
     */
    async updateCategory(categoryId, userId, updateData) {
        try {
            const category = await Category.findOne({
                _id: categoryId,
                userId
            });

            if (!category) {
                throw new Error('Category not found');
            }

            // Check if updating name to existing slug
            if (updateData.name && updateData.name !== category.name) {
                const slug = updateData.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                const existingCategory = await Category.findOne({
                    userId,
                    slug,
                    _id: { $ne: categoryId }
                });

                if (existingCategory) {
                    throw new Error('Category with this name already exists');
                }
            }

            // If updating parentId, validate
            if (updateData.parentId) {
                // Can't set self as parent
                if (updateData.parentId === categoryId) {
                    throw new Error('Category cannot be its own parent');
                }

                const parentCategory = await Category.findOne({
                    _id: updateData.parentId,
                    userId
                });

                if (!parentCategory) {
                    throw new Error('Parent category not found');
                }

                // Check for circular reference
                let currentParent = parentCategory;
                while (currentParent.parentId) {
                    if (currentParent.parentId.toString() === categoryId) {
                        throw new Error('Circular reference detected');
                    }
                    currentParent = await Category.findById(currentParent.parentId);
                    if (!currentParent) break;
                }
            }

            // Update fields
            if (updateData.name) category.name = updateData.name;
            if (updateData.description) category.description = updateData.description;
            if (updateData.parentId !== undefined) category.parentId = updateData.parentId || null;
            if (updateData.icon) category.icon = updateData.icon;
            if (updateData.color) category.color = updateData.color;
            if (updateData.isActive !== undefined) category.status = updateData.isActive ? 'active' : 'inactive';
            if (updateData.sortOrder !== undefined) category.sortOrder = updateData.sortOrder;

            category.updatedBy = userId;

            await category.save();

            return {
                success: true,
                message: 'Category updated successfully',
                data: category
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update category');
        }
    }

    /**
     * Delete category
     */
    async deleteCategory(categoryId, userId) {
        try {
            const category = await Category.findOne({
                _id: categoryId,
                userId
            });

            if (!category) {
                throw new Error('Category not found');
            }

            // Check if category has subcategories
            const subcategoriesCount = await Category.countDocuments({
                parentId: categoryId,
                userId
            });

            if (subcategoriesCount > 0) {
                // Delete all subcategories
                await Category.deleteMany({
                    parentId: categoryId,
                    userId
                });
            }

            // Check if category has products
            if (category.productsCount > 0) {
                // Optional: Handle products reassignment or prevent deletion
                // For now, we'll allow deletion
            }

            await Category.deleteOne({ _id: categoryId });

            return {
                success: true,
                message: 'Category deleted successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to delete category');
        }
    }

    /**
     * Get category statistics
     */
    async getCategoryStats(userId) {
        try {
            const [
                totalCategories,
                activeCategories,
                inactiveCategories,
                parentCategories,
                subcategories
            ] = await Promise.all([
                Category.countDocuments({ userId }),
                Category.countDocuments({ userId, status: 'active' }),
                Category.countDocuments({ userId, status: 'inactive' }),
                Category.countDocuments({ userId, parentId: null }),
                Category.countDocuments({ userId, parentId: { $ne: null } })
            ]);

            // Get total products across all categories
            const categoriesWithProducts = await Category.find({
                userId
            }).select('productsCount').lean();

            const totalProducts = categoriesWithProducts.reduce(
                (sum, cat) => sum + (cat.productsCount || 0),
                0
            );

            return {
                success: true,
                data: {
                    totalCategories,
                    activeCategories,
                    inactiveCategories,
                    parentCategories,
                    subcategories,
                    totalProducts
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get category statistics');
        }
    }

    /**
     * Bulk update categories
     */
    async bulkUpdateCategories(userId, updates) {
        try {
            const results = await Promise.all(
                updates.map(async (update) => {
                    try {
                        return await this.updateCategory(
                            update.categoryId,
                            userId,
                            update.data
                        );
                    } catch (error) {
                        return {
                            success: false,
                            categoryId: update.categoryId,
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
            throw new Error(error.message || 'Failed to bulk update categories');
        }
    }

    /**
     * Reorder categories
     */
    async reorderCategories(userId, categoryOrders) {
        try {
            const updates = categoryOrders.map(({ categoryId, sortOrder }) => ({
                updateOne: {
                    filter: { _id: categoryId, userId },
                    update: { $set: { sortOrder } }
                }
            }));

            await Category.bulkWrite(updates);

            return {
                success: true,
                message: 'Categories reordered successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to reorder categories');
        }
    }
}

module.exports = new CategoryService();
