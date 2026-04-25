// seeders/categorySeeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

// User ID to seed categories for
const USER_ID = '68b741c85f4ef5778646f0b2';

// Sample categories data
const categoriesData = [
    {
        userId: USER_ID,
        companyId: null,
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        slug: 'electronics',
        icon: 'laptop',
        color: '#3B82F6',
        status: 'active',
        sortOrder: 1,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Office Supplies',
        description: 'Office equipment and stationery',
        slug: 'office-supplies',
        icon: 'briefcase',
        color: '#10B981',
        status: 'active',
        sortOrder: 2,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Software & Licenses',
        description: 'Software products and licensing',
        slug: 'software-licenses',
        icon: 'code',
        color: '#8B5CF6',
        status: 'active',
        sortOrder: 3,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Services',
        description: 'Professional and consulting services',
        slug: 'services',
        icon: 'settings',
        color: '#F59E0B',
        status: 'active',
        sortOrder: 4,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Furniture',
        description: 'Office furniture and fixtures',
        slug: 'furniture',
        icon: 'home',
        color: '#EF4444',
        status: 'active',
        sortOrder: 5,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Medical Equipment',
        description: 'Healthcare and medical devices',
        slug: 'medical-equipment',
        icon: 'heart',
        color: '#EC4899',
        status: 'active',
        sortOrder: 6,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Construction Materials',
        description: 'Building and construction supplies',
        slug: 'construction-materials',
        icon: 'tool',
        color: '#F97316',
        status: 'active',
        sortOrder: 7,
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        companyId: null,
        name: 'Food & Beverages',
        description: 'Food products and drinks',
        slug: 'food-beverages',
        icon: 'coffee',
        color: '#84CC16',
        status: 'active',
        sortOrder: 8,
        createdBy: USER_ID,
        updatedBy: USER_ID
    }
];

// Function to seed categories
async function seedCategories() {
    try {
        // Connect to MongoDB (if not already connected)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing_solution');
            console.log('Connected to MongoDB');
        }

        // Clear ALL existing categories (to avoid slug conflicts from old data)
        const deleteResult = await Category.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} existing categories from database\n`);

        // Insert parent categories
        console.log('📁 Creating parent categories...');
        const insertResult = await Category.insertMany(categoriesData);
        console.log(`✅ Successfully seeded ${insertResult.length} parent categories for user ${USER_ID}\n`);

        // Create subcategories
        console.log('📑 Creating subcategories...');

        // Find parent category IDs
        const electronicsParent = insertResult.find(c => c.name === 'Electronics');
        const officeParent = insertResult.find(c => c.name === 'Office Supplies');
        const softwareParent = insertResult.find(c => c.name === 'Software & Licenses');
        const servicesParent = insertResult.find(c => c.name === 'Services');
        const furnitureParent = insertResult.find(c => c.name === 'Furniture');
        const medicalParent = insertResult.find(c => c.name === 'Medical Equipment');

        // Subcategories data
        const subcategoriesData = [
            // Electronics subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Computers & Laptops',
                description: 'Desktop computers, laptops, and accessories',
                slug: 'computers-laptops',
                icon: 'monitor',
                color: '#3B82F6',
                status: 'active',
                parentId: electronicsParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Mobile Devices',
                description: 'Smartphones, tablets, and accessories',
                slug: 'mobile-devices',
                icon: 'smartphone',
                color: '#3B82F6',
                status: 'active',
                parentId: electronicsParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Printers & Scanners',
                description: 'Printing and scanning equipment',
                slug: 'printers-scanners',
                icon: 'printer',
                color: '#3B82F6',
                status: 'active',
                parentId: electronicsParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Networking Equipment',
                description: 'Routers, switches, and network devices',
                slug: 'networking-equipment',
                icon: 'wifi',
                color: '#3B82F6',
                status: 'active',
                parentId: electronicsParent._id,
                sortOrder: 4,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            // Office Supplies subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Stationery',
                description: 'Pens, papers, notebooks, and writing materials',
                slug: 'stationery',
                icon: 'edit',
                color: '#10B981',
                status: 'active',
                parentId: officeParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Filing & Storage',
                description: 'Files, folders, and storage solutions',
                slug: 'filing-storage',
                icon: 'folder',
                color: '#10B981',
                status: 'active',
                parentId: officeParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Desk Accessories',
                description: 'Organizers, calendars, and desk items',
                slug: 'desk-accessories',
                icon: 'inbox',
                color: '#10B981',
                status: 'active',
                parentId: officeParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            // Software & Licenses subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Operating Systems',
                description: 'Windows, macOS, Linux licenses',
                slug: 'operating-systems',
                icon: 'disc',
                color: '#8B5CF6',
                status: 'active',
                parentId: softwareParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Productivity Software',
                description: 'Office suites, project management tools',
                slug: 'productivity-software',
                icon: 'file-text',
                color: '#8B5CF6',
                status: 'active',
                parentId: softwareParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Design Software',
                description: 'Graphics, video, and design applications',
                slug: 'design-software',
                icon: 'image',
                color: '#8B5CF6',
                status: 'active',
                parentId: softwareParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Security Software',
                description: 'Antivirus, firewall, and security tools',
                slug: 'security-software',
                icon: 'shield',
                color: '#8B5CF6',
                status: 'active',
                parentId: softwareParent._id,
                sortOrder: 4,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            // Services subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Consulting',
                description: 'Business and technical consulting services',
                slug: 'consulting',
                icon: 'users',
                color: '#F59E0B',
                status: 'active',
                parentId: servicesParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Maintenance & Support',
                description: 'Equipment maintenance and technical support',
                slug: 'maintenance-support',
                icon: 'tool',
                color: '#F59E0B',
                status: 'active',
                parentId: servicesParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Training',
                description: 'Professional training and development',
                slug: 'training',
                icon: 'book',
                color: '#F59E0B',
                status: 'active',
                parentId: servicesParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Installation Services',
                description: 'Product installation and setup',
                slug: 'installation-services',
                icon: 'package',
                color: '#F59E0B',
                status: 'active',
                parentId: servicesParent._id,
                sortOrder: 4,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            // Furniture subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Desks & Tables',
                description: 'Office desks, conference tables',
                slug: 'desks-tables',
                icon: 'square',
                color: '#EF4444',
                status: 'active',
                parentId: furnitureParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Chairs & Seating',
                description: 'Office chairs and seating solutions',
                slug: 'chairs-seating',
                icon: 'circle',
                color: '#EF4444',
                status: 'active',
                parentId: furnitureParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Storage Cabinets',
                description: 'File cabinets and storage units',
                slug: 'storage-cabinets',
                icon: 'archive',
                color: '#EF4444',
                status: 'active',
                parentId: furnitureParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            // Medical Equipment subcategories
            {
                userId: USER_ID,
                companyId: null,
                name: 'Diagnostic Equipment',
                description: 'Medical diagnostic devices and tools',
                slug: 'diagnostic-equipment',
                icon: 'activity',
                color: '#EC4899',
                status: 'active',
                parentId: medicalParent._id,
                sortOrder: 1,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Surgical Instruments',
                description: 'Surgical tools and instruments',
                slug: 'surgical-instruments',
                icon: 'crosshair',
                color: '#EC4899',
                status: 'active',
                parentId: medicalParent._id,
                sortOrder: 2,
                createdBy: USER_ID,
                updatedBy: USER_ID
            },
            {
                userId: USER_ID,
                companyId: null,
                name: 'Patient Monitoring',
                description: 'Patient monitoring systems',
                slug: 'patient-monitoring',
                icon: 'eye',
                color: '#EC4899',
                status: 'active',
                parentId: medicalParent._id,
                sortOrder: 3,
                createdBy: USER_ID,
                updatedBy: USER_ID
            }
        ];

        const subcategories = await Category.insertMany(subcategoriesData);
        console.log(`✅ Successfully seeded ${subcategories.length} subcategories\n`);

        // Display summary with hierarchy
        console.log('=== CATEGORIES HIERARCHY ===\n');
        insertResult.forEach((parent) => {
            console.log(`📁 ${parent.name} (ID: ${parent._id})`);
            console.log(`   Slug: ${parent.slug} | Icon: ${parent.icon} | Color: ${parent.color}`);

            const subs = subcategories.filter(s => s.parentId && s.parentId.equals(parent._id));
            if (subs.length > 0) {
                subs.forEach(sub => {
                    console.log(`   └─ 📑 ${sub.name} (ID: ${sub._id})`);
                });
            }
            console.log('');
        });

        console.log(`\n📊 Total: ${insertResult.length} parent categories, ${subcategories.length} subcategories`);

        return { parents: insertResult, subcategories };

    } catch (error) {
        console.error('Error seeding categories:', error);
        throw error;
    }
}

// Function to clean up categories
async function cleanupCategories() {
    try {
        const deleteResult = await Category.deleteMany({ userId: USER_ID });
        console.log(`Deleted ${deleteResult.deletedCount} categories for user ${USER_ID}`);
        return deleteResult;
    } catch (error) {
        console.error('Error cleaning up categories:', error);
        throw error;
    }
}

// Run seeder if called directly
if (require.main === module) {
    seedCategories()
        .then(() => {
            console.log('Category seeding completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Category seeding failed:', error);
            process.exit(1);
        });
}

module.exports = {
    seedCategories,
    cleanupCategories,
    categoriesData,
    USER_ID
};
