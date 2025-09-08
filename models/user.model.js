const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Taaki multiple users ki value null ho sake
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  picture: {
    type: String,
  },
  password: {
    type: String,
    // Password tabhi zaroori hai jab user Google se sign up na kar raha ho
    required: function() { return !this.googleId; },
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  
  // --- ADDED FOR FAVORITE NAMES ---
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Name' // This creates a reference to documents in the 'Name' collection
  }],
  godNameFavorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GodName' // Yeh naam aapke godName model se match hona chahiye
  }],
  
  nicknameFavorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nickname'
  }],
  // ---------------------------------
  
}, { timestamps: true });

// Password ko save karne se pehle hash karna
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password compare karne ka method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;