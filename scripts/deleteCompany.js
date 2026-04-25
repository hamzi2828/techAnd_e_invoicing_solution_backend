const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Company = require('../src/models/Company');
const Invoice = require('../src/models/Invoice');
const Customer = require('../src/models/Customer');
const Product = require('../src/models/Product');
const Quotation = require('../src/models/Quotation');

async function deleteCompany() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice');
    console.log('Connected to MongoDB\n');

    const companyName = process.argv[2];

    if (!companyName) {
      // List all companies
      const companies = await Company.find({}, 'companyName taxIdNumber email createdAt');
      console.log('USAGE: node scripts/deleteCompany.js "Company Name"\n');
      console.log('--- All Companies ---');
      companies.forEach((c, i) => {
        console.log(`${i + 1}. ${c.companyName}`);
        console.log(`   Tax ID: ${c.taxIdNumber}`);
        console.log(`   Email: ${c.email}`);
        console.log(`   ID: ${c._id}\n`);
      });
      process.exit(0);
    }

    // Find company by name (case-insensitive partial match)
    const company = await Company.findOne({
      companyName: new RegExp(companyName, 'i')
    });

    if (!company) {
      console.error(`Company "${companyName}" not found`);
      process.exit(1);
    }

    console.log('=== COMPANY TO DELETE ===');
    console.log(`Name: ${company.companyName}`);
    console.log(`Tax ID: ${company.taxIdNumber}`);
    console.log(`Email: ${company.email}`);
    console.log(`ID: ${company._id}\n`);

    // Check for related data
    const invoiceCount = await Invoice.countDocuments({ companyId: company._id });
    const customerCount = await Customer.countDocuments({ companyId: company._id });
    const productCount = await Product.countDocuments({ companyId: company._id });
    const quotationCount = await Quotation.countDocuments({ companyId: company._id });

    console.log('=== RELATED DATA ===');
    console.log(`Invoices: ${invoiceCount}`);
    console.log(`Customers: ${customerCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Quotations: ${quotationCount}\n`);

    // Delete related data first
    if (invoiceCount > 0) {
      await Invoice.deleteMany({ companyId: company._id });
      console.log(`Deleted ${invoiceCount} invoices`);
    }
    if (customerCount > 0) {
      await Customer.deleteMany({ companyId: company._id });
      console.log(`Deleted ${customerCount} customers`);
    }
    if (productCount > 0) {
      await Product.deleteMany({ companyId: company._id });
      console.log(`Deleted ${productCount} products`);
    }
    if (quotationCount > 0) {
      await Quotation.deleteMany({ companyId: company._id });
      console.log(`Deleted ${quotationCount} quotations`);
    }

    // Delete the company
    await Company.deleteOne({ _id: company._id });
    console.log(`\nDeleted company: ${company.companyName}`);

    console.log('\n=== SUCCESS ===');
    console.log('Company and all related data permanently deleted');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

deleteCompany();
