// Script to delete all customers from the database
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing_solution', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

// Delete all customers
const deleteAllCustomers = async () => {
    try {
        console.log('Starting to delete all customers...');

        // Get count before deletion
        const countBefore = await Customer.countDocuments({});
        console.log(`Found ${countBefore} customers to delete`);

        // Delete all customers (hard delete, not soft delete)
        const result = await Customer.deleteMany({});

        console.log(`Successfully deleted ${result.deletedCount} customers`);

        // Verify deletion
        const countAfter = await Customer.countDocuments({});
        console.log(`Remaining customers: ${countAfter}`);

        if (countAfter === 0) {
            console.log('✅ All customers have been successfully deleted!');
        } else {
            console.log('⚠️  Some customers may still remain in the database');
        }

    } catch (error) {
        console.error('Error deleting customers:', error);
    }
};

// Main execution
const main = async () => {
    await connectDB();
    await deleteAllCustomers();
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
};

// Run the script
main().catch(error => {
    console.error('Script execution error:', error);
    process.exit(1);
});