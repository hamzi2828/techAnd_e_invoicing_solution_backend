const BlogAuthor = require('../models/BlogAuthor');
const Blog = require('../models/Blog');

class BlogAuthorService {
    /**
     * Create a new blog author
     */
    async createAuthor(userId, authorData) {
        try {
            // Check if author with same email exists (excluding deleted ones)
            const existingAuthor = await BlogAuthor.findOne({ email: authorData.email, isDeleted: { $ne: true } });
            if (existingAuthor) {
                throw new Error('Author with this email already exists');
            }

            const author = new BlogAuthor({
                firstName: authorData.firstName,
                lastName: authorData.lastName,
                email: authorData.email,
                avatar: authorData.avatar || null,
                bio: authorData.bio || '',
                role: authorData.role || 'author',
                socialLinks: authorData.socialLinks || {},
                status: authorData.status || 'active',
                userId: authorData.userId || null,
                createdBy: userId
            });

            await author.save();

            return {
                success: true,
                message: 'Blog author created successfully',
                data: author
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to create blog author');
        }
    }

    /**
     * Get all blog authors with optional filters
     */
    async getAuthors(filters = {}) {
        try {
            const query = { isDeleted: { $ne: true } };

            // Apply filters
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.role) {
                query.role = filters.role;
            }

            if (filters.search) {
                query.$or = [
                    { firstName: { $regex: filters.search, $options: 'i' } },
                    { lastName: { $regex: filters.search, $options: 'i' } },
                    { email: { $regex: filters.search, $options: 'i' } },
                    { bio: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 50;
            const skip = (page - 1) * limit;

            const [authors, total] = await Promise.all([
                BlogAuthor.find(query)
                    .sort({ firstName: 1, lastName: 1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BlogAuthor.countDocuments(query)
            ]);

            return {
                success: true,
                data: authors,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blog authors');
        }
    }

    /**
     * Get active authors for blog creation
     */
    async getActiveAuthors() {
        try {
            const authors = await BlogAuthor.find({ status: 'active', isDeleted: { $ne: true } })
                .select('firstName lastName email avatar role')
                .sort({ firstName: 1, lastName: 1 })
                .lean();

            return {
                success: true,
                data: authors
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get active authors');
        }
    }

    /**
     * Get author by ID
     */
    async getAuthorById(authorId) {
        try {
            const author = await BlogAuthor.findOne({ _id: authorId, isDeleted: { $ne: true } }).lean();

            if (!author) {
                throw new Error('Author not found');
            }

            // Get author's blogs
            const blogs = await Blog.find({ author: authorId, isDeleted: { $ne: true } })
                .select('title slug status publishedAt views')
                .sort({ publishedAt: -1 })
                .limit(10)
                .lean();

            return {
                success: true,
                data: {
                    ...author,
                    recentBlogs: blogs
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get author');
        }
    }

    /**
     * Update author
     */
    async updateAuthor(authorId, userId, updateData) {
        try {
            const author = await BlogAuthor.findOne({ _id: authorId, isDeleted: { $ne: true } });

            if (!author) {
                throw new Error('Author not found');
            }

            // Check if updating email to existing one
            if (updateData.email && updateData.email !== author.email) {
                const existingAuthor = await BlogAuthor.findOne({
                    email: updateData.email,
                    _id: { $ne: authorId },
                    isDeleted: { $ne: true }
                });

                if (existingAuthor) {
                    throw new Error('Author with this email already exists');
                }
            }

            // Update fields
            if (updateData.firstName) author.firstName = updateData.firstName;
            if (updateData.lastName) author.lastName = updateData.lastName;
            if (updateData.email) author.email = updateData.email;
            if (updateData.avatar !== undefined) author.avatar = updateData.avatar;
            if (updateData.bio !== undefined) author.bio = updateData.bio;
            if (updateData.role) author.role = updateData.role;
            if (updateData.socialLinks) author.socialLinks = updateData.socialLinks;
            if (updateData.status) author.status = updateData.status;

            author.updatedBy = userId;

            await author.save();

            return {
                success: true,
                message: 'Author updated successfully',
                data: author
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update author');
        }
    }

    /**
     * Delete author (soft delete)
     */
    async deleteAuthor(authorId, userId) {
        try {
            const author = await BlogAuthor.findOne({ _id: authorId, isDeleted: { $ne: true } });

            if (!author) {
                throw new Error('Author not found');
            }

            // Check if author has blogs
            const blogCount = await Blog.countDocuments({ author: authorId, isDeleted: { $ne: true } });
            if (blogCount > 0) {
                throw new Error('Cannot delete author with associated blogs. Please reassign or delete the blogs first.');
            }

            await author.softDelete(userId);

            return {
                success: true,
                message: 'Author deleted successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to delete author');
        }
    }

    /**
     * Get author statistics
     */
    async getAuthorStats() {
        try {
            const [
                totalAuthors,
                activeAuthors,
                inactiveAuthors
            ] = await Promise.all([
                BlogAuthor.countDocuments({ isDeleted: { $ne: true } }),
                BlogAuthor.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
                BlogAuthor.countDocuments({ status: 'inactive', isDeleted: { $ne: true } })
            ]);

            // Get role distribution
            const roleDistribution = await BlogAuthor.aggregate([
                {
                    $match: { isDeleted: { $ne: true } }
                },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get total views across all authors
            const authorsWithViews = await BlogAuthor.find({ isDeleted: { $ne: true } }).select('totalViews blogCount').lean();
            const totalViews = authorsWithViews.reduce(
                (sum, author) => sum + (author.totalViews || 0),
                0
            );
            const totalBlogs = authorsWithViews.reduce(
                (sum, author) => sum + (author.blogCount || 0),
                0
            );

            return {
                success: true,
                data: {
                    totalAuthors,
                    activeAuthors,
                    inactiveAuthors,
                    totalViews,
                    totalBlogs,
                    roleDistribution: roleDistribution.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {})
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get author statistics');
        }
    }

    /**
     * Update author status
     */
    async updateAuthorStatus(authorId, userId, status) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const author = await BlogAuthor.findOneAndUpdate(
                { _id: authorId, isDeleted: { $ne: true } },
                { status, updatedBy: userId },
                { new: true }
            );

            if (!author) {
                throw new Error('Author not found');
            }

            return {
                success: true,
                message: 'Author status updated successfully',
                data: author
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update author status');
        }
    }

    /**
     * Update all author stats
     */
    async updateAllAuthorStats() {
        try {
            await BlogAuthor.updateAllStats();

            return {
                success: true,
                message: 'All author stats updated successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update author stats');
        }
    }
}

module.exports = new BlogAuthorService();
