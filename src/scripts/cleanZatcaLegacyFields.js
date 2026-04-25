/**
 * Migration Script: Clean Legacy ZATCA Fields
 *
 * This script removes all legacy flat ZATCA credential fields from company documents.
 * After this migration, only the new B2B/B2C nested structure within environments will remain.
 *
 * Run with: node src/scripts/cleanZatcaLegacyFields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing';

async function cleanLegacyFields() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const companiesCollection = db.collection('companies');

        // Find all companies with zatcaCredentials
        const companies = await companiesCollection.find({
            zatcaCredentials: { $exists: true }
        }).toArray();

        console.log(`Found ${companies.length} companies with zatcaCredentials`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const company of companies) {
            try {
                // ========================================
                // STEP 1: Remove all legacy fields using $unset
                // ========================================
                const unsets = {};

                // Legacy ROOT-LEVEL fields to remove
                const legacyRootFields = [
                    'zatcaCredentials.status',
                    'zatcaCredentials.csr',
                    'zatcaCredentials.privateKey',
                    'zatcaCredentials.complianceCertificate',
                    'zatcaCredentials.complianceSecret',
                    'zatcaCredentials.complianceRequestId',
                    'zatcaCredentials.productionCSID',
                    'zatcaCredentials.productionSecret',
                    'zatcaCredentials.environment',
                    'zatcaCredentials.onboardedAt',
                    'zatcaCredentials.hashChainCounter',
                    'zatcaCredentials.previousInvoiceHash',
                    'zatcaCredentials.hashChainCounterB2B',
                    'zatcaCredentials.hashChainCounterB2C',
                    'zatcaCredentials.previousInvoiceHashB2B',
                    'zatcaCredentials.previousInvoiceHashB2C',
                    'zatcaCredentials.lastHashChainUpdate',
                    'zatcaCredentials.lastHashChainUpdateB2B',
                    'zatcaCredentials.lastHashChainUpdateB2C',
                    'zatcaCredentials.businessType',
                    'zatcaCredentials.b2bEnabled',
                    'zatcaCredentials.b2cEnabled',
                    // Legacy progression fields
                    'zatcaCredentials.progression.completedEnvironments',
                    'zatcaCredentials.progression.productionLocked',
                    'zatcaCredentials.progression.productionLockedAt'
                ];

                legacyRootFields.forEach(field => {
                    unsets[field] = '';
                });

                // Legacy FLAT fields from each environment
                const environments = ['sandbox', 'simulation', 'production'];
                const legacyEnvFields = [
                    'status',
                    'csr',
                    'privateKey',
                    'complianceCertificate',
                    'complianceSecret',
                    'complianceRequestId',
                    'productionCSID',
                    'productionSecret',
                    'onboardedAt',
                    'updatedAt',
                    'createdAt',
                    'hashChainCounterB2B',
                    'hashChainCounterB2C',
                    'previousInvoiceHashB2B',
                    'previousInvoiceHashB2C',
                    'hashChainCounter',
                    'previousInvoiceHash'
                ];

                environments.forEach(env => {
                    legacyEnvFields.forEach(field => {
                        unsets[`zatcaCredentials.environments.${env}.${field}`] = '';
                    });
                });

                // Execute $unset operation
                if (Object.keys(unsets).length > 0) {
                    await companiesCollection.updateOne(
                        { _id: company._id },
                        { $unset: unsets }
                    );
                }

                // ========================================
                // STEP 2: Ensure proper structure exists using $set
                // ========================================
                const creds = company.zatcaCredentials || {};
                const sets = {};

                // Ensure progression has new B2B/B2C fields
                if (!creds.progression?.b2bCompletedEnvironments) {
                    sets['zatcaCredentials.progression.b2bCompletedEnvironments'] = [];
                }
                if (!creds.progression?.b2cCompletedEnvironments) {
                    sets['zatcaCredentials.progression.b2cCompletedEnvironments'] = [];
                }
                if (creds.progression?.b2bProductionLocked === undefined) {
                    sets['zatcaCredentials.progression.b2bProductionLocked'] = false;
                }
                if (creds.progression?.b2cProductionLocked === undefined) {
                    sets['zatcaCredentials.progression.b2cProductionLocked'] = false;
                }
                if (!creds.progression?.skippedEnvironments) {
                    sets['zatcaCredentials.progression.skippedEnvironments'] = [];
                }

                // Ensure environments have b2b and b2c sub-objects
                environments.forEach(env => {
                    const envData = creds.environments?.[env];
                    if (!envData?.b2b) {
                        sets[`zatcaCredentials.environments.${env}.b2b`] = {
                            status: 'not_started',
                            hashChainCounter: 0,
                            previousInvoiceHash: null
                        };
                    }
                    if (!envData?.b2c) {
                        sets[`zatcaCredentials.environments.${env}.b2c`] = {
                            status: 'not_started',
                            hashChainCounter: 0,
                            previousInvoiceHash: null
                        };
                    }
                });

                // Execute $set operation if needed
                if (Object.keys(sets).length > 0) {
                    await companiesCollection.updateOne(
                        { _id: company._id },
                        { $set: sets }
                    );
                }

                updatedCount++;
                console.log(`Updated company: ${company.companyName} (${company._id})`);

            } catch (err) {
                errorCount++;
                console.error(`Error updating company ${company._id}:`, err.message);
            }
        }

        console.log('\n========================================');
        console.log('Migration Complete!');
        console.log(`Total companies processed: ${companies.length}`);
        console.log(`Successfully updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
cleanLegacyFields();
