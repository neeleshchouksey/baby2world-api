const mongoose = require('mongoose');

const religionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Religion name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Religion name must be at least 2 characters long'],
    maxlength: [50, 'Religion name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
religionSchema.index({ name: 1 });
religionSchema.index({ isActive: 1 });

module.exports = mongoose.model('Religion', religionSchema);