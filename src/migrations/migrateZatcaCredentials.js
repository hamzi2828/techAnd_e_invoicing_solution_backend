/**
 * Migration Script: ZATCA Credentials to Multi-Environment Structure
 *
 * This script migrates companies from the old flat zatcaCredentials structure
 * to the new nested multi-environment structure.
 *
 * Usage:
 *   node src/migrations/migrateZatcaCredentials.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Status mapping from old to new
const STATUS_MAP = {
    'pending': 'not_started',
    'compliance': 'compliance',
    'verified': 'verified'
};

// Migration statistics
let stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    alreadyMigrated: 0,
    errors: 0
};

/**
 * Check if a company has already been migrated
 */
function isAlreadyMigrated(company) {
    const zatca = company.zatcaCredentials;
    if (!zatca) return false;

    // Check for new structure indicators
    return !!(
        zatca.environments ||
        zatca.progression ||
        zatca.activeEnvironment !== undefined ||
        zatca.history?.some(h => h.action === 'migrated_from_legacy')
    );
}

/**
 * Migrate a single company's ZATCA credentials
 */
function migrateCompany(company) {
    const oldCreds = company.zatcaCredentials;

    if (!oldCreds) {
        return { migrated: false, reason: 'No ZATCA credentials' };
    }

    if (isAlreadyMigrated(company)) {
        return { migrated: false, reason: 'Already migrated' };
    }

    // Determine the environment from old structure
    const environment = oldCreds.environment || 'sandbox';
    const oldStatus = oldCreds.status || 'pending';
    const newStatus = STATUS_MAP[oldStatus] || 'not_started';

    // Build the new environment credentials
    const envCredentials = {
        status: newStatus,
        csr: oldCreds.csr,
        privateKey: oldCreds.privateKey,
        complianceCertificate: oldCreds.complianceCertificate,
        complianceSecret: oldCreds.complianceSecret,
        complianceRequestId: oldCreds.complianceRequestId,
        productionCSID: oldCreds.productionCSID,
        productionSecret: oldCreds.productionSecret,
        onboardedAt: oldCreds.onboardedAt,
        createdAt: company.createdAt,
        updatedAt: new Date(),
        // Hash chain data
        hashChainCounterB2B: oldCreds.hashChainCounterB2B || oldCreds.hashChainCounter || 0,
        previousInvoiceHashB2B: oldCreds.previousInvoiceHashB2B || oldCreds.previousInvoiceHash,
        hashChainCounterB2C: oldCreds.hashChainCounterB2C || 0,
        previousInvoiceHashB2C: oldCreds.previousInvoiceHashB2C
    };

    // Determine completed and skipped environments
    const completedEnvironments = [];
    const skippedEnvironments = [];

    // If verified, the environment is completed
    if (newStatus === 'verified') {
        completedEnvironments.push(environment);
    }

    // Determine production lock status
    const productionLocked = environment === 'production' && newStatus === 'verified';

    // Build the new structure
    const newCredentials = {
        // New multi-environment fields
        activeEnvironment: newStatus !== 'not_started' ? environment : null,

        progression: {
            completedEnvironments,
            skippedEnvironments,
            productionLocked,
            productionLockedAt: productionLocked ? oldCreds.onboardedAt : undefined
        },

        environments: {
            sandbox: environment === 'sandbox' ? envCredentials : { status: 'not_started' },
            simulation: environment === 'simulation' ? envCredentials : { status: 'not_started' },
            production: environment === 'production' ? envCredentials : { status: 'not_started' }
        },

        history: [{
            environment,
            action: 'migrated_from_legacy',
            timestamp: new Date(),
            metadata: {
                migratedFrom: {
                    status: oldStatus,
                    environment: environment,
                    hadCSR: !!oldCreds.csr,
                    hadComplianceCert: !!oldCreds.complianceCertificate,
                    hadProductionCSID: !!oldCreds.productionCSID
                }
            }
        }],

        // Keep legacy fields for backward compatibility
        status: oldStatus,
        csr: oldCreds.csr,
        privateKey: oldCreds.privateKey,
        complianceCertificate: oldCreds.complianceCertificate,
        complianceSecret: oldCreds.complianceSecret,
        complianceRequestId: oldCreds.complianceRequestId,
        productionCSID: oldCreds.productionCSID,
        productionSecret: oldCreds.productionSecret,
        environment: environment,
        onboardedAt: oldCreds.onboardedAt,
        hashChainCounterB2B: oldCreds.hashChainCounterB2B,
        previousInvoiceHashB2B: oldCreds.previousInvoiceHashB2B,
        lastHashChainUpdateB2B: oldCreds.lastHashChainUpdateB2B,
        hashChainCounterB2C: oldCreds.hashChainCounterB2C,
        previousInvoiceHashB2C: oldCreds.previousInvoiceHashB2C,
        lastHashChainUpdateB2C: oldCreds.lastHashChainUpdateB2C,
        hashChainCounter: oldCreds.hashChainCounter,
        previousInvoiceHash: oldCreds.previousInvoiceHash,
        lastHashChainUpdate: oldCreds.lastHashChainUpdate
    };

    return {
        migrated: true,
        newCredentials,
        environment,
        oldStatus,
        newStatus
    };
}

/**
 * Run the migration
 */
async function runMigration(dryRun = false) {
    console.log('='.repeat(60));
    console.log('ZATCA Multi-Environment Migration Script');
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

        // Get the Company model
        const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

        // Find all companies with ZATCA credentials
        const companies = await Company.find({
            'zatcaCredentials': { $exists: true }
        });

        stats.total = companies.length;
        console.log(`Found ${stats.total} companies with ZATCA credentials`);
        console.log('-'.repeat(60));

        for (const company of companies) {
            console.log(`\nProcessing company: ${company.companyName} (${company._id})`);

            try {
                const result = migrateCompany(company);

                if (!result.migrated) {
                    if (result.reason === 'Already migrated') {
                        stats.alreadyMigrated++;
                        console.log(`  - Skipped: Already migrated`);
                    } else {
                        stats.skipped++;
                        console.log(`  - Skipped: ${result.reason}`);
                    }
                    continue;
                }

                console.log(`  - Old: status=${result.oldStatus}, env=${result.environment}`);
                console.log(`  - New: status=${result.newStatus}, activeEnv=${result.newCredentials.activeEnvironment}`);
                console.log(`  - Completed envs: ${result.newCredentials.progression.completedEnvironments.join(', ') || 'none'}`);
                console.log(`  - Production locked: ${result.newCredentials.progression.productionLocked}`);

                if (!dryRun) {
                    // Apply the migration
                    await Company.updateOne(
                        { _id: company._id },
                        { $set: { zatcaCredentials: result.newCredentials } }
                    );
                    console.log(`  - Migrated successfully`);
                } else {
                    console.log(`  - Would migrate (dry run)`);
                }

                stats.migrated++;

            } catch (err) {
                stats.errors++;
                console.error(`  - Error: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total companies:     ${stats.total}`);
    console.log(`Migrated:            ${stats.migrated}`);
    console.log(`Already migrated:    ${stats.alreadyMigrated}`);
    console.log(`Skipped:             ${stats.skipped}`);
    console.log(`Errors:              ${stats.errors}`);
    console.log('');
    console.log(`Completed at: ${new Date().toISOString()}`);

    if (dryRun) {
        console.log('');
        console.log('NOTE: This was a dry run. No changes were made.');
        console.log('Run without --dry-run to apply the migration.');
    }
}

/**
 * Rollback migration (restore legacy structure)
 */
async function rollbackMigration(dryRun = false) {
    console.log('='.repeat(60));
    console.log('ZATCA Migration Rollback Script');
    console.log('='.repeat(60));
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE'}`);
    console.log('');

    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing';
        await mongoose.connect(mongoUri);

        const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

        // Find all companies with migration history
        const companies = await Company.find({
            'zatcaCredentials.history.action': 'migrated_from_legacy'
        });

        console.log(`Found ${companies.length} companies to rollback`);

        for (const company of companies) {
            console.log(`\nRolling back: ${company.companyName} (${company._id})`);

            // Find the migration history entry
            const migrationEntry = company.zatcaCredentials.history?.find(
                h => h.action === 'migrated_from_legacy'
            );

            if (!migrationEntry?.metadata?.migratedFrom) {
                console.log(`  - Skipped: No migration metadata found`);
                continue;
            }

            // Restore legacy structure
            const oldData = migrationEntry.metadata.migratedFrom;

            if (!dryRun) {
                await Company.updateOne(
                    { _id: company._id },
                    {
                        $unset: {
                            'zatcaCredentials.activeEnvironment': '',
                            'zatcaCredentials.progression': '',
                            'zatcaCredentials.environments': '',
                            'zatcaCredentials.history': ''
                        }
                    }
                );
                console.log(`  - Rolled back successfully`);
            } else {
                console.log(`  - Would rollback (dry run)`);
            }
        }

    } catch (err) {
        console.error('Rollback failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const rollback = args.includes('--rollback');

if (rollback) {
    rollbackMigration(dryRun);
} else {
    runMigration(dryRun);
}
