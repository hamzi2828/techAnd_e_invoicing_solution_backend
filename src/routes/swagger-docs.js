/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *
 * /user/signup:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *
 * /user/google-login:
 *   post:
 *     summary: Login with Google
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google ID token
 *     responses:
 *       200:
 *         description: Login successful
 *
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /user/update:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *
 * /users/all:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of users
 *
 * /users/created-by-me:
 *   get:
 *     summary: Get users created by authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *     responses:
 *       200:
 *         description: List of companies
 *   post:
 *     summary: Create a new company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyCreate'
 *     responses:
 *       201:
 *         description: Company created
 *
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *   put:
 *     summary: Update company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyCreate'
 *     responses:
 *       200:
 *         description: Company updated
 *   delete:
 *     summary: Delete company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company deleted
 *
 * /api/companies/me:
 *   get:
 *     summary: Get user's primary company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's company
 *
 * /api/companies/{id}/zatca/generate-csr:
 *   post:
 *     summary: Generate CSR for ZATCA onboarding
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commonName:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               organizationIdentifier:
 *                 type: string
 *               organizationUnitName:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               countryName:
 *                 type: string
 *               invoiceType:
 *                 type: string
 *               location:
 *                 type: string
 *               industry:
 *                 type: string
 *     responses:
 *       200:
 *         description: CSR generated
 *
 * /api/companies/{id}/zatca/compliance-cert:
 *   post:
 *     summary: Get ZATCA compliance certificate
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Compliance certificate obtained
 *
 * /api/companies/{id}/zatca/production-csid:
 *   post:
 *     summary: Get ZATCA production CSID
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Production CSID obtained
 *
 * /api/companies/{id}/zatca/status:
 *   get:
 *     summary: Get ZATCA onboarding status
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ZATCA status
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerCreate'
 *     responses:
 *       201:
 *         description: Customer created
 *
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerCreate'
 *     responses:
 *       200:
 *         description: Customer updated
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted
 *
 * /api/customers/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: Customer statistics
 */

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *       - name: customerId
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of invoices
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceCreate'
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 invoice:
 *                   $ref: '#/components/schemas/Invoice'
 *
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details
 *   put:
 *     summary: Update invoice (draft only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceCreate'
 *     responses:
 *       200:
 *         description: Invoice updated
 *   delete:
 *     summary: Delete invoice (draft only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice deleted
 *
 * /api/invoices/{id}/status:
 *   patch:
 *     summary: Update invoice status
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, partially_paid, overdue, cancelled, void]
 *     responses:
 *       200:
 *         description: Status updated
 *
 * /api/invoices/{id}/payments:
 *   post:
 *     summary: Add payment to invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentCreate'
 *     responses:
 *       200:
 *         description: Payment added
 *
 * /api/invoices/{id}/zatca/validate:
 *   post:
 *     summary: Validate invoice against ZATCA rules
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Validation result
 *
 * /api/invoices/{id}/zatca/pdf:
 *   get:
 *     summary: Download ZATCA-compliant PDF/A-3 with embedded XML
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /api/invoices/{id}/zatca/qrcode:
 *   get:
 *     summary: Get ZATCA QR code
 *     tags: [ZATCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code data
 *
 * /api/invoices/stats:
 *   get:
 *     summary: Get invoice statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: Invoice statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvoiceStats'
 *
 * /api/invoices/next-number/{companyId}:
 *   get:
 *     summary: Get next invoice number
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next invoice number
 *
 * /api/invoices/bulk-import:
 *   post:
 *     summary: Bulk import invoices from Excel/CSV
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               companyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Import result
 */

/**
 * @swagger
 * /api/credit-notes:
 *   get:
 *     summary: Get all credit notes
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: List of credit notes
 *   post:
 *     summary: Create a credit note
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreditNoteCreate'
 *     responses:
 *       201:
 *         description: Credit note created
 *
 * /api/credit-notes/{id}:
 *   get:
 *     summary: Get credit note by ID
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit note details
 *
 * /api/credit-notes/{id}/apply:
 *   post:
 *     summary: Apply credit note to invoice
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit note applied
 */

/**
 * @swagger
 * /api/debit-notes:
 *   get:
 *     summary: Get all debit notes
 *     tags: [Debit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: List of debit notes
 *   post:
 *     summary: Create a debit note
 *     tags: [Debit Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - companyId
 *               - items
 *               - reason
 *             properties:
 *               customerId:
 *                 type: string
 *               companyId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/InvoiceItemInput'
 *               reason:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Debit note created
 *
 * /api/debit-notes/{id}:
 *   get:
 *     summary: Get debit note by ID
 *     tags: [Debit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Debit note details
 */

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     summary: Get all quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *     responses:
 *       200:
 *         description: List of quotations
 *   post:
 *     summary: Create a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuotationCreate'
 *     responses:
 *       201:
 *         description: Quotation created
 *
 * /api/quotations/{id}:
 *   get:
 *     summary: Get quotation by ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation details
 *
 * /api/quotations/{id}/convert:
 *   post:
 *     summary: Convert quotation to invoice
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice created from quotation
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - name: categoryId
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201:
 *         description: Product created
 *
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Update product stock
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stock:
 *                 type: number
 *               adjustment:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock updated
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: List of categories
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               parentId:
 *                 type: string
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: Category tree
 */

/**
 * @swagger
 * /api/payments/checkout:
 *   post:
 *     summary: Create checkout session
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: string
 *               paymentGateway:
 *                 type: string
 *                 enum: [stripe, moyasar]
 *     responses:
 *       200:
 *         description: Checkout session created
 *
 * /api/payments/webhook:
 *   post:
 *     summary: Payment webhook handler
 *     tags: [Payments]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *
 * /api/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Payment history
 *
 * /api/payments/refund:
 *   post:
 *     summary: Process refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed
 */

/**
 * @swagger
 * /api/moyasar/create-payment:
 *   post:
 *     summary: Create Moyasar payment
 *     tags: [Moyasar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MoyasarPaymentCreate'
 *     responses:
 *       200:
 *         description: Payment created
 *
 * /api/moyasar/webhook:
 *   post:
 *     summary: Moyasar webhook handler
 *     tags: [Moyasar]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *
 * /api/moyasar/publishable-key:
 *   get:
 *     summary: Get Moyasar publishable key
 *     tags: [Moyasar]
 *     responses:
 *       200:
 *         description: Publishable key
 *
 * /api/moyasar/verify/{paymentId}:
 *   get:
 *     summary: Verify Moyasar payment
 *     tags: [Moyasar]
 *     parameters:
 *       - name: paymentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verification result
 */

/**
 * @swagger
 * /payments/plans:
 *   get:
 *     summary: Get all payment plans
 *     tags: [Payment Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment plans
 *   post:
 *     summary: Create payment plan
 *     tags: [Payment Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - monthlyPrice
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               description:
 *                 type: string
 *               monthlyPrice:
 *                 type: number
 *               yearlyPrice:
 *                 type: number
 *               currency:
 *                 type: string
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               limits:
 *                 type: object
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, both]
 *     responses:
 *       201:
 *         description: Payment plan created
 *
 * /payments/plans/active:
 *   get:
 *     summary: Get active payment plans
 *     tags: [Payment Plans]
 *     responses:
 *       200:
 *         description: Active plans
 *
 * /payments/plans/{id}:
 *   get:
 *     summary: Get payment plan by ID
 *     tags: [Payment Plans]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment plan details
 */

/**
 * @swagger
 * /api/bank-accounts:
 *   get:
 *     summary: Get all bank accounts
 *     tags: [Bank Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: List of bank accounts
 *   post:
 *     summary: Create bank account
 *     tags: [Bank Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BankAccountCreate'
 *     responses:
 *       201:
 *         description: Bank account created
 *
 * /api/bank-accounts/saudi-banks:
 *   get:
 *     summary: Get list of Saudi banks
 *     tags: [Bank Accounts]
 *     responses:
 *       200:
 *         description: Saudi banks list
 *
 * /api/bank-accounts/validate-iban:
 *   post:
 *     summary: Validate IBAN
 *     tags: [Bank Accounts]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               iban:
 *                 type: string
 *     responses:
 *       200:
 *         description: IBAN validation result
 *
 * /api/bank-accounts/{id}:
 *   get:
 *     summary: Get bank account by ID
 *     tags: [Bank Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bank account details
 *   delete:
 *     summary: Delete bank account
 *     tags: [Bank Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bank account deleted
 *
 * /api/bank-accounts/{id}/set-default:
 *   put:
 *     summary: Set bank account as default
 *     tags: [Bank Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default set
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               level:
 *                 type: number
 *     responses:
 *       201:
 *         description: Role created
 *
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role details
 *
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 *   post:
 *     summary: Create permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - category
 *               - resource
 *               - action
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               resource:
 *                 type: string
 *               action:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 *
 * /permissions/categories:
 *   get:
 *     summary: Get permission categories
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission categories
 */

/**
 * @swagger
 * /api/reports/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *
 * /api/reports/sales/overview:
 *   get:
 *     summary: Get sales overview
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: Sales overview
 *
 * /api/reports/sales/monthly-revenue:
 *   get:
 *     summary: Get monthly revenue report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Monthly revenue
 *
 * /api/reports/sales/top-customers:
 *   get:
 *     summary: Get top customers report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top customers
 *
 * /api/reports/sales/top-products:
 *   get:
 *     summary: Get top products report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top products
 *
 * /api/reports/financial/revenue-trend:
 *   get:
 *     summary: Get revenue trend
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompanyIdParam'
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *     responses:
 *       200:
 *         description: Revenue trend
 */

/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: Get all blogs
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/StatusParam'
 *     responses:
 *       200:
 *         description: List of blogs
 *   post:
 *     summary: Create blog post
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               category:
 *                 type: string
 *               author:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, scheduled]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Blog created
 *
 * /api/blogs/published:
 *   get:
 *     summary: Get published blogs
 *     tags: [Blogs]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Published blogs
 *
 * /api/blogs/slug/{slug}:
 *   get:
 *     summary: Get blog by slug
 *     tags: [Blogs]
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog post
 *
 * /api/blog-categories:
 *   get:
 *     summary: Get all blog categories
 *     tags: [Blog Categories]
 *     responses:
 *       200:
 *         description: Blog categories
 *   post:
 *     summary: Create blog category
 *     tags: [Blog Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *
 * /api/blog-authors:
 *   get:
 *     summary: Get all blog authors
 *     tags: [Blog Authors]
 *     responses:
 *       200:
 *         description: Blog authors
 *   post:
 *     summary: Create blog author
 *     tags: [Blog Authors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, editor, author, contributor]
 *     responses:
 *       201:
 *         description: Author created
 */

module.exports = {};
