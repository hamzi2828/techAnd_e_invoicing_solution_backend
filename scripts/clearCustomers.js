// Simple script to clear all customers - run with: node scripts/clearCustomers.js
require('dotenv').config();
const mongoose = require('mongoose');

async function clearAllCustomers() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing_solution');
        console.log('Connected to MongoDB');

        // Get the Customer model
        const Customer = mongoose.model('Customer');

        // Count existing customers
        const count = await Customer.countDocuments();
        console.log(`Found ${count} customers`);

        if (count > 0) {
            // Delete all customers
            const result = await Customer.deleteMany({});
            console.log(`✅ Deleted ${result.deletedCount} customers successfully!`);
        } else {
            console.log('No customers found to delete');
        }

        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearAllCustomers();