const mongoose = require('mongoose');
const logger = require('../helpers/logger');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!process.env.MONGODB_URI) {
      console.warn('Warning: Using default MongoDB connection string. Please set MONGODB_URI in your .env file for production.');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected to database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Please make sure MongoDB is running and the connection string is correct.');
    process.exit(1);
  }
};

module.exports = connectDB;