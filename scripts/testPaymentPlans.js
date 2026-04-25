const mongoose = require('mongoose');
const PaymentPlan = require('../src/models/PaymentPlan');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/einvoicing');
    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Sample payment plan data with Saudi context
const samplePaymentPlans = [
  {
    name: 'المجاني - Free Trial',
    description: 'تجربة مجانية لمدة محدودة لاستكشاف النظام والتعرف على المميزات الأساسية',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'SAR',
    billingCycle: ['monthly'],
    features: [
      {
        name: 'إنشاء فواتير محدودة',
        description: 'إنشاء حتى 5 فواتير شهرياً',
        included: true,
        limit: 5
      },
      {
        name: 'إدارة عملاء محدودة',
        description: 'إدارة حتى 3 عملاء',
        included: true,
        limit: 3
      },
      {
        name: 'دعم أساسي',
        description: 'دعم عبر البريد الإلكتروني',
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: 5,
      customers: 3,
      products: 3,
      users: 1,
      storage: 100 // 100MB
    },
    isActive: true,
    isPopular: false,
    isFeatured: false,
    sortOrder: 0,
    trialDays: 14,
    setupFee: 0,
    discountPercentage: 0,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Valid for 90 days
  },
  {
    name: 'المبتدئ - Starter',
    description: 'خطة مثالية للشركات الصغيرة والأفراد الذين يحتاجون لنظام فوترة إلكتروني أساسي',
    monthlyPrice: 99,
    yearlyPrice: 990, // 10% discount
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      {
        name: 'إنشاء الفواتير الإلكترونية',
        description: 'إنشاء فواتير احترافية متوافقة مع متطلبات هيئة الزكاة والضريبة',
        included: true
      },
      {
        name: 'إدارة العملاء والموردين',
        description: 'قاعدة بيانات شاملة لإدارة العملاء والموردين',
        included: true
      },
      {
        name: 'إدارة المنتجات والخدمات',
        description: 'كتالوج للمنتجات والخدمات مع الأسعار والوصف',
        included: true
      },
      {
        name: 'التقارير الأساسية',
        description: 'تقارير المبيعات والأرباح الأساسية',
        included: true
      },
      {
        name: 'الدعم الفني',
        description: 'دعم فني عبر البريد الإلكتروني',
        included: true
      },
      {
        name: 'النسخ الاحتياطي',
        description: 'نسخ احتياطي أسبوعي للبيانات',
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: 100,
      customers: 50,
      products: 25,
      users: 1,
      storage: 1000 // 1GB
    },
    isActive: true,
    isPopular: false,
    isFeatured: false,
    sortOrder: 1,
    trialDays: 14,
    setupFee: 0,
    discountPercentage: 0
  },
  {
    name: 'المحترف - Professional',
    description: 'الحل الأمثل للشركات المتوسطة والنامية مع ميزات متقدمة وإدارة شاملة',
    monthlyPrice: 199,
    yearlyPrice: 1990, // 16% discount
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      {
        name: 'فوترة إلكترونية متقدمة',
        description: 'جميع ميزات الخطة الأساسية بالإضافة لقوالب مخصصة',
        included: true
      },
      {
        name: 'إدارة متقدمة للعملاء',
        description: 'تتبع تاريخ العملاء وتحليلات الدفع',
        included: true
      },
      {
        name: 'التكامل مع الأنظمة المحاسبية',
        description: 'ربط مع الأنظمة المحاسبية الشائعة',
        included: true
      },
      {
        name: 'تقارير متقدمة ولوحات تحكم',
        description: 'تقارير تفصيلية وتحليلات أعمال شاملة',
        included: true
      },
      {
        name: 'إدارة المخزون',
        description: 'تتبع المخزون والمنتجات',
        included: true
      },
      {
        name: 'دعم فني متقدم',
        description: 'دعم عبر الهاتف والبريد الإلكتروني',
        included: true
      },
      {
        name: 'نسخ احتياطي يومي',
        description: 'نسخ احتياطي تلقائي يومي مع استرداد سريع',
        included: true
      },
      {
        name: 'تطبيق الجوال',
        description: 'تطبيق مخصص للأجهزة المحمولة',
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: 500,
      customers: 250,
      products: 100,
      users: 5,
      storage: 5000 // 5GB
    },
    isActive: true,
    isPopular: true, // Most popular plan
    isFeatured: false,
    sortOrder: 2,
    trialDays: 30,
    setupFee: 0,
    discountPercentage: 10 // Additional 10% discount
  },
  {
    name: 'المؤسسي - Enterprise',
    description: 'حل شامل ومتكامل للمؤسسات الكبيرة والشركات متعددة الفروع مع ميزات مخصصة',
    monthlyPrice: 399,
    yearlyPrice: 3990, // 17% discount
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      {
        name: 'فوترة إلكترونية متطورة',
        description: 'نظام فوترة متكامل مع التوقيع الرقمي والربط مع ZATCA',
        included: true
      },
      {
        name: 'إدارة شاملة متعددة الفروع',
        description: 'إدارة مركزية لعدة فروع ومواقع',
        included: true
      },
      {
        name: 'تكامل API شامل',
        description: 'واجهات برمجية متكاملة للربط مع الأنظمة الأخرى',
        included: true
      },
      {
        name: 'تقارير مخصصة ولوحات تحكم متقدمة',
        description: 'تقارير قابلة للتخصيص حسب احتياجات المؤسسة',
        included: true
      },
      {
        name: 'إدارة متقدمة للمستخدمين والصلاحيات',
        description: 'نظام صلاحيات متقدم مع تحكم دقيق',
        included: true
      },
      {
        name: 'دعم مخصص 24/7',
        description: 'دعم فني مخصص على مدار الساعة مع مدير حساب',
        included: true
      },
      {
        name: 'تدريب شامل للفريق',
        description: 'جلسات تدريب مخصصة وورش عمل للفريق',
        included: true
      },
      {
        name: 'نشر سحابي أو محلي',
        description: 'إمكانية النشر على الخوادم الخاصة بالمؤسسة',
        included: true
      },
      {
        name: 'امتثال كامل للوائح',
        description: 'متوافق مع جميع اللوائح السعودية والدولية',
        included: true
      },
      {
        name: 'تخصيصات خاصة',
        description: 'تطوير ميزات مخصصة حسب احتياجات المؤسسة',
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: null, // unlimited
      customers: null, // unlimited
      products: null, // unlimited
      users: 50,
      storage: 100000 // 100GB
    },
    isActive: true,
    isPopular: false,
    isFeatured: true, // Featured plan
    sortOrder: 3,
    trialDays: 45,
    setupFee: 1000, // One-time setup fee
    discountPercentage: 15 // 15% discount for yearly billing
  },
  {
    name: 'المتقدم - Advanced',
    description: 'خطة متوسطة للشركات النامية التي تحتاج ميزات أكثر من الخطة الأساسية',
    monthlyPrice: 299,
    yearlyPrice: 2990, // 16% discount
    currency: 'SAR',
    billingCycle: ['monthly', 'yearly'],
    features: [
      {
        name: 'فوترة إلكترونية شاملة',
        description: 'جميع ميزات الفوترة مع قوالب متعددة',
        included: true
      },
      {
        name: 'إدارة عملاء متقدمة',
        description: 'CRM مبسط مع تتبع العملاء',
        included: true
      },
      {
        name: 'تقارير وتحليلات متقدمة',
        description: 'تحليلات مالية وتجارية شاملة',
        included: true
      },
      {
        name: 'إدارة المخزون الأساسية',
        description: 'تتبع أساسي للمخزون والمنتجات',
        included: true
      },
      {
        name: 'دعم فني ممتاز',
        description: 'دعم سريع عبر الهاتف والبريد',
        included: true
      },
      {
        name: 'تطبيق الجوال',
        description: 'تطبيق للأجهزة المحمولة',
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: 1000,
      customers: 500,
      products: 250,
      users: 10,
      storage: 20000 // 20GB
    },
    isActive: true,
    isPopular: false,
    isFeatured: false,
    sortOrder: 2.5,
    trialDays: 30,
    setupFee: 200,
    discountPercentage: 5
  }
];

// Create sample payment plans
const createSamplePaymentPlans = async () => {
  try {
    console.log('🗑️  Clearing existing payment plans...');
    await PaymentPlan.deleteMany({});

    console.log('📦 Creating sample payment plans...');
    const createdPaymentPlans = await PaymentPlan.create(samplePaymentPlans);

    console.log('✅ Successfully created payment plans:');
    createdPaymentPlans.forEach(plan => {
      const discount = plan.yearlyDiscount > 0 ? ` (${plan.yearlyDiscount}% yearly discount)` : '';
      const popular = plan.isPopular ? ' ⭐ POPULAR' : '';
      const featured = plan.isFeatured ? ' 🌟 FEATURED' : '';
      console.log(`  - ${plan.name} - ${plan.currency} ${plan.monthlyPrice}/month${discount}${popular}${featured}`);
    });

    return createdPaymentPlans;
  } catch (error) {
    console.error('❌ Error creating payment plans:', error.message);
    throw error;
  }
};

// Test payment plan features
const testPaymentPlanFeatures = async () => {
  try {
    console.log('\n🧪 Testing payment plan features...');

    // Test getting active payment plans
    const activePaymentPlans = await PaymentPlan.getActivePaymentPlans();
    console.log(`📊 Found ${activePaymentPlans.length} active payment plans`);

    // Test getting featured payment plans
    const featuredPaymentPlans = await PaymentPlan.getFeaturedPaymentPlans();
    console.log(`⭐ Found ${featuredPaymentPlans.length} featured payment plans`);

    // Test getting popular payment plan
    const popularPaymentPlan = await PaymentPlan.getPopularPaymentPlan();
    console.log(`🔥 Popular payment plan: ${popularPaymentPlan ? popularPaymentPlan.name : 'None'}`);

    // Test payment plan validity and calculations
    const paymentPlans = await PaymentPlan.find({});
    console.log('\n💰 Payment Plan Analysis:');
    paymentPlans.forEach(plan => {
      console.log(`\n🏷️  ${plan.name}:`);
      console.log(`   ✅ Valid Now: ${plan.isValidNow()}`);
      console.log(`   💸 Monthly: ${plan.currency} ${plan.getDiscountedPrice('monthly')}`);
      console.log(`   📅 Yearly: ${plan.currency} ${plan.getDiscountedPrice('yearly')}`);
      console.log(`   🎯 Yearly Discount: ${plan.yearlyDiscount}%`);
      console.log(`   ⚡ Effective Monthly (Yearly): ${plan.currency} ${plan.effectiveMonthlyPrice}`);
      console.log(`   👥 User Limit: ${plan.limits.users}`);
      console.log(`   📋 Invoice Limit: ${plan.limits.invoicesPerMonth || 'Unlimited'}`);
    });

  } catch (error) {
    console.error('❌ Error testing features:', error.message);
  }
};

// Display API usage examples
const displayAPIExamples = () => {
  console.log('\n📝 Payment Plan API Endpoints:');
  console.log('='.repeat(80));
  
  console.log('\n🌍 Public Endpoints (No Authentication Required):');
  console.log('GET    /payments/plans/active           - Get all active payment plans');
  console.log('GET    /payments/plans/featured         - Get featured payment plans');
  console.log('GET    /payments/plans/popular          - Get popular payment plan');
  console.log('GET    /payments/plans/stats            - Get payment plan statistics');
  console.log('GET    /payments/plans/search?q=term    - Search payment plans');
  console.log('GET    /payments/plans/:id              - Get specific payment plan');

  console.log('\n🔐 Protected Endpoints (Authentication Required):');
  console.log('GET    /payments/plans                  - Get all payment plans (admin)');
  console.log('POST   /payments/plans                  - Create new payment plan');
  console.log('PUT    /payments/plans/:id              - Update payment plan');
  console.log('DELETE /payments/plans/:id              - Delete payment plan (soft delete)');
  console.log('PATCH  /payments/plans/:id/toggle-status - Toggle payment plan status');
  console.log('PATCH  /payments/plans/:id/set-popular   - Set as popular payment plan');
  console.log('POST   /payments/plans/:id/duplicate     - Duplicate payment plan');
  console.log('PATCH  /payments/plans/order             - Update payment plans order');

  console.log('\n📋 Sample Request Body for Creating a Payment Plan:');
  console.log(JSON.stringify({
    name: "خطة مخصصة - Custom Plan",
    description: "خطة مخصصة للعملاء ذوي الاحتياجات الخاصة",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    currency: "SAR",
    billingCycle: ["monthly", "yearly"],
    features: [
      {
        name: "ميزة مخصصة",
        description: "ميزة خاصة مطورة حسب الطلب",
        included: true
      }
    ],
    limits: {
      invoicesPerMonth: 200,
      customers: 100,
      products: 50,
      users: 3,
      storage: 2000
    },
    trialDays: 21,
    discountPercentage: 5
  }, null, 2));

  console.log('\n🔍 Query Parameters Examples:');
  console.log('- Filter active: ?active=true');
  console.log('- Filter popular: ?popular=true');
  console.log('- Filter featured: ?featured=true');
  console.log('- Price range: ?minPrice=100&maxPrice=300&billingCycle=monthly');
  console.log('- Pagination: ?page=1&limit=10');
  console.log('- Search: ?search=المحترف');
  console.log('- Sort: ?sortBy=monthlyPrice&sortOrder=asc');
  console.log('- Currency: ?currency=SAR');
  console.log('- Valid now: ?validNow=true');
  
  console.log('\n💡 Usage Tips:');
  console.log('- All prices are in the specified currency (default: SAR)');
  console.log('- Yearly prices typically offer 10-20% discount over monthly');
  console.log('- Only one payment plan can be marked as "popular" at a time');
  console.log('- Payment plans can be soft-deleted (isActive: false)');
  console.log('- Use trial days to offer free trials to customers');
  console.log('- Setup fees are one-time charges when subscribing');
  console.log('- Metadata field can store custom information (max 10KB)');
  
  console.log('\n🏗️  Development Commands:');
  console.log('- Start server: npm start or node index.js');
  console.log('- Run tests: npm test');
  console.log('- Create sample data: node scripts/testPaymentPlans.js');
  console.log('- View database: Use MongoDB Compass or CLI');
};

// Main execution function
const main = async () => {
  try {
    console.log('🚀 Starting Payment Plan Management System Test');
    console.log('=' .repeat(80));

    // Connect to database
    await connectDB();

    // Create sample payment plans
    const paymentPlans = await createSamplePaymentPlans();

    // Test payment plan features
    await testPaymentPlanFeatures();

    // Display API examples
    displayAPIExamples();

    console.log('\n✅ Payment Plan Management System is ready!');
    console.log('🌐 Server endpoints available at: http://localhost:4000');
    console.log('📚 API Documentation: All endpoints are ready for testing');
    console.log('🎯 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test public endpoints with browser or Postman');
    console.log('   3. Set up authentication for protected endpoints');
    console.log('   4. Integrate with frontend application');

  } catch (error) {
    console.error('💥 Error in main execution:', error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Process interrupted');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Process terminated');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  connectDB,
  createSamplePaymentPlans,
  testPaymentPlanFeatures,
  samplePaymentPlans
};