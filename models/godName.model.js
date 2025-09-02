const mongoose = require('mongoose');

const godNameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'God name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  religionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Religion',
    required: [true, 'Religion is required']
  },
  subNames: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GodName', godNameSchema);