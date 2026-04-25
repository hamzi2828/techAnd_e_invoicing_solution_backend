/**
 * Migration Script: Fix Quotation quoteNumber Index
 *
 * This script drops the old global unique index on quoteNumber and ensures
 * the new compound index (companyId + quoteNumber) is created.
 *
 * Problem: quoteNumber was globally unique, but should be unique per company.
 *
 * Usage:
 *   node src/migrations/fixQuotationIndex.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration(dryRun = false) {
    console.log('='.repeat(60));
    console.log('Fix Quotation Index Migration Script');
    console.log('='.repeat(60));
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE'}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing';
        console.log(`Connecting to MongoDB...`);

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully');
        console.log('');

        const db = mongoose.connection.db;
        const collection = db.collection('quotations');

        // Get current indexes
        console.log('Current indexes on quotations collection:');
        const indexes = await collection.indexes();
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
        });
        console.log('');

        // Check if the old global unique index exists
        const oldIndex = indexes.find(idx =>
            idx.name === 'quoteNumber_1' &&
            idx.unique === true &&
            JSON.stringify(idx.key) === '{"quoteNumber":1}'
        );

        if (oldIndex) {
            console.log('Found old global unique index: quoteNumber_1');

            if (!dryRun) {
                console.log('Dropping old index...');
                await collection.dropIndex('quoteNumber_1');
                console.log('Old index dropped successfully!');
            } else {
                console.log('Would drop old index (dry run)');
            }
        } else {
            console.log('Old global unique index not found (already fixed or never existed)');
        }

        // Check if the new compound index exists
        const newIndex = indexes.find(idx =>
            JSON.stringify(idx.key) === '{"companyId":1,"quoteNumber":1}' &&
            idx.unique === true
        );

        if (newIndex) {
            console.log('');
            console.log('New compound index already exists: companyId_1_quoteNumber_1');
        } else {
            console.log('');
            console.log('New compound index does not exist yet.');

            if (!dryRun) {
                console.log('Creating new compound index...');
                await collection.createIndex(
                    { companyId: 1, quoteNumber: 1 },
                    { unique: true, name: 'companyId_1_quoteNumber_1' }
                );
                console.log('New compound index created successfully!');
            } else {
                console.log('Would create new compound index (dry run)');
            }
        }

        // Show final state
        if (!dryRun) {
            console.log('');
            console.log('Final indexes on quotations collection:');
            const finalIndexes = await collection.indexes();
            finalIndexes.forEach(idx => {
                console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}`);
            });
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('');
        console.log('Disconnected from MongoDB');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

    if (dryRun) {
        console.log('');
        console.log('NOTE: This was a dry run. No changes were made.');
        console.log('Run without --dry-run to apply the migration.');
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

runMigration(dryRun);
