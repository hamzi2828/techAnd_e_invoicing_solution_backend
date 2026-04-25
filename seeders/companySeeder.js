// seeders/companySeeder.js
const mongoose = require('mongoose');
const Company = require('../src/models/Company');

const USER_ID = '68b741c85f4ef5778646f0b2'; // Same user as bank accounts

// Generate unique 10-digit commercial registration number
const generateCRNumber = () => {
  const prefix = '10'; // Common prefix for CR numbers
  const middle = Math.floor(Math.random() * 90000000 + 10000000); // 8 digits
  return prefix + middle.toString().substring(0, 8);
};

// Generate valid 15-digit VAT number (format: 3XXXXXXXXXX3)
// Starts with 3, ends with 3, middle 10 digits are the TIN
const generateVATNumber = () => {
  let middle = '';
  for (let i = 0; i < 10; i++) {
    middle += Math.floor(Math.random() * 10);
  }
  return '3' + middle + '123'; // Starts with 3, ends with 123
};

const getCompaniesData = () => {
  const companies = [
    {
      userId: USER_ID,
      companyName: 'TechFlow Solutions',
      companyNameAr: 'حلول التدفق التقني',
      legalForm: 'Limited Liability Company',
      commercialRegistrationNumber: '1234567890',
      taxIdNumber: '399999999900003', // 15 digits
      vatNumber: '399999999900003',
      email: 'info@techflowsa.com',
      phone: '+966501234567',
      website: 'https://techflowsa.com',
      address: {
        street: 'King Fahd Road',
        buildingNumber: '7890',
        additionalNumber: '1234',
        district: 'Al Olaya',
        city: 'Riyadh',
        province: 'Riyadh Province',
        postalCode: '12211',
        country: 'Saudi Arabia'
      },
      industry: 'Technology',
      businessDescription: 'We provide comprehensive technology solutions including software development, system integration, and digital transformation services for businesses across Saudi Arabia.',
      establishedDate: new Date('2019-03-15'),
      employeeCount: '51-200',
      currency: 'SAR',
      fiscalYearEnd: 'December',
      status: 'verified',
      verificationStatus: 'verified',
      isActive: true,
    documents: [
      {
        documentType: 'commercial_registration',
        documentName: 'Commercial Registration Certificate',
        documentUrl: 'https://example.com/documents/cr_techflow.pdf',
        uploadedAt: new Date(),
        verificationStatus: 'verified'
      },
      {
        documentType: 'tax_certificate',
        documentName: 'Tax Registration Certificate',
        documentUrl: 'https://example.com/documents/tax_techflow.pdf',
        uploadedAt: new Date(),
        verificationStatus: 'verified'
      },
      {
        documentType: 'vat_certificate',
        documentName: 'VAT Registration Certificate',
        documentUrl: 'https://example.com/documents/vat_techflow.pdf',
        uploadedAt: new Date(),
        verificationStatus: 'verified'
      }
    ],
    settings: {
      invoiceNumberPrefix: 'TFS',
      invoiceNumberStartFrom: 1001,
      defaultDueDays: 30,
      termsAndConditions: 'Payment is due within 30 days of invoice date. Late payments may incur additional charges as per Saudi commercial law.'
    },
      zakatEligible: true,
      vatRegistered: true,
      vatRate: 15
    },
    {
      userId: USER_ID,
      companyName: 'AlMadar Construction',
      companyNameAr: 'شركة المدار للمقاولات',
      legalForm: 'Joint Stock Company',
      commercialRegistrationNumber: '1050567890',
      taxIdNumber: '350567890123123', // 15 digits: 3 + 10 TIN + 123
      vatNumber: '350567890123123',
      email: 'contact@almadar-construction.com',
      phone: '+966502345678',
      address: {
        street: 'Prince Mohammed bin Abdulaziz Road',
        buildingNumber: '3456',
        additionalNumber: '7890',
        district: 'Al Faisaliyyah',
        city: 'Jeddah',
        province: 'Makkah Province',
        postalCode: '21441',
        country: 'Saudi Arabia'
      },
      industry: 'Construction',
      businessDescription: 'Leading construction company specializing in residential, commercial, and infrastructure projects throughout the Kingdom of Saudi Arabia.',
      establishedDate: new Date('2015-08-20'),
      employeeCount: '201-500',
      currency: 'SAR',
      fiscalYearEnd: 'March',
      status: 'verified',
      verificationStatus: 'verified',
      isActive: true,
      documents: [
        {
          documentType: 'commercial_registration',
          documentName: 'Commercial Registration - AlMadar',
          documentUrl: 'https://example.com/documents/cr_almadar.pdf',
          uploadedAt: new Date(),
          verificationStatus: 'verified'
        },
        {
          documentType: 'tax_certificate',
          documentName: 'Tax Certificate - AlMadar',
          documentUrl: 'https://example.com/documents/tax_almadar.pdf',
          uploadedAt: new Date(),
          verificationStatus: 'verified'
        }
      ],
      settings: {
        invoiceNumberPrefix: 'AMC',
        invoiceNumberStartFrom: 2001,
        defaultDueDays: 45,
        termsAndConditions: 'Payment terms are net 45 days. All materials and labor costs are subject to current market rates.'
      },
      zakatEligible: true,
      vatRegistered: true,
      vatRate: 15
    },
    {
      userId: USER_ID,
      companyName: 'Nour Healthcare Services',
      companyNameAr: 'خدمات نور الصحية',
      legalForm: 'Limited Liability Company',
      commercialRegistrationNumber: '1060678901',
      taxIdNumber: '360678901234123', // 15 digits: 3 + 10 TIN + 123
      vatNumber: '360678901234123',
      email: 'admin@nour-healthcare.sa',
      phone: '+966503456789',
      website: 'https://nour-healthcare.sa',
      address: {
        street: 'King Abdul Aziz Road',
        buildingNumber: '5678',
        additionalNumber: '2345',
        district: 'Al Rawdah',
        city: 'Dammam',
        province: 'Eastern Province',
        postalCode: '32241',
        country: 'Saudi Arabia'
      },
      industry: 'Healthcare',
      businessDescription: 'Comprehensive healthcare services including medical consultations, diagnostic services, and specialized treatments with state-of-the-art facilities.',
      establishedDate: new Date('2020-01-10'),
      employeeCount: '11-50',
      currency: 'SAR',
      fiscalYearEnd: 'June',
      status: 'verified',
      verificationStatus: 'verified',
      isActive: true,
    documents: [
      {
        documentType: 'commercial_registration',
        documentName: 'CR - Nour Healthcare',
        documentUrl: 'https://example.com/documents/cr_nour.pdf',
        uploadedAt: new Date(),
        verificationStatus: 'verified'
      },
      {
        documentType: 'tax_certificate',
        documentName: 'Tax Certificate - Nour Healthcare',
        documentUrl: 'https://example.com/documents/tax_nour.pdf',
        uploadedAt: new Date(),
        verificationStatus: 'verified'
      }
    ],
      settings: {
        invoiceNumberPrefix: 'NHS',
        invoiceNumberStartFrom: 5001,
        defaultDueDays: 15,
        termsAndConditions: 'Payment due within 15 days. Healthcare services are subject to Ministry of Health regulations.'
      },
      zakatEligible: true,
      vatRegistered: true,
      vatRate: 15
    }
  ];

  return companies;
};

const seedCompanies = async () => {
  try {
    console.log('🏢 Starting Company seeder...');
    console.log(`📋 Target User ID: ${USER_ID}`);

    // Count existing companies before deletion
    const existingCount = await Company.countDocuments({ userId: USER_ID });
    console.log(`📊 Found ${existingCount} existing companies for this user`);

    // Clear existing companies for this user
    if (existingCount > 0) {
      const deleteResult = await Company.deleteMany({ userId: USER_ID });
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing companies`);
    } else {
      console.log('ℹ️  No existing companies to delete');
    }

    // Generate companies data with unique IDs
    const companiesData = getCompaniesData();
    console.log(`📝 Preparing to create ${companiesData.length} new companies...`);

    // Insert new companies
    const companies = await Company.insertMany(companiesData);
    console.log(`✅ Successfully seeded ${companies.length} companies:`);

    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.companyName} (${company.status})`);
    });

    // Display summary
    const statusCounts = await Company.aggregate([
      { $match: { userId: USER_ID } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const verificationCounts = await Company.aggregate([
      { $match: { userId: USER_ID } },
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
    ]);

    console.log('\n📊 Company Status Summary:');
    statusCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n🔍 Verification Status Summary:');
    verificationCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n🎯 Companies by Industry:');
    const industryCounts = await Company.aggregate([
      { $match: { userId: USER_ID } },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    industryCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count}`);
    });

    console.log('\n✨ Company seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding companies:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  const mongoose = require('mongoose');
  require('dotenv').config();

  const runSeeder = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
      console.log('📡 Connected to MongoDB');

      await seedCompanies();

    } catch (error) {
      console.error('❌ Seeder failed:', error);
    } finally {
      await mongoose.connection.close();
      console.log('📡 Database connection closed');
    }
  };

  runSeeder();
}

module.exports = { seedCompanies };