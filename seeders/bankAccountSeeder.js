const mongoose = require('mongoose');
const BankAccount = require('../src/models/BankAccount');
require('dotenv').config();

// User ID to seed bank accounts for
const USER_ID = '68d937a2ffce74f5aae8ef6e';

// Generate unique account number (16 digits)
const generateAccountNumber = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return timestamp + random;
};

// Generate unique IBAN for Saudi Arabia (SA + 22 digits)
const generateIBAN = () => {
  let digits = '';
  for (let i = 0; i < 22; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return 'SA' + digits;
};

const bankAccountsData = [
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Main Business Account',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Saudi National Bank',
    bankCode: '10',
    branchName: 'King Fahd Road Branch',
    branchCode: '001',
    currency: 'SAR',
    accountType: 'business',
    status: 'active',
    isDefault: true,
    balance: 250000,
    lastTransaction: new Date('2024-01-15'),
    verificationStatus: 'verified',
    metadata: {
      swiftCode: 'NCBKSARI',
      correspondentBank: 'JPMorgan Chase Bank'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - USD Business Account',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Al Rajhi Bank',
    bankCode: '80',
    branchName: 'Al Olaya Branch',
    branchCode: '045',
    currency: 'USD',
    accountType: 'business',
    status: 'active',
    isDefault: false,
    balance: 15000,
    lastTransaction: new Date('2024-01-10'),
    verificationStatus: 'pending',
    metadata: {
      swiftCode: 'RJHISARI',
      correspondentBank: 'Citibank N.A.'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Savings Account',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Riyad Bank',
    bankCode: '20',
    branchName: 'King Abdullah Financial District',
    branchCode: '120',
    currency: 'SAR',
    accountType: 'savings',
    status: 'active',
    isDefault: false,
    balance: 75000,
    lastTransaction: new Date('2024-01-08'),
    verificationStatus: 'verified',
    metadata: {
      swiftCode: 'RIBLSARI'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Euro Operations',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Banque Saudi Fransi',
    bankCode: '55',
    branchName: 'Riyadh Main Branch',
    branchCode: '200',
    currency: 'EUR',
    accountType: 'business',
    status: 'active',
    isDefault: false,
    balance: 8500,
    lastTransaction: new Date('2024-01-12'),
    verificationStatus: 'verified',
    metadata: {
      swiftCode: 'BSFRSARI',
      correspondentBank: 'BNP Paribas'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Investment Account',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Saudi British Bank (SABB)',
    bankCode: '45',
    branchName: 'King Abdulaziz Road Branch',
    branchCode: '310',
    currency: 'SAR',
    accountType: 'investment',
    status: 'pending',
    isDefault: false,
    balance: 125000,
    lastTransaction: new Date('2024-01-05'),
    verificationStatus: 'pending',
    metadata: {
      swiftCode: 'SABBSARI'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Payroll Account',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Arab National Bank',
    bankCode: '05',
    branchName: 'Al Malaz Branch',
    branchCode: '085',
    currency: 'SAR',
    accountType: 'checking',
    status: 'active',
    isDefault: false,
    balance: 45000,
    lastTransaction: new Date('2024-01-14'),
    verificationStatus: 'verified',
    metadata: {
      swiftCode: 'ARNBSARI'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - Emergency Fund',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Bank AlJazira',
    bankCode: '65',
    branchName: 'Al Tahlia Branch',
    branchCode: '150',
    currency: 'SAR',
    accountType: 'savings',
    status: 'active',
    isDefault: false,
    balance: 100000,
    lastTransaction: new Date('2024-01-01'),
    verificationStatus: 'verified',
    metadata: {
      swiftCode: 'BJAZSARI'
    }
  },
  {
    userId: USER_ID,
    accountName: 'TechFlow Solutions - AED Operations',
    accountNumber: generateAccountNumber(),
    iban: generateIBAN(),
    bankName: 'Alinma Bank',
    bankCode: '71',
    branchName: 'Prince Sultan Road Branch',
    branchCode: '240',
    currency: 'AED',
    accountType: 'business',
    status: 'inactive',
    isDefault: false,
    balance: 12000,
    lastTransaction: new Date('2023-12-28'),
    verificationStatus: 'failed',
    metadata: {
      swiftCode: 'ALINMSAR'
    }
  }
];

const seedBankAccounts = async () => {
  try {
    console.log('🏦 Starting Bank Account Seeder...\n');

    // Check if user exists
    const User = require('../src/models/User');
    const user = await User.findById(USER_ID);
    if (!user) {
      throw new Error(`User with ID ${USER_ID} not found. Please ensure the user exists before seeding bank accounts.`);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Clear existing bank accounts for this user
    const deletedCount = await BankAccount.deleteMany({ userId: USER_ID });
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing bank accounts for user`);

    // Insert bank accounts
    console.log('\n💳 Creating bank accounts...');
    const createdAccounts = await BankAccount.insertMany(bankAccountsData);

    console.log(`✅ Successfully created ${createdAccounts.length} bank accounts:`);
    createdAccounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.accountName} (${account.currency}) - ${account.status}`);
    });

    // Show statistics
    const stats = await BankAccount.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(USER_ID) } },
      {
        $group: {
          _id: null,
          totalAccounts: { $sum: 1 },
          activeAccounts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pendingAccounts: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inactiveAccounts: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          verifiedAccounts: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] }
          },
          totalBalance: { $sum: '$balance' },
          currencies: { $addToSet: '$currency' }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\n📊 Bank Account Statistics:');
      console.log(`   Total Accounts: ${stat.totalAccounts}`);
      console.log(`   Active: ${stat.activeAccounts} | Pending: ${stat.pendingAccounts} | Inactive: ${stat.inactiveAccounts}`);
      console.log(`   Verified: ${stat.verifiedAccounts}`);
      console.log(`   Total Balance: ${stat.totalBalance.toLocaleString()}`);
      console.log(`   Currencies: ${stat.currencies.join(', ')}`);
    }

    console.log('\n🎉 Bank Account seeding completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Test the bank account API endpoints:');
    console.log(`   - GET /api/bank-accounts - List all bank accounts`);
    console.log(`   - GET /api/bank-accounts/stats - Get statistics`);
    console.log(`   - GET /api/bank-accounts/default - Get default account`);

  } catch (error) {
    console.error('❌ Error seeding bank accounts:', error);
    throw error;
  }
};

// Connect to database and run seeder if called directly
const runBankAccountSeeder = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e_invoicing');
    console.log('📡 Connected to MongoDB');

    await seedBankAccounts();

  } catch (error) {
    console.error('❌ Error running bank account seeder:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Run seeder if called directly
if (require.main === module) {
  runBankAccountSeeder();
}

module.exports = { seedBankAccounts, runBankAccountSeeder };