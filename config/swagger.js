const swaggerJsdoc = require('swagger-jsdoc');

// Define paths directly (Vercel serverless cannot scan files at runtime)
const swaggerPaths = {
  // Authentication
  '/user/login': {
    post: {
      summary: 'User login',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UserLogin' }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' }
            }
          }
        },
        401: { description: 'Invalid credentials' }
      }
    }
  },
  '/user/signup': {
    post: {
      summary: 'Register new user',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UserSignup' }
          }
        }
      },
      responses: {
        201: { description: 'User created successfully' },
        400: { description: 'Validation error' }
      }
    }
  },
  '/user/google-login': {
    post: {
      summary: 'Login with Google',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                credential: { type: 'string', description: 'Google ID token' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Login successful' }
      }
    }
  },
  '/user/profile': {
    get: {
      summary: 'Get user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  },
  '/user/update': {
    put: {
      summary: 'Update user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                avatarUrl: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Profile updated' }
      }
    }
  },
  '/users/all': {
    get: {
      summary: 'Get all users',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        200: { description: 'List of users' }
      }
    }
  },
  '/users/created-by-me': {
    get: {
      summary: 'Get users created by authenticated user',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'List of users' }
      }
    }
  },

  // Companies
  '/api/companies': {
    get: {
      summary: 'Get all companies',
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/StatusParam' }
      ],
      responses: {
        200: { description: 'List of companies' }
      }
    },
    post: {
      summary: 'Create a new company',
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CompanyCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Company created' }
      }
    }
  },
  '/api/companies/{id}': {
    get: {
      summary: 'Get company by ID',
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'Company details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  company: { $ref: '#/components/schemas/Company' }
                }
              }
            }
          }
        }
      }
    },
    put: {
      summary: 'Update company',
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CompanyCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Company updated' }
      }
    },
    delete: {
      summary: 'Delete company',
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Company deleted' }
      }
    }
  },
  '/api/companies/me': {
    get: {
      summary: "Get user's primary company",
      tags: ['Companies'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "User's company" }
      }
    }
  },
  '/api/companies/{id}/zatca/generate-csr': {
    post: {
      summary: 'Generate CSR for ZATCA onboarding',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                commonName: { type: 'string' },
                serialNumber: { type: 'string' },
                organizationIdentifier: { type: 'string' },
                organizationUnitName: { type: 'string' },
                organizationName: { type: 'string' },
                countryName: { type: 'string' },
                invoiceType: { type: 'string' },
                location: { type: 'string' },
                industry: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'CSR generated' }
      }
    }
  },
  '/api/companies/{id}/zatca/compliance-cert': {
    post: {
      summary: 'Get ZATCA compliance certificate',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Compliance certificate obtained' }
      }
    }
  },
  '/api/companies/{id}/zatca/production-csid': {
    post: {
      summary: 'Get ZATCA production CSID',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Production CSID obtained' }
      }
    }
  },
  '/api/companies/{id}/zatca/status': {
    get: {
      summary: 'Get ZATCA onboarding status',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'ZATCA status' }
      }
    }
  },

  // Customers
  '/api/customers': {
    get: {
      summary: 'Get all customers',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/CompanyIdParam' },
        { $ref: '#/components/parameters/StatusParam' }
      ],
      responses: {
        200: { description: 'List of customers' }
      }
    },
    post: {
      summary: 'Create a new customer',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CustomerCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Customer created' }
      }
    }
  },
  '/api/customers/{id}': {
    get: {
      summary: 'Get customer by ID',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Customer details' }
      }
    },
    put: {
      summary: 'Update customer',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CustomerCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Customer updated' }
      }
    },
    delete: {
      summary: 'Delete customer',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Customer deleted' }
      }
    }
  },
  '/api/customers/stats': {
    get: {
      summary: 'Get customer statistics',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'Customer statistics' }
      }
    }
  },

  // Invoices
  '/api/invoices': {
    get: {
      summary: 'Get all invoices',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/CompanyIdParam' },
        { $ref: '#/components/parameters/StatusParam' },
        { $ref: '#/components/parameters/DateFromParam' },
        { $ref: '#/components/parameters/DateToParam' },
        { name: 'customerId', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'List of invoices' }
      }
    },
    post: {
      summary: 'Create a new invoice',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InvoiceCreate' }
          }
        }
      },
      responses: {
        201: {
          description: 'Invoice created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  invoice: { $ref: '#/components/schemas/Invoice' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/invoices/{id}': {
    get: {
      summary: 'Get invoice by ID',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Invoice details' }
      }
    },
    put: {
      summary: 'Update invoice (draft only)',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InvoiceCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Invoice updated' }
      }
    },
    delete: {
      summary: 'Delete invoice (draft only)',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Invoice deleted' }
      }
    }
  },
  '/api/invoices/{id}/status': {
    patch: {
      summary: 'Update invoice status',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void']
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Status updated' }
      }
    }
  },
  '/api/invoices/{id}/payments': {
    post: {
      summary: 'Add payment to invoice',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PaymentCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Payment added' }
      }
    }
  },
  '/api/invoices/{id}/zatca/validate': {
    post: {
      summary: 'Validate invoice against ZATCA rules',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Validation result' }
      }
    }
  },
  '/api/invoices/{id}/zatca/pdf': {
    get: {
      summary: 'Download ZATCA-compliant PDF/A-3 with embedded XML',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'PDF file',
          content: {
            'application/pdf': {
              schema: { type: 'string', format: 'binary' }
            }
          }
        }
      }
    }
  },
  '/api/invoices/{id}/zatca/qrcode': {
    get: {
      summary: 'Get ZATCA QR code',
      tags: ['ZATCA'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'QR code data' }
      }
    }
  },
  '/api/invoices/stats': {
    get: {
      summary: 'Get invoice statistics',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: {
          description: 'Invoice statistics',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InvoiceStats' }
            }
          }
        }
      }
    }
  },
  '/api/invoices/next-number/{companyId}': {
    get: {
      summary: 'Get next invoice number',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Next invoice number' }
      }
    }
  },
  '/api/invoices/bulk-import': {
    post: {
      summary: 'Bulk import invoices from Excel/CSV',
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                companyId: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Import result' }
      }
    }
  },

  // Credit Notes
  '/api/credit-notes': {
    get: {
      summary: 'Get all credit notes',
      tags: ['Credit Notes'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'List of credit notes' }
      }
    },
    post: {
      summary: 'Create a credit note',
      tags: ['Credit Notes'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreditNoteCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Credit note created' }
      }
    }
  },
  '/api/credit-notes/{id}': {
    get: {
      summary: 'Get credit note by ID',
      tags: ['Credit Notes'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Credit note details' }
      }
    }
  },
  '/api/credit-notes/{id}/apply': {
    post: {
      summary: 'Apply credit note to invoice',
      tags: ['Credit Notes'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Credit note applied' }
      }
    }
  },

  // Debit Notes
  '/api/debit-notes': {
    get: {
      summary: 'Get all debit notes',
      tags: ['Debit Notes'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'List of debit notes' }
      }
    },
    post: {
      summary: 'Create a debit note',
      tags: ['Debit Notes'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['customerId', 'companyId', 'items', 'reason'],
              properties: {
                customerId: { type: 'string' },
                companyId: { type: 'string' },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/InvoiceItemInput' }
                },
                reason: { type: 'string' },
                dueDate: { type: 'string', format: 'date' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Debit note created' }
      }
    }
  },
  '/api/debit-notes/{id}': {
    get: {
      summary: 'Get debit note by ID',
      tags: ['Debit Notes'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Debit note details' }
      }
    }
  },

  // Quotations
  '/api/quotations': {
    get: {
      summary: 'Get all quotations',
      tags: ['Quotations'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/CompanyIdParam' },
        { $ref: '#/components/parameters/StatusParam' }
      ],
      responses: {
        200: { description: 'List of quotations' }
      }
    },
    post: {
      summary: 'Create a quotation',
      tags: ['Quotations'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/QuotationCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Quotation created' }
      }
    }
  },
  '/api/quotations/{id}': {
    get: {
      summary: 'Get quotation by ID',
      tags: ['Quotations'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Quotation details' }
      }
    }
  },
  '/api/quotations/{id}/convert': {
    post: {
      summary: 'Convert quotation to invoice',
      tags: ['Quotations'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Invoice created from quotation' }
      }
    }
  },

  // Products
  '/api/products': {
    get: {
      summary: 'Get all products',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/CompanyIdParam' },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'List of products' }
      }
    },
    post: {
      summary: 'Create a product',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProductCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Product created' }
      }
    }
  },
  '/api/products/{id}': {
    get: {
      summary: 'Get product by ID',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Product details' }
      }
    },
    put: {
      summary: 'Update product',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProductCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Product updated' }
      }
    },
    delete: {
      summary: 'Delete product',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Product deleted' }
      }
    }
  },
  '/api/products/{id}/stock': {
    patch: {
      summary: 'Update product stock',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                stock: { type: 'number' },
                adjustment: { type: 'number' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Stock updated' }
      }
    }
  },

  // Categories
  '/api/categories': {
    get: {
      summary: 'Get all categories',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'List of categories' }
      }
    },
    post: {
      summary: 'Create a category',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'companyId'],
              properties: {
                name: { type: 'string' },
                nameAr: { type: 'string' },
                parentId: { type: 'string' },
                companyId: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Category created' }
      }
    }
  },
  '/api/categories/tree': {
    get: {
      summary: 'Get category tree structure',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'Category tree' }
      }
    }
  },

  // Payments
  '/api/payments/checkout': {
    post: {
      summary: 'Create checkout session',
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                invoiceId: { type: 'string' },
                paymentGateway: { type: 'string', enum: ['stripe', 'moyasar'] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Checkout session created' }
      }
    }
  },
  '/api/payments/webhook': {
    post: {
      summary: 'Payment webhook handler',
      tags: ['Payments'],
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      responses: {
        200: { description: 'Webhook processed' }
      }
    }
  },
  '/api/payments/history': {
    get: {
      summary: 'Get payment history',
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        200: { description: 'Payment history' }
      }
    }
  },
  '/api/payments/refund': {
    post: {
      summary: 'Process refund',
      tags: ['Payments'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                paymentId: { type: 'string' },
                amount: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Refund processed' }
      }
    }
  },

  // Moyasar
  '/api/moyasar/create-payment': {
    post: {
      summary: 'Create Moyasar payment',
      tags: ['Moyasar'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MoyasarPaymentCreate' }
          }
        }
      },
      responses: {
        200: { description: 'Payment created' }
      }
    }
  },
  '/api/moyasar/webhook': {
    post: {
      summary: 'Moyasar webhook handler',
      tags: ['Moyasar'],
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      },
      responses: {
        200: { description: 'Webhook processed' }
      }
    }
  },
  '/api/moyasar/publishable-key': {
    get: {
      summary: 'Get Moyasar publishable key',
      tags: ['Moyasar'],
      responses: {
        200: { description: 'Publishable key' }
      }
    }
  },
  '/api/moyasar/verify/{paymentId}': {
    get: {
      summary: 'Verify Moyasar payment',
      tags: ['Moyasar'],
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Payment verification result' }
      }
    }
  },

  // Payment Plans
  '/payments/plans': {
    get: {
      summary: 'Get all payment plans',
      tags: ['Payment Plans'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'List of payment plans' }
      }
    },
    post: {
      summary: 'Create payment plan',
      tags: ['Payment Plans'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'monthlyPrice'],
              properties: {
                name: { type: 'string' },
                nameAr: { type: 'string' },
                description: { type: 'string' },
                monthlyPrice: { type: 'number' },
                yearlyPrice: { type: 'number' },
                currency: { type: 'string' },
                features: { type: 'array', items: { type: 'string' } },
                limits: { type: 'object' },
                billingCycle: { type: 'string', enum: ['monthly', 'yearly', 'both'] }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Payment plan created' }
      }
    }
  },
  '/payments/plans/active': {
    get: {
      summary: 'Get active payment plans',
      tags: ['Payment Plans'],
      responses: {
        200: { description: 'Active plans' }
      }
    }
  },
  '/payments/plans/{id}': {
    get: {
      summary: 'Get payment plan by ID',
      tags: ['Payment Plans'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Payment plan details' }
      }
    }
  },

  // Bank Accounts
  '/api/bank-accounts': {
    get: {
      summary: 'Get all bank accounts',
      tags: ['Bank Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: { description: 'List of bank accounts' }
      }
    },
    post: {
      summary: 'Create bank account',
      tags: ['Bank Accounts'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/BankAccountCreate' }
          }
        }
      },
      responses: {
        201: { description: 'Bank account created' }
      }
    }
  },
  '/api/bank-accounts/saudi-banks': {
    get: {
      summary: 'Get list of Saudi banks',
      tags: ['Bank Accounts'],
      responses: {
        200: { description: 'Saudi banks list' }
      }
    }
  },
  '/api/bank-accounts/validate-iban': {
    post: {
      summary: 'Validate IBAN',
      tags: ['Bank Accounts'],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                iban: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'IBAN validation result' }
      }
    }
  },
  '/api/bank-accounts/{id}': {
    get: {
      summary: 'Get bank account by ID',
      tags: ['Bank Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Bank account details' }
      }
    },
    delete: {
      summary: 'Delete bank account',
      tags: ['Bank Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Bank account deleted' }
      }
    }
  },
  '/api/bank-accounts/{id}/set-default': {
    put: {
      summary: 'Set bank account as default',
      tags: ['Bank Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Default set' }
      }
    }
  },

  // Roles & Permissions
  '/roles': {
    get: {
      summary: 'Get all roles',
      tags: ['Roles'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'List of roles' }
      }
    },
    post: {
      summary: 'Create role',
      tags: ['Roles'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } },
                level: { type: 'number' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Role created' }
      }
    }
  },
  '/roles/{id}': {
    get: {
      summary: 'Get role by ID',
      tags: ['Roles'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Role details' }
      }
    }
  },
  '/permissions': {
    get: {
      summary: 'Get all permissions',
      tags: ['Permissions'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'List of permissions' }
      }
    },
    post: {
      summary: 'Create permission',
      tags: ['Permissions'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['id', 'name', 'category', 'resource', 'action'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' },
                resource: { type: 'string' },
                action: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Permission created' }
      }
    }
  },
  '/permissions/categories': {
    get: {
      summary: 'Get permission categories',
      tags: ['Permissions'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Permission categories' }
      }
    }
  },

  // Reports
  '/api/reports/dashboard/stats': {
    get: {
      summary: 'Get dashboard statistics',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' }
      ],
      responses: {
        200: {
          description: 'Dashboard statistics',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DashboardStats' }
            }
          }
        }
      }
    }
  },
  '/api/reports/sales/overview': {
    get: {
      summary: 'Get sales overview',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' },
        { $ref: '#/components/parameters/DateFromParam' },
        { $ref: '#/components/parameters/DateToParam' }
      ],
      responses: {
        200: { description: 'Sales overview' }
      }
    }
  },
  '/api/reports/sales/monthly-revenue': {
    get: {
      summary: 'Get monthly revenue report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' },
        { name: 'year', in: 'query', schema: { type: 'integer' } }
      ],
      responses: {
        200: { description: 'Monthly revenue' }
      }
    }
  },
  '/api/reports/sales/top-customers': {
    get: {
      summary: 'Get top customers report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Top customers' }
      }
    }
  },
  '/api/reports/sales/top-products': {
    get: {
      summary: 'Get top products report',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: { description: 'Top products' }
      }
    }
  },
  '/api/reports/financial/revenue-trend': {
    get: {
      summary: 'Get revenue trend',
      tags: ['Reports'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/CompanyIdParam' },
        { name: 'period', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'] } }
      ],
      responses: {
        200: { description: 'Revenue trend' }
      }
    }
  },

  // Blogs
  '/api/blogs': {
    get: {
      summary: 'Get all blogs',
      tags: ['Blogs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/StatusParam' }
      ],
      responses: {
        200: { description: 'List of blogs' }
      }
    },
    post: {
      summary: 'Create blog post',
      tags: ['Blogs'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'content'],
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                excerpt: { type: 'string' },
                category: { type: 'string' },
                author: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                status: { type: 'string', enum: ['draft', 'published', 'scheduled'] },
                scheduledAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Blog created' }
      }
    }
  },
  '/api/blogs/published': {
    get: {
      summary: 'Get published blogs',
      tags: ['Blogs'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' }
      ],
      responses: {
        200: { description: 'Published blogs' }
      }
    }
  },
  '/api/blogs/slug/{slug}': {
    get: {
      summary: 'Get blog by slug',
      tags: ['Blogs'],
      parameters: [
        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Blog post' }
      }
    }
  },
  '/api/blog-categories': {
    get: {
      summary: 'Get all blog categories',
      tags: ['Blog Categories'],
      responses: {
        200: { description: 'Blog categories' }
      }
    },
    post: {
      summary: 'Create blog category',
      tags: ['Blog Categories'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Category created' }
      }
    }
  },
  '/api/blog-authors': {
    get: {
      summary: 'Get all blog authors',
      tags: ['Blog Authors'],
      responses: {
        200: { description: 'Blog authors' }
      }
    },
    post: {
      summary: 'Create blog author',
      tags: ['Blog Authors'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['firstName', 'lastName', 'email'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'editor', 'author', 'contributor'] }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Author created' }
      }
    }
  }
};

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'E-Invoicing Solution API (Fatoortak)',
    version: '1.0.0',
    description: `
# E-Invoicing Solution API Documentation

A comprehensive e-invoicing platform with ZATCA (Saudi Arabian Tax Authority) compliance.

## Features
- **Invoice Management** - Create, manage, and track invoices with ZATCA compliance
- **ZATCA E-Invoicing** - Full integration with Saudi Arabian e-invoicing requirements
- **Customer Management** - Manage customers and their billing information
- **Product Catalog** - Manage products and categories
- **Payment Processing** - Support for Moyasar and Stripe payment gateways
- **Quotations** - Create and convert quotations to invoices
- **Credit/Debit Notes** - Handle adjustments and corrections
- **Role-Based Access Control** - Fine-grained permissions system
- **Reporting** - Comprehensive analytics and reports

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Rate Limiting
- 1000 requests per 15 minutes per IP
- Webhook endpoints are excluded from rate limiting
    `,
    contact: {
      name: 'API Support',
      email: 'support@fatoortak.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://e-invoicing-solution-backend.vercel.app',
      description: 'Production server'
    },
    {
      url: 'http://localhost:4000',
      description: 'Development server'
    }
  ],
  paths: swaggerPaths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'User ID' },
          email: { type: 'string', format: 'email', description: 'User email address' },
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          role: { $ref: '#/components/schemas/Role' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          assignedCompanyId: { type: 'string', description: 'Assigned company ID' },
          avatarUrl: { type: 'string', description: 'Profile picture URL' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', example: 'password123' }
        }
      },
      UserSignup: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 6, example: 'password123' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: { type: 'string', description: 'JWT token' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      Company: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          companyName: { type: 'string', description: 'Company name' },
          companyNameAr: { type: 'string', description: 'Company name in Arabic' },
          commercialRegistrationNumber: { type: 'string', description: 'CR number' },
          taxIdNumber: { type: 'string', description: 'VAT registration number' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' },
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
          isDefault: { type: 'boolean' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CompanyCreate: {
        type: 'object',
        required: ['companyName', 'commercialRegistrationNumber', 'taxIdNumber', 'email'],
        properties: {
          companyName: { type: 'string', example: 'Acme Corporation' },
          companyNameAr: { type: 'string', example: 'شركة أكمي' },
          commercialRegistrationNumber: { type: 'string', example: '1010123456' },
          taxIdNumber: { type: 'string', example: '300000000000003' },
          email: { type: 'string', format: 'email', example: 'info@acme.com' },
          phone: { type: 'string', example: '+966501234567' },
          address: { $ref: '#/components/schemas/AddressInput' }
        }
      },
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          buildingNumber: { type: 'string' },
          additionalNumber: { type: 'string' },
          district: { type: 'string' }
        }
      },
      AddressInput: {
        type: 'object',
        properties: {
          street: { type: 'string', example: 'King Fahd Road' },
          city: { type: 'string', example: 'Riyadh' },
          state: { type: 'string', example: 'Riyadh Region' },
          postalCode: { type: 'string', example: '12345' },
          country: { type: 'string', example: 'SA' },
          buildingNumber: { type: 'string', example: '1234' },
          additionalNumber: { type: 'string', example: '5678' },
          district: { type: 'string', example: 'Olaya' }
        }
      },
      Customer: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          customerName: { type: 'string' },
          customerNameAr: { type: 'string' },
          customerType: { type: 'string', enum: ['B2B', 'B2C'] },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          taxId: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' },
          companyId: { type: 'string' },
          creditLimit: { type: 'number' },
          discount: { type: 'number' },
          status: { type: 'string', enum: ['active', 'inactive'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CustomerCreate: {
        type: 'object',
        required: ['customerName', 'customerType', 'companyId'],
        properties: {
          customerName: { type: 'string', example: 'Customer Corp' },
          customerNameAr: { type: 'string', example: 'شركة العميل' },
          customerType: { type: 'string', enum: ['B2B', 'B2C'], example: 'B2B' },
          email: { type: 'string', format: 'email', example: 'customer@example.com' },
          phone: { type: 'string', example: '+966501234567' },
          taxId: { type: 'string', example: '300000000000003' },
          address: { $ref: '#/components/schemas/AddressInput' },
          companyId: { type: 'string', description: 'Company ID this customer belongs to' },
          creditLimit: { type: 'number', example: 50000 },
          discount: { type: 'number', example: 5 }
        }
      },
      Invoice: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          invoiceNumber: { type: 'string' },
          customerId: { $ref: '#/components/schemas/Customer' },
          companyId: { $ref: '#/components/schemas/Company' },
          invoiceDate: { type: 'string', format: 'date' },
          dueDate: { type: 'string', format: 'date' },
          items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItem' } },
          subtotal: { type: 'number' },
          discount: { type: 'number' },
          taxAmount: { type: 'number' },
          total: { type: 'number' },
          amountPaid: { type: 'number' },
          balanceDue: { type: 'number' },
          currency: { type: 'string', default: 'SAR' },
          status: { type: 'string', enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'] },
          invoiceType: { type: 'string', enum: ['standard', 'simplified'] },
          zatcaStatus: { type: 'string', enum: ['pending', 'validated', 'cleared', 'reported', 'rejected'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      InvoiceCreate: {
        type: 'object',
        required: ['customerId', 'companyId', 'items'],
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
          companyId: { type: 'string', description: 'Company ID' },
          invoiceDate: { type: 'string', format: 'date', example: '2024-01-15' },
          dueDate: { type: 'string', format: 'date', example: '2024-02-15' },
          items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItemInput' } },
          discount: { type: 'number', example: 0 },
          currency: { type: 'string', default: 'SAR', example: 'SAR' },
          invoiceType: { type: 'string', enum: ['standard', 'simplified'], default: 'standard' },
          notes: { type: 'string', example: 'Thank you for your business' },
          paymentTerms: { type: 'string', example: '30' }
        }
      },
      InvoiceItem: {
        type: 'object',
        properties: {
          product: { type: 'string' },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
          taxRate: { type: 'number' },
          taxAmount: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' }
        }
      },
      InvoiceItemInput: {
        type: 'object',
        required: ['description', 'quantity', 'unitPrice'],
        properties: {
          product: { type: 'string', description: 'Product ID (optional)' },
          description: { type: 'string', example: 'Consulting Services' },
          quantity: { type: 'number', example: 10 },
          unitPrice: { type: 'number', example: 100 },
          taxRate: { type: 'number', default: 15, example: 15 },
          discount: { type: 'number', default: 0, example: 0 }
        }
      },
      CreditNoteCreate: {
        type: 'object',
        required: ['originalInvoiceId', 'items', 'reason'],
        properties: {
          originalInvoiceId: { type: 'string', description: 'Original invoice ID' },
          items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItemInput' } },
          reason: { type: 'string', example: 'Returned goods' }
        }
      },
      QuotationCreate: {
        type: 'object',
        required: ['customerId', 'companyId', 'items'],
        properties: {
          customerId: { type: 'string' },
          companyId: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItemInput' } },
          validUntil: { type: 'string', format: 'date', example: '2024-02-15' },
          notes: { type: 'string' }
        }
      },
      ProductCreate: {
        type: 'object',
        required: ['name', 'price', 'companyId'],
        properties: {
          name: { type: 'string', example: 'Product Name' },
          nameAr: { type: 'string', example: 'اسم المنتج' },
          sku: { type: 'string', example: 'SKU-001' },
          description: { type: 'string' },
          price: { type: 'number', example: 100 },
          costPrice: { type: 'number', example: 70 },
          category: { type: 'string', description: 'Category ID' },
          taxRate: { type: 'number', default: 15, example: 15 },
          stock: { type: 'number', example: 100 },
          unit: { type: 'string', example: 'piece' },
          companyId: { type: 'string' }
        }
      },
      PaymentCreate: {
        type: 'object',
        required: ['amount', 'invoiceId'],
        properties: {
          amount: { type: 'number', example: 1000 },
          invoiceId: { type: 'string' },
          paymentMethod: { type: 'string', example: 'bank_transfer' }
        }
      },
      MoyasarPaymentCreate: {
        type: 'object',
        required: ['amount', 'currency', 'description'],
        properties: {
          amount: { type: 'number', description: 'Amount in halalas', example: 10000 },
          currency: { type: 'string', default: 'SAR', example: 'SAR' },
          description: { type: 'string', example: 'Invoice payment' },
          source_id: { type: 'string', description: 'Moyasar source ID' },
          reference: { type: 'string', example: 'INV-001' },
          callback_url: { type: 'string', format: 'uri' }
        }
      },
      BankAccountCreate: {
        type: 'object',
        required: ['iban', 'bankName', 'companyId'],
        properties: {
          iban: { type: 'string', example: 'SA0380000000608010167519' },
          accountNumber: { type: 'string' },
          bankName: { type: 'string', example: 'Al Rajhi Bank' },
          bankCode: { type: 'string', example: 'RJHISARI' },
          branchName: { type: 'string' },
          currency: { type: 'string', default: 'SAR' },
          companyId: { type: 'string' }
        }
      },
      Role: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          permissions: { type: 'array', items: { $ref: '#/components/schemas/Permission' } },
          level: { type: 'number' },
          isSystemRole: { type: 'boolean' },
          userCount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Permission: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' },
          isSystemPermission: { type: 'boolean' }
        }
      },
      InvoiceStats: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          draft: { type: 'number' },
          sent: { type: 'number' },
          paid: { type: 'number' },
          overdue: { type: 'number' },
          totalAmount: { type: 'number' },
          paidAmount: { type: 'number' },
          pendingAmount: { type: 'number' }
        }
      },
      DashboardStats: {
        type: 'object',
        properties: {
          totalRevenue: { type: 'number' },
          totalInvoices: { type: 'number' },
          totalCustomers: { type: 'number' },
          totalProducts: { type: 'number' },
          recentInvoices: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
          monthlyRevenue: { type: 'array', items: { type: 'object' } }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: { type: 'integer', default: 1 }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: { type: 'integer', default: 10 }
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        description: 'Search query',
        schema: { type: 'string' }
      },
      CompanyIdParam: {
        name: 'companyId',
        in: 'query',
        description: 'Filter by company ID',
        schema: { type: 'string' }
      },
      StatusParam: {
        name: 'status',
        in: 'query',
        description: 'Filter by status',
        schema: { type: 'string' }
      },
      DateFromParam: {
        name: 'dateFrom',
        in: 'query',
        description: 'Start date filter',
        schema: { type: 'string', format: 'date' }
      },
      DateToParam: {
        name: 'dateTo',
        in: 'query',
        description: 'End date filter',
        schema: { type: 'string', format: 'date' }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Unauthorized - No token provided' }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Resource not found' }
          }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Companies', description: 'Company management endpoints' },
    { name: 'Customers', description: 'Customer management endpoints' },
    { name: 'Invoices', description: 'Invoice management endpoints' },
    { name: 'Credit Notes', description: 'Credit note management endpoints' },
    { name: 'Debit Notes', description: 'Debit note management endpoints' },
    { name: 'Quotations', description: 'Quotation management endpoints' },
    { name: 'Products', description: 'Product management endpoints' },
    { name: 'Categories', description: 'Category management endpoints' },
    { name: 'Payments', description: 'Payment processing endpoints' },
    { name: 'Moyasar', description: 'Moyasar payment gateway endpoints' },
    { name: 'Payment Plans', description: 'Subscription plan management' },
    { name: 'Bank Accounts', description: 'Bank account management endpoints' },
    { name: 'Roles', description: 'Role management endpoints' },
    { name: 'Permissions', description: 'Permission management endpoints' },
    { name: 'Reports', description: 'Analytics and reporting endpoints' },
    { name: 'ZATCA', description: 'ZATCA e-invoicing compliance endpoints' },
    { name: 'Blogs', description: 'Blog management endpoints' },
    { name: 'Blog Categories', description: 'Blog category management' },
    { name: 'Blog Authors', description: 'Blog author management' }
  ]
};

module.exports = swaggerSpec;
