const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/user.model');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully.');

    // Pehle existing admin ko delete karein
    const deleteResult = await User.deleteOne({ email: 'admin@example.com' });
    
    if (deleteResult.deletedCount > 0) {
      console.log('Existing admin user deleted successfully.');
    } else {
      console.log('No existing admin user found.');
    }

    // Ab naya admin create karein
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // Agar pre-save hook hai to automatic hash hoga
      role: 'admin',
    });

    await adminUser.save();
    console.log('New admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

createAdmin();