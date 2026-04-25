const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
// swagger-ui-express not needed - using custom HTML with CDN
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const swaggerSpec = require('./config/swagger');

const userRoutes = require('./src/routes/userRoutes');
const paymentPlanRoutes = require('./src/routes/paymentPlanRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const paymentRoutes = require('./src/routes/payment.routes');
const moyasarRoutes = require('./src/routes/moyasar.routes');
const bankAccountRoutes = require('./src/routes/bankAccountRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const creditNoteRoutes = require('./src/routes/creditNoteRoutes');
const debitNoteRoutes = require('./src/routes/debitNoteRoutes');
const quotationRoutes = require('./src/routes/quotationRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const zatcaTestRoutes = require('./src/routes/zatcaTestRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const posRoutes = require('./src/routes/posRoutes');
const blogRoutes = require('./src/routes/blogRoutes');
const blogCategoryRoutes = require('./src/routes/blogCategoryRoutes');
const blogAuthorRoutes = require('./src/routes/blogAuthorRoutes');
const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  }
}));
app.use(cors());
app.use(compression());

// Webhook routes need raw body - must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/moyasar/webhook', express.json());

// Apply rate limiting to all routes except webhooks
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook' || req.path === '/api/moyasar/webhook') {
    return next();
  }
  limiter(req, res, next);
});

// Custom readable logging format
morgan.token('statusColor', (req, res) => {
  const status = res.statusCode;
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // Red
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // Yellow
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // Cyan
  return `\x1b[32m${status}\x1b[0m`; // Green
});

app.use(morgan(':method :url :statusColor :response-time ms'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'E-Invoicing Solution',
    version: '1.0.1',
    status: 'running',
    docs: '/api-docs'
  });
});

// Swagger API Documentation - Custom HTML with CDN for Vercel compatibility
const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fatoortak API Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api-docs.json",
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`;

app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

app.get('/api-docs/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/', userRoutes);
app.use('/', roleRoutes);
app.use('/payments', paymentPlanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/moyasar', moyasarRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/debit-notes', debitNoteRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/zatca', zatcaTestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/blog-categories', blogCategoryRoutes);
app.use('/api/blog-authors', blogAuthorRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;