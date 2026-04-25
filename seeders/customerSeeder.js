// seeders/customerSeeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');

// User ID to seed customers for
const USER_ID = '68b741c85f4ef5778646f0b2';

// ZATCA-Compliant Saudi Arabia customers - Only 2 customers
const customersData = [
    {
        userId: USER_ID,
        customerName: 'Al-Rashid Trading Company',
        customerType: 'company',

        // Basic Information
        commercialRegistrationNumber: '1010101010',
        industry: 'Trading & Commerce',
        website: 'https://alrashid-trading.com',
        customerGroup: 'Corporate',

        // Contact Information
        contactInfo: {
            email: 'finance@alrashid-trading.com',
            phone: '+966112345678',
            contactPerson: 'Ahmed Al-Rashid'
        },

        // ZATCA-Compliant Address Information
        address: {
            street: 'King Fahd Road',
            city: 'Riyadh',
            state: 'Riyadh Province',
            postalCode: '11564',
            country: 'SA',
            buildingNumber: '2322',
            district: 'Al-Olaya',
            plotIdentification: '1234',
            addressAdditionalNumber: '45',
            postbox: 'P.O. Box 12345'
        },

        // Compliance Information (ZATCA VAT)
        complianceInfo: {
            taxId: '300123456789003',
            businessLicense: 'BL-2024-001',
            sanctionScreened: true,
            screenedAt: new Date('2024-01-15'),
            riskRating: 'low'
        },

        // Banking Information
        bankInfo: {
            bankName: 'Saudi National Bank',
            accountNumber: '1234567890123456',
            iban: 'SA1510000001234567890123456',
            swiftCode: 'NCBKSAJE',
            currency: 'SAR'
        },

        // Payment Limits
        paymentLimits: {
            dailyLimit: 500000,
            monthlyLimit: 5000000,
            perTransactionLimit: 200000
        },

        // Status Information
        status: 'active',
        verificationStatus: 'verified',
        isActive: true,

        // Additional Information
        tags: ['VIP', 'Corporate', 'Supplier'],
        referenceNumber: 'CUST-ART-001',
        source: 'Website',
        assignedTo: 'sales@company.com',
        priority: 'High',
        notes: 'Preferred supplier for office equipment and supplies',

        // Payment Methods
        paymentMethods: [
            {
                method: 'local_transfer',
                isPreferred: true,
                metadata: {
                    processingDays: '0-1',
                    fee: 25
                }
            }
        ],

        // Financial tracking
        lastPaymentDate: new Date('2024-03-01'),
        totalPaymentsReceived: 250000,
        paymentCount: 5,

        // Audit fields
        createdBy: USER_ID,
        updatedBy: USER_ID
    },
    {
        userId: USER_ID,
        customerName: 'Sara Al-Ghamdi',
        customerType: 'individual',

        // Basic Information
        commercialRegistrationNumber: '',
        industry: 'Freelance Consulting',
        website: '',
        customerGroup: 'Individual',

        // Contact Information
        contactInfo: {
            email: 'sara.ghamdi@email.sa',
            phone: '+966501234567',
            contactPerson: ''
        },

        // ZATCA-Compliant Address Information
        address: {
            street: 'Al-Tahlia Street',
            city: 'Jeddah',
            state: 'Makkah Province',
            postalCode: '21564',
            country: 'SA',
            buildingNumber: '3456',
            district: 'Al-Rawdah',
            plotIdentification: '9876',
            addressAdditionalNumber: 'Apt 201',
            postbox: ''
        },

        // Compliance Information (ZATCA VAT)
        complianceInfo: {
            taxId: '311234567890003',
            businessLicense: '',
            sanctionScreened: false,
            riskRating: 'low'
        },

        // Banking Information
        bankInfo: {
            bankName: 'Al Rajhi Bank',
            accountNumber: '8011111222233334',
            iban: 'SA8080000008011111222233334',
            swiftCode: 'RJHISARI',
            currency: 'SAR'
        },

        // Payment Limits
        paymentLimits: {
            dailyLimit: 50000,
            monthlyLimit: 500000,
            perTransactionLimit: 25000
        },

        // Status Information
        status: 'active',
        verificationStatus: 'verified',
        isActive: true,

        // Additional Information
        tags: ['Individual', 'Consultant'],
        referenceNumber: 'CUST-SAG-002',
        source: 'Social Media',
        assignedTo: 'support@company.com',
        priority: 'Normal',
        notes: 'Freelance business consultant',

        // Payment Methods
        paymentMethods: [
            {
                method: 'local_transfer',
                isPreferred: true,
                metadata: {
                    processingDays: '0-1',
                    fee: 15
                }
            }
        ],

        // Financial tracking
        lastPaymentDate: new Date('2024-03-20'),
        totalPaymentsReceived: 35000,
        paymentCount: 2,

        // Audit fields
        createdBy: USER_ID,
        updatedBy: USER_ID
    }
];

// Function to seed customers
async function seedCustomers() {
    try {
        // Connect to MongoDB (if not already connected)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing_solution');
            console.log('Connected to MongoDB');
        }

        // Clear existing customers for the user
        const deleteResult = await Customer.deleteMany({ userId: USER_ID });
        console.log(`Deleted ${deleteResult.deletedCount} existing customers for user ${USER_ID}`);

        // Insert new customers
        const insertResult = await Customer.insertMany(customersData);
        console.log(`Successfully seeded ${insertResult.length} customers for user ${USER_ID}`);

        // Display summary
        console.log('\n=== CUSTOMERS SEEDED ===');
        insertResult.forEach((customer, index) => {
            console.log(`${index + 1}. ${customer.customerName} (${customer.customerType})`);
            console.log(`   Industry: ${customer.industry || 'N/A'}`);
            console.log(`   Bank: ${customer.bankInfo.bankName}`);
            console.log(`   IBAN: ${customer.bankInfo.iban}`);
            console.log(`   Currency: ${customer.bankInfo.currency}`);
            console.log(`   Status: ${customer.status}/${customer.verificationStatus}`);
            console.log(`   Group: ${customer.customerGroup}`);
            console.log(`   Reference: ${customer.referenceNumber}`);
            console.log(`   ID: ${customer._id}`);
            console.log('');
        });

        // Verify the seeded data
        const count = await Customer.countDocuments({ userId: USER_ID });
        console.log(`Total customers for user ${USER_ID}: ${count}`);

        // Display statistics
        const companies = await Customer.countDocuments({ userId: USER_ID, customerType: 'company' });
        const individuals = await Customer.countDocuments({ userId: USER_ID, customerType: 'individual' });
        const active = await Customer.countDocuments({ userId: USER_ID, status: 'active' });
        const verified = await Customer.countDocuments({ userId: USER_ID, verificationStatus: 'verified' });

        console.log('\n=== STATISTICS ===');
        console.log(`Companies: ${companies}`);
        console.log(`Individuals: ${individuals}`);
        console.log(`Active: ${active}`);
        console.log(`Verified: ${verified}`);

        return insertResult;

    } catch (error) {
        console.error('Error seeding customers:', error);
        throw error;
    }
}

// Function to clean up customers
async function cleanupCustomers() {
    try {
        const deleteResult = await Customer.deleteMany({ userId: USER_ID });
        console.log(`Deleted ${deleteResult.deletedCount} customers for user ${USER_ID}`);
        return deleteResult;
    } catch (error) {
        console.error('Error cleaning up customers:', error);
        throw error;
    }
}

// Run seeder if called directly
if (require.main === module) {
    seedCustomers()
        .then(() => {
            console.log('Customer seeding completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Customer seeding failed:', error);
            process.exit(1);
        });
}

module.exports = {
    seedCustomers,
    cleanupCustomers,
    customersData,
    USER_ID
};