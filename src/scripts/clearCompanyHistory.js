/**
 * Script to clear ZATCA history for a specific company
 * Run with: node src/scripts/clearCompanyHistory.js <companyId>
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing';

async function clearHistory() {
    const companyId = process.argv[2];

    if (!companyId) {
        console.error('Usage: node src/scripts/clearCompanyHistory.js <companyId>');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        const result = await db.collection('companies').updateOne(
            { _id: new mongoose.Types.ObjectId(companyId) },
            { $set: { 'zatcaCredentials.history': [] } }
        );

        if (result.modifiedCount > 0) {
            console.log(`History cleared for company: ${companyId}`);
        } else {
            console.log(`No changes made. Company may not exist: ${companyId}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

clearHistory();
