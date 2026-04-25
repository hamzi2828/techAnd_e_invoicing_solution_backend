// seeders/index.js
const mongoose = require('mongoose');
const { seedCustomers, cleanupCustomers } = require('./customerSeeder');

// Load environment variables
require('dotenv').config();

// Available seeder operations
const operations = {
    seed: 'Seed customers data',
    cleanup: 'Remove all seeded customers',
    reseed: 'Cleanup and then seed fresh data'
};

async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
}

async function runSeeder(operation = 'seed') {
    try {
        await connectDB();

        console.log(`\n🚀 Starting operation: ${operation}`);
        console.log('='.repeat(50));

        switch (operation.toLowerCase()) {
            case 'seed':
                await seedCustomers();
                break;

            case 'cleanup':
                await cleanupCustomers();
                break;

            case 'reseed':
                console.log('🧹 Cleaning up existing data...');
                await cleanupCustomers();
                console.log('\n🌱 Seeding fresh data...');
                await seedCustomers();
                break;

            default:
                console.log('❌ Invalid operation. Available operations:');
                Object.entries(operations).forEach(([key, desc]) => {
                    console.log(`   ${key}: ${desc}`);
                });
                return;
        }

        console.log('\n✅ Operation completed successfully!');

    } catch (error) {
        console.error('\n❌ Operation failed:', error.message);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

// Get operation from command line arguments
const operation = process.argv[2] || 'seed';

// Show help if requested
if (operation === '--help' || operation === '-h') {
    console.log('\n📚 Customer Seeder Help');
    console.log('='.repeat(30));
    console.log('Usage: node seeders/index.js [operation]');
    console.log('\nAvailable operations:');
    Object.entries(operations).forEach(([key, desc]) => {
        console.log(`  ${key.padEnd(10)} - ${desc}`);
    });
    console.log('\nExamples:');
    console.log('  node seeders/index.js seed     # Seed customers');
    console.log('  node seeders/index.js cleanup  # Remove all customers');
    console.log('  node seeders/index.js reseed   # Cleanup and seed fresh data');
    console.log('\nEnvironment variables:');
    console.log('  MONGODB_URI - MongoDB connection string');
    console.log('               Default: mongodb://localhost:27017/e_invoicing');
    process.exit(0);
}

// Run the seeder
runSeeder(operation);