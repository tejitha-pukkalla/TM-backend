const mongoose = require('mongoose');
const User = require('../models/User.model');
const { ROLES } = require('../config/constants');
require('dotenv').config();

const seedSuperadmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Database connected for seeding...');

    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ 
      globalRole: ROLES.SUPERADMIN  // ✅ 'superadmin' value use avutundi
    });

    if (existingSuperadmin) {
      console.log('✅ Superadmin already exists:', existingSuperadmin.email);
      console.log('⏭️  Skipping seed. Use existing credentials to login.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get superadmin details from environment variables
    const superadminData = {
      name: process.env.SUPERADMIN_NAME || 'Super Admin',
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      globalRole: ROLES.SUPERADMIN,  // ✅ 'superadmin' assign avutundi
      department: process.env.SUPERADMIN_DEPARTMENT || 'Administration',
      phone: process.env.SUPERADMIN_PHONE || '',
      isActive: true,
      createdBy: null
    };

    // Validate required fields
    if (!superadminData.email || !superadminData.password) {
      console.error('❌ Error: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env file');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Create superadmin
    const superadmin = await User.create(superadminData);

    console.log('🎉 Superadmin created successfully!');
    console.log('📧 Email:', superadmin.email);
    console.log('👤 Name:', superadmin.name);
    console.log('👑 Role:', superadmin.globalRole);
    console.log('🔐 Use the password from SUPERADMIN_PASSWORD env variable to login');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the seed function
seedSuperadmin();