const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const PaymentPlan = require('../src/models/PaymentPlan');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Payment plans data based on ZATCA e-invoicing tiers
const paymentPlansData = [
  {
    name: 'Free',
    description: 'Get started with e-invoicing at no cost. Perfect for testing and small-scale operations',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'SAR',
    billingCycle: ['monthly'],
    features: [
      // Companies
      {
        name: 'Number of Companies',
        included: true,
        description: '1 company only',
        limit: 1
      },
      // Invoice Volume
      {
        name: 'Invoice Volume',
        included: true,
        description: 'Up to 50 invoices per month',
        limit: 50
      },
      // ZATCA Compliance
      {
        name: 'ZATCA Phase 1 (Generation)',
        included: true,
        description: 'Basic Phase 1 compliance for invoice generation'
      },
      {
        name: 'ZATCA Phase 2 (Integration)',
        included: false,
        description: 'Phase 2 integration with ZATCA systems'
      },
      {
        name: 'ZATCA Onboarding',
        included: false,
        description: 'Self-guided onboarding for CSID/Certificates'
      },
      // Core Features
      {
        name: 'Quotation',
        included: true,
        description: 'Create and manage quotations'
      },
      {
        name: 'Bulk Import',
        included: false,
        description: 'Bulk import for customers, items, and invoices'
      },
      // Reports
      {
        name: 'Reports',
        included: true,
        description: 'View only - basic report viewing'
      },
      {
        name: 'Report Scheduling',
        included: false,
        description: 'Automated report scheduling and delivery'
      },
      // Users & Permissions
      {
        name: 'Multiple Users',
        included: false,
        description: 'Add multiple users to your account'
      },
      {
        name: 'Roles & Permissions',
        included: false,
        description: 'Role-based access control'
      },
      // Notifications
      {
        name: 'Email Notifications',
        included: false,
        description: 'Automated email notifications'
      },
      // POS
      {
        name: 'POS Access',
        included: false,
        description: 'Point of Sale module'
      },
      // Support
      {
        name: 'Support',
        included: true,
        description: 'Community support only'
      }
    ],
    limits: {
      invoicesPerMonth: 50,
      customers: 20,
      products: 50,
      users: 1,
      storage: 100, // MB
      companies: 1
    },
    trialDays: 0,
    setupFee: 0,
    discountPercentage: 0,
    sortOrder: 1,
    isActive: true,
    isPopular: false,
    isFeatured: false,
    metadata: {
      color: '#6B7280',
      icon: 'free',
      targetAudience: 'Startups / Testing / Very low volume',
      companiesLimit: 1
    }
  },
  {
    name: 'Basic',
    description: 'Essential e-invoicing for micro businesses and single entities with low invoice volume',
    monthlyPrice: 99,
    yearlyPrice: 990,
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      // Companies
      {
        name: 'Number of Companies',
        included: true,
        description: '1 company only',
        limit: 1
      },
      // Invoice Volume
      {
        name: 'Invoice Volume',
        included: true,
        description: 'Up to 300 invoices per month',
        limit: 300
      },
      // ZATCA Compliance
      {
        name: 'ZATCA Phase 1 (Generation)',
        included: true,
        description: 'Full Phase 1 compliance for invoice generation'
      },
      {
        name: 'ZATCA Phase 2 (Integration)',
        included: false,
        description: 'Phase 2 integration with ZATCA systems'
      },
      {
        name: 'ZATCA Onboarding',
        included: true,
        description: 'Self-guided onboarding for CSID/Certificates'
      },
      // Core Features
      {
        name: 'Quotation',
        included: true,
        description: 'Create and manage quotations'
      },
      {
        name: 'Bulk Import',
        included: false,
        description: 'Bulk import for customers, items, and invoices'
      },
      // Reports
      {
        name: 'Reports',
        included: true,
        description: 'View only - basic report viewing'
      },
      {
        name: 'Report Scheduling',
        included: false,
        description: 'Automated report scheduling and delivery'
      },
      // Users & Permissions
      {
        name: 'Multiple Users',
        included: false,
        description: 'Add multiple users to your account'
      },
      {
        name: 'Roles & Permissions',
        included: false,
        description: 'Role-based access control'
      },
      // Notifications
      {
        name: 'Email Notifications',
        included: false,
        description: 'Automated email notifications'
      },
      // POS
      {
        name: 'POS Access',
        included: false,
        description: 'Point of Sale module'
      },
      // Support
      {
        name: 'Support',
        included: true,
        description: 'Limited support via email'
      }
    ],
    limits: {
      invoicesPerMonth: 300,
      customers: 100,
      products: 200,
      users: 1,
      storage: 500, // MB
      companies: 1
    },
    trialDays: 7,
    setupFee: 0,
    discountPercentage: 0,
    sortOrder: 2,
    isActive: true,
    isPopular: false,
    isFeatured: false,
    metadata: {
      color: '#3B82F6',
      icon: 'basic',
      targetAudience: 'Micro / single entity, low volume',
      companiesLimit: 1
    }
  },
  {
    name: 'Professional',
    description: 'Complete e-invoicing solution for SMEs with Phase 2 compliance, reporting, and exports',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      // Companies
      {
        name: 'Number of Companies',
        included: true,
        description: 'Up to 3 companies (expandable)',
        limit: 3
      },
      // Invoice Volume
      {
        name: 'Invoice Volume',
        included: true,
        description: 'Up to 5,000 invoices per month',
        limit: 5000
      },
      // ZATCA Compliance
      {
        name: 'ZATCA Phase 1 (Generation)',
        included: true,
        description: 'Full Phase 1 compliance for invoice generation'
      },
      {
        name: 'ZATCA Phase 2 (Integration)',
        included: true,
        description: 'Full Phase 2 integration with ZATCA systems'
      },
      {
        name: 'ZATCA Onboarding',
        included: true,
        description: 'Guided wizard + checklist for CSID/Certificates setup'
      },
      // Core Features
      {
        name: 'Quotation',
        included: true,
        description: 'Create and manage quotations'
      },
      {
        name: 'Bulk Import',
        included: true,
        description: 'Bulk import for customers, items, and invoices'
      },
      // Reports
      {
        name: 'Reports',
        included: true,
        description: 'View + Download reports (PDF/Excel/CSV)'
      },
      {
        name: 'Report Scheduling',
        included: true,
        description: 'Daily/weekly automated report scheduling'
      },
      // Users & Permissions
      {
        name: 'Multiple Users',
        included: true,
        description: 'Up to 5 users per account',
        limit: 5
      },
      {
        name: 'Roles & Permissions',
        included: true,
        description: 'Basic roles (Admin/Staff)'
      },
      // Notifications
      {
        name: 'Email Notifications',
        included: true,
        description: 'Automated email notifications'
      },
      // POS
      {
        name: 'POS Access',
        included: true,
        description: 'POS with walk-in & customer sales'
      },
      // Support
      {
        name: 'Support',
        included: true,
        description: 'Standard support via email and chat'
      }
    ],
    limits: {
      invoicesPerMonth: 5000,
      customers: 1000,
      products: 2000,
      users: 5,
      storage: 5000, // MB
      companies: 3
    },
    trialDays: 14,
    setupFee: 0,
    discountPercentage: 0,
    sortOrder: 3,
    isActive: true,
    isPopular: true,
    isFeatured: true,
    metadata: {
      color: '#10B981',
      icon: 'professional',
      badge: 'Most Popular',
      targetAudience: 'SMEs needing Phase 2 + reporting & exports',
      companiesLimit: 3
    }
  },
  {
    name: 'Enterprise',
    description: 'Full-scale solution for groups and multi-entities with high volume, advanced integrations, and unlimited users',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      // Companies
      {
        name: 'Number of Companies',
        included: true,
        description: 'Up to 10 companies (or custom unlimited)',
        limit: 10
      },
      // Invoice Volume
      {
        name: 'Invoice Volume',
        included: true,
        description: '50,000+ invoices per month (custom limits available)',
        limit: 50000
      },
      // ZATCA Compliance
      {
        name: 'ZATCA Phase 1 (Generation)',
        included: true,
        description: 'Full Phase 1 compliance for invoice generation'
      },
      {
        name: 'ZATCA Phase 2 (Integration)',
        included: true,
        description: 'Advanced Phase 2 integration with ZATCA systems'
      },
      {
        name: 'ZATCA Onboarding',
        included: true,
        description: 'Assisted onboarding + dedicated technical support for CSID/Certificates'
      },
      // Core Features
      {
        name: 'Quotation',
        included: true,
        description: 'Create and manage quotations'
      },
      {
        name: 'Bulk Import',
        included: true,
        description: 'Bulk import with templates and validation rules'
      },
      // Reports
      {
        name: 'Reports',
        included: true,
        description: 'Advanced reports + custom exports'
      },
      {
        name: 'Report Scheduling',
        included: true,
        description: 'Advanced scheduling with multi-recipient and automation'
      },
      // Users & Permissions
      {
        name: 'Multiple Users',
        included: true,
        description: 'Unlimited users with role-based access'
      },
      {
        name: 'Roles & Permissions',
        included: true,
        description: 'Advanced RBAC (Approvals, Finance, Auditor, etc.)'
      },
      // Notifications
      {
        name: 'Email Notifications',
        included: true,
        description: 'Advanced email notifications with custom triggers'
      },
      // POS
      {
        name: 'POS Access',
        included: true,
        description: 'Advanced POS with full reporting'
      },
      // Support
      {
        name: 'Support',
        included: true,
        description: 'Priority support with dedicated account manager'
      },
      // Enterprise Extras
      {
        name: 'API Access',
        included: true,
        description: 'Full API access for custom integrations'
      },
      {
        name: 'Custom Integrations',
        included: true,
        description: 'ERP and third-party system integrations'
      },
      {
        name: 'Dedicated Account Manager',
        included: true,
        description: 'Personal account manager for your organization'
      }
    ],
    limits: {
      invoicesPerMonth: null, // Unlimited / Custom
      customers: null, // Unlimited
      products: null, // Unlimited
      users: null, // Unlimited
      storage: null, // Unlimited
      companies: 10 // Up to 10 (can be custom unlimited)
    },
    trialDays: 30,
    setupFee: 0,
    discountPercentage: 0,
    sortOrder: 4,
    isActive: true,
    isPopular: false,
    isFeatured: true,
    metadata: {
      color: '#8B5CF6',
      icon: 'enterprise',
      badge: 'Enterprise Ready',
      targetAudience: 'Groups / multi-entities, high volume, integrations',
      companiesLimit: 10
    }
  }
];

async function seedPaymentPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-invoice', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing payment plans
    const deleteResult = await PaymentPlan.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing payment plans`);

    // Insert new payment plans
    const insertedPlans = [];
    for (const planData of paymentPlansData) {
      const plan = new PaymentPlan(planData);
      const savedPlan = await plan.save();
      insertedPlans.push(savedPlan);
      console.log(`✅ Created plan: ${savedPlan.name} (${savedPlan._id})`);
    }

    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log('==================');
    insertedPlans.forEach(plan => {
      console.log(`\n📦 ${plan.name}`);
      console.log(`   ID: ${plan._id}`);
      console.log(`   Monthly: SAR ${plan.monthlyPrice}`);
      console.log(`   Yearly: SAR ${plan.yearlyPrice}`);
      console.log(`   Features: ${plan.features.length}`);
      console.log(`   Trial Days: ${plan.trialDays}`);
      console.log(`   Featured: ${plan.isFeatured ? '⭐ Yes' : 'No'}`);
      console.log(`   Popular: ${plan.isPopular ? '🔥 Yes' : 'No'}`);
    });

    console.log('\n✅ Payment plans seeded successfully!');
    console.log('📌 Total plans created:', insertedPlans.length);

  } catch (error) {
    console.error('❌ Error seeding payment plans:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the seeder
seedPaymentPlans();