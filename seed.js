const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user.model'); // Apne User model ka sahi path daalein

// Environment variables load karein
dotenv.config();

const createAdmin = async () => {
  try {
    // Database se connect karein
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully.');

    // Check karein ki admin pehle se hai ya nahi
    const adminExists = await User.findOne({ email: 'admin@example.com' });

    if (adminExists) {
      console.log('Admin user already exists.');
    } else {
      // Agar admin nahi hai, to naya banayein
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123', // Is password ko use karke login karna hoga
        role: 'admin',
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    // Connection band karein
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

// Function ko call karein
createAdmin();