const User = require('../models/user.model');
const Name = require('../models/name.model');
const mongoose = require('mongoose');

/**
 * @desc    Get the logged-in user's list of favorite names
 * @route   GET /api/user/favorites
 * @access  Private
 */
exports.getFavorites = async (req, res) => {
  try {
    // req.user.id is attached by your verifyToken middleware
    const user = await User.findById(req.user.id)
      .populate({
        path: 'favorites', // The 'favorites' field in the User model
        model: 'Name',     // The model we are referencing
        populate: {
          path: 'religionId', // Nested populate for religion details
          model: 'Religion',
          select: 'name'      // We only need the name of the religion
        }
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/**
 * @desc    Add or remove a name from the user's favorites
 * @route   POST /api/user/favorites/:nameId
 * @access  Private
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const { nameId } = req.params;

    // 1. Validate the Name ID format
    if (!mongoose.Types.ObjectId.isValid(nameId)) {
      return res.status(400).json({ success: false, message: 'Invalid Name ID format' });
    }

    // 2. Find the user from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Check if the name actually exists in the database
    const nameExists = await Name.findById(nameId);
    if (!nameExists) {
      return res.status(404).json({ success: false, message: 'The specified name does not exist' });
    }

    // 4. Check if the name is already in the user's favorites
    const isFavorite = user.favorites.includes(nameId);
    let updateOperation;
    let message;

    if (isFavorite) {
      // If it's already a favorite, use $pull to remove it from the array
      updateOperation = { $pull: { favorites: nameId } };
      message = 'Removed from favorites successfully';
    } else {
      // If it's not a favorite, use $addToSet to add it (this prevents duplicates)
      updateOperation = { $addToSet: { favorites: nameId } };
      message = 'Added to favorites successfully';
    }

    // 5. Perform the update operation on the database
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateOperation, { new: true });

    res.status(200).json({
      success: true,
      message: message,
      // Return the updated list of favorite IDs for the frontend to sync
      data: updatedUser.favorites
    });

  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};