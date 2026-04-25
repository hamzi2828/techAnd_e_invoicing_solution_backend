// seeders/productSeeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

// User ID to seed products for
const USER_ID = '68b741c85f4ef5778646f0b2';
// Function to get category IDs after seeding
async function getCategoryIds() {
    const categories = await Category.find({ userId: USER_ID });
    const subcategories = categories.filter(c => c.parentId !== null);

    return {
        electronics: categories.find(c => c.slug === 'electronics')?._id,
        officeSupplies: categories.find(c => c.slug === 'office-supplies')?._id,
        software: categories.find(c => c.slug === 'software-licenses')?._id,
        services: categories.find(c => c.slug === 'services')?._id,
        furniture: categories.find(c => c.slug === 'furniture')?._id,
        medical: categories.find(c => c.slug === 'medical-equipment')?._id,
        // Subcategories
        computersLaptops: subcategories.find(c => c.slug === 'computers-laptops')?._id,
        mobileDevices: subcategories.find(c => c.slug === 'mobile-devices')?._id,
        stationery: subcategories.find(c => c.slug === 'stationery')?._id,
        consulting: subcategories.find(c => c.slug === 'consulting')?._id,
        desksChairs: subcategories.find(c => c.slug === 'desks-tables')?._id,
        chairs: subcategories.find(c => c.slug === 'chairs-seating')?._id
    };
}

// Function to create products data (requires category IDs)
function createProductsData(categoryIds) {
    return [
        {
            userId: USER_ID,
            companyId: null,
            name: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse with 2.4GHz connectivity and precision optical sensor. Compatible with Windows and Mac.',
            shortDescription: 'Ergonomic wireless mouse with precision sensor',
            sku: 'TECH-MOUSE-001',
            category: categoryIds.electronics,
            subcategory: categoryIds.computersLaptops,
            price: 129.99,
            costPrice: 65.00,
            unit: 'piece',
            taxRate: 15,
            stock: 150,
            minStock: 20,
            maxStock: 500,
            barcode: '8901234567890',
            status: 'active',
            tags: ['electronics', 'peripherals', 'wireless'],
            weight: 0.085,
            dimensions: {
                length: 11.5,
                width: 6.2,
                height: 3.8
            },
            images: [],
            attributes: [
                { name: 'Color', value: 'Black' },
                { name: 'Connectivity', value: 'Wireless 2.4GHz' },
                { name: 'Battery Life', value: '12 months' },
                { name: 'DPI', value: '1600' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Mechanical Keyboard',
            description: 'Professional mechanical keyboard with RGB backlighting, Cherry MX switches, and programmable keys. Perfect for gaming and typing.',
            shortDescription: 'RGB mechanical keyboard with Cherry MX switches',
            sku: 'TECH-KB-001',
            category: categoryIds.electronics,
            subcategory: categoryIds.computersLaptops,
            price: 499.99,
            costPrice: 275.00,
            unit: 'piece',
            taxRate: 15,
            stock: 75,
            minStock: 10,
            maxStock: 200,
            barcode: '8901234567891',
            status: 'active',
            tags: ['electronics', 'peripherals', 'keyboard', 'gaming'],
            weight: 1.2,
            dimensions: {
                length: 44.0,
                width: 13.5,
                height: 3.5
            },
            images: [],
            attributes: [
                { name: 'Switch Type', value: 'Cherry MX Blue' },
                { name: 'Backlighting', value: 'RGB' },
                { name: 'Layout', value: 'Full Size' },
                { name: 'Cable', value: 'Detachable USB-C' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Premium Office Chair',
            description: 'Ergonomic office chair with lumbar support, adjustable armrests, and breathable mesh back. Suitable for 8+ hours of daily use.',
            shortDescription: 'Ergonomic mesh office chair with lumbar support',
            sku: 'OFF-CHAIR-001',
            category: categoryIds.furniture,
            subcategory: categoryIds.chairs,
            price: 1299.00,
            costPrice: 750.00,
            unit: 'piece',
            taxRate: 15,
            stock: 25,
            minStock: 5,
            maxStock: 100,
            barcode: '8901234567892',
            status: 'active',
            tags: ['office', 'furniture', 'ergonomic'],
            weight: 18.5,
            dimensions: {
                length: 68.0,
                width: 68.0,
                height: 120.0
            },
            images: [],
            attributes: [
                { name: 'Material', value: 'Mesh & Aluminum' },
                { name: 'Weight Capacity', value: '150 kg' },
                { name: 'Adjustable Height', value: 'Yes' },
                { name: 'Warranty', value: '5 years' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'A4 Printer Paper Pack',
            description: '500 sheets of high-quality A4 white printer paper. 80gsm weight, suitable for laser and inkjet printers.',
            shortDescription: 'A4 white printer paper - 500 sheets',
            sku: 'OFF-PAPER-500',
            category: categoryIds.officeSupplies,
            subcategory: categoryIds.stationery,
            price: 25.00,
            costPrice: 12.50,
            unit: 'piece',
            taxRate: 15,
            stock: 500,
            minStock: 100,
            maxStock: 2000,
            barcode: '8901234567893',
            status: 'active',
            tags: ['office', 'stationery', 'paper'],
            weight: 2.5,
            dimensions: {
                length: 29.7,
                width: 21.0,
                height: 5.0
            },
            images: [],
            attributes: [
                { name: 'Size', value: 'A4 (210 x 297 mm)' },
                { name: 'Weight', value: '80 gsm' },
                { name: 'Sheets', value: '500' },
                { name: 'Brightness', value: '95%' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'IT Consulting Service',
            description: 'Professional IT consulting services including system analysis, solution design, and implementation support. Billed hourly.',
            shortDescription: 'Professional IT consulting and solution design',
            sku: 'SRV-IT-CONSULT',
            category: categoryIds.services,
            subcategory: categoryIds.consulting,
            price: 350.00,
            costPrice: 0,
            unit: 'hour',
            taxRate: 15,
            stock: 0,
            minStock: 0,
            maxStock: 0,
            barcode: '',
            status: 'active',
            tags: ['services', 'consulting', 'IT', 'professional'],
            weight: 0,
            dimensions: {
                length: 0,
                width: 0,
                height: 0
            },
            images: [],
            attributes: [
                { name: 'Service Type', value: 'Consulting' },
                { name: 'Expertise', value: 'IT & Software' },
                { name: 'Minimum Hours', value: '2' },
                { name: 'Response Time', value: '24 hours' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Dell Latitude Laptop',
            description: 'Business laptop with Intel i7 processor, 16GB RAM, 512GB SSD. Perfect for professionals and business users.',
            shortDescription: 'Dell business laptop - i7, 16GB RAM, 512GB SSD',
            sku: 'TECH-LAP-001',
            category: categoryIds.electronics,
            subcategory: categoryIds.computersLaptops,
            price: 4299.00,
            costPrice: 3200.00,
            unit: 'piece',
            taxRate: 15,
            stock: 15,
            minStock: 5,
            maxStock: 50,
            barcode: '8901234567894',
            status: 'active',
            tags: ['electronics', 'laptop', 'business'],
            weight: 1.8,
            dimensions: {
                length: 32.0,
                width: 22.0,
                height: 2.0
            },
            images: [],
            attributes: [
                { name: 'Processor', value: 'Intel Core i7' },
                { name: 'RAM', value: '16GB DDR4' },
                { name: 'Storage', value: '512GB SSD' },
                { name: 'Display', value: '14" FHD' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Samsung Galaxy S23',
            description: 'Latest Samsung flagship smartphone with advanced camera system and 5G connectivity.',
            shortDescription: 'Samsung flagship smartphone with 5G',
            sku: 'TECH-PHONE-001',
            category: categoryIds.electronics,
            subcategory: categoryIds.mobileDevices,
            price: 3299.00,
            costPrice: 2500.00,
            unit: 'piece',
            taxRate: 15,
            stock: 30,
            minStock: 10,
            maxStock: 100,
            barcode: '8901234567895',
            status: 'active',
            tags: ['electronics', 'smartphone', '5G'],
            weight: 0.168,
            dimensions: {
                length: 14.6,
                width: 7.1,
                height: 0.8
            },
            images: [],
            attributes: [
                { name: 'Display', value: '6.1" AMOLED' },
                { name: 'Storage', value: '256GB' },
                { name: 'Camera', value: '50MP Triple' },
                { name: 'Battery', value: '3900mAh' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Executive Desk',
            description: 'Premium executive desk with built-in cable management. Made from solid wood with elegant finish.',
            shortDescription: 'Premium executive desk with cable management',
            sku: 'FURN-DESK-001',
            category: categoryIds.furniture,
            subcategory: categoryIds.desksChairs,
            price: 2499.00,
            costPrice: 1500.00,
            unit: 'piece',
            taxRate: 15,
            stock: 10,
            minStock: 3,
            maxStock: 30,
            barcode: '8901234567896',
            status: 'active',
            tags: ['furniture', 'desk', 'executive'],
            weight: 45.0,
            dimensions: {
                length: 180.0,
                width: 90.0,
                height: 75.0
            },
            images: [],
            attributes: [
                { name: 'Material', value: 'Solid Wood' },
                { name: 'Finish', value: 'Walnut' },
                { name: 'Drawers', value: '3' },
                { name: 'Assembly', value: 'Required' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Microsoft 365 Business License',
            description: 'Annual subscription for Microsoft 365 Business Standard including Office apps, email, and cloud storage.',
            shortDescription: 'Microsoft 365 Business annual license',
            sku: 'SOFT-MS365-001',
            category: categoryIds.software,
            subcategory: null,
            price: 499.00,
            costPrice: 350.00,
            unit: 'piece',
            taxRate: 15,
            stock: 100,
            minStock: 20,
            maxStock: 500,
            barcode: '8901234567897',
            status: 'active',
            tags: ['software', 'microsoft', 'license', 'productivity'],
            weight: 0,
            dimensions: {
                length: 0,
                width: 0,
                height: 0
            },
            images: [],
            attributes: [
                { name: 'Duration', value: '1 Year' },
                { name: 'Users', value: '1' },
                { name: 'Storage', value: '1TB OneDrive' },
                { name: 'Apps', value: 'Word, Excel, PowerPoint, Outlook' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        },
        {
            userId: USER_ID,
            companyId: null,
            name: 'Ballpoint Pens - Box of 50',
            description: 'High-quality blue ballpoint pens, smooth writing, suitable for everyday use.',
            shortDescription: 'Blue ballpoint pens - 50 pack',
            sku: 'OFF-PEN-050',
            category: categoryIds.officeSupplies,
            subcategory: categoryIds.stationery,
            price: 45.00,
            costPrice: 22.50,
            unit: 'piece',
            taxRate: 15,
            stock: 200,
            minStock: 50,
            maxStock: 1000,
            barcode: '8901234567898',
            status: 'active',
            tags: ['stationery', 'pens', 'office'],
            weight: 0.5,
            dimensions: {
                length: 15.0,
                width: 10.0,
                height: 5.0
            },
            images: [],
            attributes: [
                { name: 'Quantity', value: '50 pens' },
                { name: 'Ink Color', value: 'Blue' },
                { name: 'Tip Size', value: '0.7mm' },
                { name: 'Brand', value: 'Premium Write' }
            ],
            createdBy: USER_ID,
            updatedBy: USER_ID
        }
    ];
}

// Function to seed products
async function seedProducts() {
    try {
        // Connect to MongoDB (if not already connected)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing_solution');
            console.log('Connected to MongoDB');
        }

        // Get category IDs
        const categoryIds = await getCategoryIds();

        if (!categoryIds.electronics || !categoryIds.officeSupplies || !categoryIds.services || !categoryIds.software || !categoryIds.furniture) {
            console.error('Categories not found! Please run categorySeeder first.');
            throw new Error('Required categories not found. Run: node seeders/categorySeeder.js');
        }

        console.log('Found categories:', {
            electronics: categoryIds.electronics?.toString(),
            officeSupplies: categoryIds.officeSupplies?.toString(),
            software: categoryIds.software?.toString(),
            services: categoryIds.services?.toString(),
            furniture: categoryIds.furniture?.toString()
        });

        // Create products data with category IDs
        const productsData = createProductsData(categoryIds);

        // Clear existing products for the user
        const deleteResult = await Product.deleteMany({ userId: USER_ID });
        console.log(`Deleted ${deleteResult.deletedCount} existing products for user ${USER_ID}`);

        // Insert new products
        const insertResult = await Product.insertMany(productsData);
        console.log(`Successfully seeded ${insertResult.length} products for user ${USER_ID}`);

        // Update category product counts
        for (const categoryId of Object.values(categoryIds)) {
            const count = await Product.countDocuments({ category: categoryId });
            await Category.findByIdAndUpdate(categoryId, { productsCount: count });
        }
        console.log('Updated category product counts');

        // Display summary
        console.log('\n=== PRODUCTS SEEDED ===');
        for (const product of insertResult) {
            const category = await Category.findById(product.category);
            console.log(`${insertResult.indexOf(product) + 1}. ${product.name}`);
            console.log(`   SKU: ${product.sku}`);
            console.log(`   Category: ${category?.name || 'N/A'}`);
            console.log(`   Price: SAR ${product.price.toFixed(2)}`);
            console.log(`   Stock: ${product.stock} ${product.unit}(s)`);
            console.log(`   Status: ${product.status}`);
            console.log(`   ID: ${product._id}`);
            console.log('');
        }

        // Verify the seeded data
        const count = await Product.countDocuments({ userId: USER_ID });
        console.log(`Total products for user ${USER_ID}: ${count}`);

        // Display statistics
        const activeProducts = await Product.countDocuments({ userId: USER_ID, status: 'active' });
        const totalValue = await Product.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(USER_ID) } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
        ]);

        console.log('\n=== STATISTICS ===');
        console.log(`Active Products: ${activeProducts}`);
        console.log(`Total Inventory Value: SAR ${totalValue[0]?.total?.toFixed(2) || '0.00'}`);

        return insertResult;

    } catch (error) {
        console.error('Error seeding products:', error);
        throw error;
    }
}

// Function to clean up products
async function cleanupProducts() {
    try {
        const deleteResult = await Product.deleteMany({ userId: USER_ID });
        console.log(`Deleted ${deleteResult.deletedCount} products for user ${USER_ID}`);

        // Reset category product counts
        await Category.updateMany({ userId: USER_ID }, { productsCount: 0 });
        console.log('Reset category product counts');

        return deleteResult;
    } catch (error) {
        console.error('Error cleaning up products:', error);
        throw error;
    }
}

// Run seeder if called directly
if (require.main === module) {
    seedProducts()
        .then(() => {
            console.log('Product seeding completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Product seeding failed:', error);
            process.exit(1);
        });
}

module.exports = {
    seedProducts,
    cleanupProducts,
    USER_ID
};
