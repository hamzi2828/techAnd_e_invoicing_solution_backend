const BlogCategory = require('../models/BlogCategory');
const Blog = require('../models/Blog');

class BlogCategoryService {
    /**
     * Create a new blog category
     */
    async createCategory(userId, categoryData) {
        try {
            // Generate slug from name if not provided
            let slug = categoryData.slug;
            if (!slug && categoryData.name) {
                slug = categoryData.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
            }

            // Check if category with same slug exists (excluding deleted ones)
            const existingCategory = await BlogCategory.findOne({ slug, isDeleted: { $ne: true } });
            if (existingCategory) {
                throw new Error('Category with this name already exists');
            }

            const category = new BlogCategory({
                name: categoryData.name,
                slug,
                description: categoryData.description || '',
                status: categoryData.status || 'active',
                sortOrder: categoryData.sortOrder || 0,
                createdBy: userId
            });

            await category.save();

            return {
                success: true,
                message: 'Blog category created successfully',
                data: category
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to create blog category');
        }
    }

    /**
     * Get all blog categories with optional filters
     */
    async getCategories(filters = {}) {
        try {
            const query = { isDeleted: { $ne: true } };

            // Apply filters
            if (filters.status) {
                query.status = filters.status;
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
                BlogCategory.find(query)
                    .sort({ sortOrder: 1, name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BlogCategory.countDocuments(query)
            ]);

            return {
                success: true,
                data: categories,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blog categories');
        }
    }

    /**
     * Get category by ID
     */
    async getCategoryById(categoryId) {
        try {
            const category = await BlogCategory.findOne({ _id: categoryId, isDeleted: { $ne: true } }).lean();

            if (!category) {
                throw new Error('Category not found');
            }

            return {
                success: true,
                data: category
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get category');
        }
    }

    /**
     * Get category by slug
     */
    async getCategoryBySlug(slug) {
        try {
            const category = await BlogCategory.findOne({ slug, status: 'active', isDeleted: { $ne: true } }).lean();

            if (!category) {
                throw new Error('Category not found');
            }

            return {
                success: true,
                data: category
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
            const category = await BlogCategory.findOne({ _id: categoryId, isDeleted: { $ne: true } });

            if (!category) {
                throw new Error('Category not found');
            }

            // Check if updating name to existing slug
            if (updateData.name && updateData.name !== category.name) {
                const slug = updateData.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                const existingCategory = await BlogCategory.findOne({
                    slug,
                    _id: { $ne: categoryId },
                    isDeleted: { $ne: true }
                });

                if (existingCategory) {
                    throw new Error('Category with this name already exists');
                }

                category.slug = slug;
            }

            // Update fields
            if (updateData.name) category.name = updateData.name;
            if (updateData.description !== undefined) category.description = updateData.description;
            if (updateData.status) category.status = updateData.status;
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
     * Delete category (soft delete)
     */
    async deleteCategory(categoryId, userId) {
        try {
            const category = await BlogCategory.findOne({ _id: categoryId, isDeleted: { $ne: true } });

            if (!category) {
                throw new Error('Category not found');
            }

            // Check if category has blogs
            const blogCount = await Blog.countDocuments({ category: categoryId, isDeleted: { $ne: true } });
            if (blogCount > 0) {
                throw new Error('Cannot delete category with associated blogs. Please reassign or delete the blogs first.');
            }

            await category.softDelete(userId);

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
    async getCategoryStats() {
        try {
            const [
                totalCategories,
                activeCategories,
                inactiveCategories
            ] = await Promise.all([
                BlogCategory.countDocuments({ isDeleted: { $ne: true } }),
                BlogCategory.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
                BlogCategory.countDocuments({ status: 'inactive', isDeleted: { $ne: true } })
            ]);

            // Get total blogs across all categories
            const categoriesWithBlogs = await BlogCategory.find({ isDeleted: { $ne: true } }).select('blogCount').lean();
            const totalBlogs = categoriesWithBlogs.reduce(
                (sum, cat) => sum + (cat.blogCount || 0),
                0
            );

            return {
                success: true,
                data: {
                    totalCategories,
                    activeCategories,
                    inactiveCategories,
                    totalBlogs
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get category statistics');
        }
    }

    /**
     * Update category status
     */
    async updateCategoryStatus(categoryId, userId, status) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const category = await BlogCategory.findOneAndUpdate(
                { _id: categoryId, isDeleted: { $ne: true } },
                { status, updatedBy: userId },
                { new: true }
            );

            if (!category) {
                throw new Error('Category not found');
            }

            return {
                success: true,
                message: 'Category status updated successfully',
                data: category
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update category status');
        }
    }

    /**
     * Update all blog counts
     */
    async updateAllBlogCounts() {
        try {
            await BlogCategory.updateAllBlogCounts();

            return {
                success: true,
                message: 'All blog counts updated successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update blog counts');
        }
    }
}

module.exports = new BlogCategoryService();
