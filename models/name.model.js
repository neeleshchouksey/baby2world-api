const mongoose = require('mongoose');

const nameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  religionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Religion',
    required: [true, 'Religion is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'unisex'],
    lowercase: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Name', nameSchema);