const Blog = require('../models/Blog');
const BlogCategory = require('../models/BlogCategory');
const BlogAuthor = require('../models/BlogAuthor');

class BlogService {
    /**
     * Create a new blog
     */
    async createBlog(userId, blogData) {
        try {
            // Generate slug from title if not provided
            let slug = blogData.slug;
            if (!slug && blogData.title) {
                slug = blogData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
            }

            // Check if blog with same slug exists
            const existingBlog = await Blog.findOne({ slug });
            if (existingBlog) {
                // Append timestamp to make slug unique
                slug = `${slug}-${Date.now()}`;
            }

            // Validate category exists
            const category = await BlogCategory.findById(blogData.category);
            if (!category) {
                throw new Error('Invalid category');
            }

            // Validate author exists
            const author = await BlogAuthor.findById(blogData.author);
            if (!author) {
                throw new Error('Invalid author');
            }

            const blog = new Blog({
                title: blogData.title,
                slug,
                excerpt: blogData.excerpt || '',
                content: blogData.content,
                featuredImage: blogData.featuredImage || null,
                category: blogData.category,
                author: blogData.author,
                tags: blogData.tags || [],
                status: blogData.status || 'draft',
                scheduledAt: blogData.scheduledAt || null,
                metaTitle: blogData.metaTitle || '',
                metaDescription: blogData.metaDescription || '',
                isFeatured: blogData.isFeatured || false,
                createdBy: userId
            });

            await blog.save();

            // Populate category and author for response
            await blog.populate('category', 'name slug');
            await blog.populate('author', 'firstName lastName avatar');

            return {
                success: true,
                message: 'Blog created successfully',
                data: blog
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to create blog');
        }
    }

    /**
     * Get all blogs with optional filters
     */
    async getBlogs(filters = {}) {
        try {
            const query = { isDeleted: { $ne: true } };

            // Apply filters
            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.category) {
                query.category = filters.category;
            }

            if (filters.author) {
                query.author = filters.author;
            }

            if (filters.tag) {
                query.tags = filters.tag;
            }

            if (filters.isFeatured !== undefined) {
                query.isFeatured = filters.isFeatured === 'true' || filters.isFeatured === true;
            }

            if (filters.search) {
                query.$or = [
                    { title: { $regex: filters.search, $options: 'i' } },
                    { excerpt: { $regex: filters.search, $options: 'i' } },
                    { content: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const skip = (page - 1) * limit;

            const sortField = filters.sortBy || '-createdAt';

            const [blogs, total] = await Promise.all([
                Blog.find(query)
                    .populate('category', 'name slug')
                    .populate('author', 'firstName lastName avatar')
                    .sort(sortField)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Blog.countDocuments(query)
            ]);

            return {
                success: true,
                data: blogs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blogs');
        }
    }

    /**
     * Get published blogs (for public API)
     */
    async getPublishedBlogs(filters = {}) {
        try {
            const query = { status: 'published', isDeleted: { $ne: true } };

            if (filters.category) {
                query.category = filters.category;
            }

            if (filters.author) {
                query.author = filters.author;
            }

            if (filters.tag) {
                query.tags = filters.tag;
            }

            if (filters.search) {
                query.$text = { $search: filters.search };
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const skip = (page - 1) * limit;

            const [blogs, total] = await Promise.all([
                Blog.find(query)
                    .populate('category', 'name slug')
                    .populate('author', 'firstName lastName avatar')
                    .select('-content')
                    .sort({ publishedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Blog.countDocuments(query)
            ]);

            return {
                success: true,
                data: blogs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get published blogs');
        }
    }

    /**
     * Get featured blogs
     */
    async getFeaturedBlogs(limit = 5) {
        try {
            const blogs = await Blog.getFeatured(limit);

            return {
                success: true,
                data: blogs
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get featured blogs');
        }
    }

    /**
     * Get blog by ID
     */
    async getBlogById(blogId) {
        try {
            const blog = await Blog.findOne({ _id: blogId, isDeleted: { $ne: true } })
                .populate('category', 'name slug description')
                .populate('author', 'firstName lastName avatar bio socialLinks')
                .lean();

            if (!blog) {
                throw new Error('Blog not found');
            }

            return {
                success: true,
                data: blog
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blog');
        }
    }

    /**
     * Get blog by slug (for public access)
     */
    async getBlogBySlug(slug, incrementViews = true) {
        try {
            const blog = await Blog.findOne({ slug, status: 'published', isDeleted: { $ne: true } })
                .populate('category', 'name slug description')
                .populate('author', 'firstName lastName avatar bio socialLinks');

            if (!blog) {
                throw new Error('Blog not found');
            }

            // Increment views if requested
            if (incrementViews) {
                await blog.incrementViews();
            }

            // Get related blogs
            const relatedBlogs = await Blog.find({
                _id: { $ne: blog._id },
                status: 'published',
                isDeleted: { $ne: true },
                $or: [
                    { category: blog.category._id },
                    { tags: { $in: blog.tags } }
                ]
            })
                .populate('category', 'name slug')
                .populate('author', 'firstName lastName avatar')
                .select('-content')
                .limit(4)
                .lean();

            return {
                success: true,
                data: {
                    ...blog.toObject(),
                    relatedBlogs
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blog');
        }
    }

    /**
     * Update blog
     */
    async updateBlog(blogId, userId, updateData) {
        try {
            const blog = await Blog.findOne({ _id: blogId, isDeleted: { $ne: true } });

            if (!blog) {
                throw new Error('Blog not found');
            }

            // Check if updating title to existing slug
            if (updateData.title && updateData.title !== blog.title) {
                const slug = updateData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                const existingBlog = await Blog.findOne({
                    slug,
                    _id: { $ne: blogId }
                });

                if (existingBlog) {
                    // Append timestamp to make slug unique
                    blog.slug = `${slug}-${Date.now()}`;
                } else {
                    blog.slug = slug;
                }
            }

            // Validate category if updating
            if (updateData.category && updateData.category !== blog.category.toString()) {
                const category = await BlogCategory.findById(updateData.category);
                if (!category) {
                    throw new Error('Invalid category');
                }
            }

            // Validate author if updating
            if (updateData.author && updateData.author !== blog.author.toString()) {
                const author = await BlogAuthor.findById(updateData.author);
                if (!author) {
                    throw new Error('Invalid author');
                }
            }

            // Update fields
            if (updateData.title) blog.title = updateData.title;
            if (updateData.excerpt !== undefined) blog.excerpt = updateData.excerpt;
            if (updateData.content) blog.content = updateData.content;
            if (updateData.featuredImage !== undefined) blog.featuredImage = updateData.featuredImage;
            if (updateData.category) blog.category = updateData.category;
            if (updateData.author) blog.author = updateData.author;
            if (updateData.tags) blog.tags = updateData.tags;
            if (updateData.status) blog.status = updateData.status;
            if (updateData.scheduledAt !== undefined) blog.scheduledAt = updateData.scheduledAt;
            if (updateData.metaTitle !== undefined) blog.metaTitle = updateData.metaTitle;
            if (updateData.metaDescription !== undefined) blog.metaDescription = updateData.metaDescription;
            if (updateData.isFeatured !== undefined) blog.isFeatured = updateData.isFeatured;

            blog.updatedBy = userId;

            await blog.save();

            // Populate for response
            await blog.populate('category', 'name slug');
            await blog.populate('author', 'firstName lastName avatar');

            return {
                success: true,
                message: 'Blog updated successfully',
                data: blog
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update blog');
        }
    }

    /**
     * Delete blog (soft delete)
     */
    async deleteBlog(blogId, userId) {
        try {
            const blog = await Blog.findOne({ _id: blogId, isDeleted: { $ne: true } });

            if (!blog) {
                throw new Error('Blog not found');
            }

            await blog.softDelete(userId);

            return {
                success: true,
                message: 'Blog deleted successfully'
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to delete blog');
        }
    }

    /**
     * Update blog status
     */
    async updateBlogStatus(blogId, userId, status) {
        try {
            const validStatuses = ['draft', 'published', 'scheduled', 'archived'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const blog = await Blog.findOne({ _id: blogId, isDeleted: { $ne: true } });

            if (!blog) {
                throw new Error('Blog not found');
            }

            blog.status = status;
            blog.updatedBy = userId;

            await blog.save();

            return {
                success: true,
                message: 'Blog status updated successfully',
                data: blog
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to update blog status');
        }
    }

    /**
     * Get blog statistics
     */
    async getBlogStats() {
        try {
            const [
                totalBlogs,
                publishedBlogs,
                draftBlogs,
                scheduledBlogs,
                archivedBlogs,
                featuredBlogs
            ] = await Promise.all([
                Blog.countDocuments({ isDeleted: { $ne: true } }),
                Blog.countDocuments({ status: 'published', isDeleted: { $ne: true } }),
                Blog.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
                Blog.countDocuments({ status: 'scheduled', isDeleted: { $ne: true } }),
                Blog.countDocuments({ status: 'archived', isDeleted: { $ne: true } }),
                Blog.countDocuments({ isFeatured: true, status: 'published', isDeleted: { $ne: true } })
            ]);

            // Get total views
            const viewsResult = await Blog.aggregate([
                {
                    $match: { isDeleted: { $ne: true } }
                },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: '$views' }
                    }
                }
            ]);
            const totalViews = viewsResult[0]?.totalViews || 0;

            // Get top performing blogs
            const topBlogs = await Blog.find({ status: 'published', isDeleted: { $ne: true } })
                .populate('category', 'name')
                .populate('author', 'firstName lastName')
                .select('title views publishedAt')
                .sort({ views: -1 })
                .limit(5)
                .lean();

            // Get recent blogs
            const recentBlogs = await Blog.find({ isDeleted: { $ne: true } })
                .populate('category', 'name')
                .populate('author', 'firstName lastName')
                .select('title status createdAt')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();

            return {
                success: true,
                data: {
                    totalBlogs,
                    publishedBlogs,
                    draftBlogs,
                    scheduledBlogs,
                    archivedBlogs,
                    featuredBlogs,
                    totalViews,
                    topBlogs,
                    recentBlogs
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blog statistics');
        }
    }

    /**
     * Get blogs by tag
     */
    async getBlogsByTag(tag, filters = {}) {
        try {
            const query = {
                status: 'published',
                isDeleted: { $ne: true },
                tags: tag
            };

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const skip = (page - 1) * limit;

            const [blogs, total] = await Promise.all([
                Blog.find(query)
                    .populate('category', 'name slug')
                    .populate('author', 'firstName lastName avatar')
                    .select('-content')
                    .sort({ publishedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Blog.countDocuments(query)
            ]);

            return {
                success: true,
                data: blogs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get blogs by tag');
        }
    }

    /**
     * Get all unique tags
     */
    async getAllTags() {
        try {
            const tags = await Blog.distinct('tags', { status: 'published', isDeleted: { $ne: true } });

            return {
                success: true,
                data: tags.filter(tag => tag && tag.trim() !== '')
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to get tags');
        }
    }

    /**
     * Publish scheduled blogs
     */
    async publishScheduledBlogs() {
        try {
            const now = new Date();

            const result = await Blog.updateMany(
                {
                    status: 'scheduled',
                    scheduledAt: { $lte: now },
                    isDeleted: { $ne: true }
                },
                {
                    $set: {
                        status: 'published',
                        publishedAt: now
                    }
                }
            );

            return {
                success: true,
                message: `${result.modifiedCount} blogs published`,
                data: { publishedCount: result.modifiedCount }
            };

        } catch (error) {
            throw new Error(error.message || 'Failed to publish scheduled blogs');
        }
    }
}

module.exports = new BlogService();
