const User = require('../models/user.model');
const Name = require('../models/name.model');
const mongoose = require('mongoose');
const NickName= require('../models/nickname.model')
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
// user.controller.js mein sirf is function ko replace karein
exports.getGodNameFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'godNameFavorites', // Is baar 'godNameFavorites' ko populate karenge
        model: 'GodName',         // GodName model se
        populate: {
          path: 'religionId',     // Uske andar religionId ko bhi
          model: 'Religion',
          select: 'name'
        }
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.godNameFavorites
    });
  } catch (error) {
    console.error("Error fetching god name favorites:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
exports.toggleGodNameFavorite = async (req, res) => {
  try {
    // 1. User ko uski ID se dhoondo (YAHAN CHANGE HUA HAI)
    const user = await User.findById(req.user.id); // req.userId ki jagah req.user.id
    const { godNameId } = req.params;

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Check karo ki God Name pehle se favorite hai ya nahi
    const index = user.godNameFavorites.indexOf(godNameId);

    if (index > -1) {
      // Agar hai, to array se nikal do (un-favorite)
      user.godNameFavorites.splice(index, 1);
    } else {
      // Agar nahi hai, to array mein daal do (favorite)
      user.godNameFavorites.push(godNameId);
    }

    // 3. User ke changes ko database mein save karo
    const updatedUser = await user.save();
    
    // 4. Frontend ko updated user data wapas bhejo
    res.json({
      success: true,
      message: 'God name favorites updated successfully.',
      data: updatedUser // Yeh frontend par localStorage update karne ke kaam aayega
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// Nickname Favorites ke liye functions add karo

/**
 * @desc    Get the logged-in user's list of favorite nicknames
 * @route   GET /api/user/favorites/nicknames
 * @access  Private
 */
exports.getNicknameFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'nicknameFavorites', 
        model: 'Nickname'
      });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user.nicknameFavorites
    });
  } catch (error) {
    console.error("Error fetching nickname favorites:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/**
 * @desc    Add or remove a nickname from the user's favorites
 * @route   POST /api/user/favorites/nicknames/:nicknameId
 * @access  Private
 */
exports.toggleNicknameFavorite = async (req, res) => {
  try {
    const { nicknameId } = req.params;

    // 1. Validate the Nickname ID format
    if (!mongoose.Types.ObjectId.isValid(nicknameId)) {
      return res.status(400).json({ success: false, message: 'Invalid Nickname ID format' });
    }

    // 2. Find the user from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Check if the nickname actually exists in the database
    const Nickname = require('../models/nickname.model'); // Import Nickname model
    const nicknameExists = await Nickname.findById(nicknameId);
    if (!nicknameExists) {
      return res.status(404).json({ success: false, message: 'The specified nickname does not exist' });
    }

    // 4. Check if the nickname is already in the user's favorites
    const isFavorite = user.nicknameFavorites.includes(nicknameId);
    let updateOperation;
    let message;

    if (isFavorite) {
      // If it's already a favorite, use $pull to remove it from the array
      updateOperation = { $pull: { nicknameFavorites: nicknameId } };
      message = 'Removed from nickname favorites successfully';
    } else {
      // If it's not a favorite, use $addToSet to add it (this prevents duplicates)
      updateOperation = { $addToSet: { nicknameFavorites: nicknameId } };
      message = 'Added to nickname favorites successfully';
    }

    // 5. Perform the update operation on the database
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updateOperation, 
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: message,
      data: updatedUser // Return full user object for localStorage update
    });

  } catch (error) {
    console.error("Error toggling nickname favorite:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};