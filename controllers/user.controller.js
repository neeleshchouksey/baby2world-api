const User = require('../models/user.model');
const Name = require('../models/name.model');
const NickName = require('../models/nickname.model');
/**
 * @desc    Get the logged-in user's list of favorite names
 * @route   GET /api/user/favorites
 * @access  Private
 */
exports.getFavorites = async (req, res) => {
  try {
    // req.user.id is attached by your verifyToken middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const favorites = await user.getFavorites();

    res.status(200).json({
      success: true,
      data: favorites
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

    // 1. Validate the Name ID format (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(nameId)) {
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
    const isFavorite = await user.hasFavoriteName(nameId);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { favorites: nameId } });
      message = 'Removed from favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { favorites: nameId } });
      message = 'Added to favorites successfully';
    }

    // 5. Get updated favorites
    const updatedFavorites = await user.getFavorites();

    res.status(200).json({
      success: true,
      message: message,
      data: updatedFavorites
    });

  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// user.controller.js mein sirf is function ko replace karein
exports.getGodNameFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const godNameFavorites = await user.getGodNameFavorites();

    res.status(200).json({
      success: true,
      data: godNameFavorites
    });
  } catch (error) {
    console.error("Error fetching god name favorites:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
exports.toggleGodNameFavorite = async (req, res) => {
  try {
    const { godNameId } = req.params;

    // 1. Validate the God Name ID format (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(godNameId)) {
      return res.status(400).json({ success: false, message: 'Invalid God Name ID format' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Check if God Name exists
    const GodName = require('../models/godname.model');
    const godNameExists = await GodName.findById(godNameId);
    if (!godNameExists) {
      return res.status(404).json({ success: false, message: 'The specified god name does not exist' });
    }

    // 3. Check if God Name is already in favorites
    const isFavorite = await user.hasFavoriteGodName(godNameId);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { godNameFavorites: godNameId } });
      message = 'Removed from god name favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { godNameFavorites: godNameId } });
      message = 'Added to god name favorites successfully';
    }

    // 4. Get updated god name favorites
    const updatedGodNameFavorites = await user.getGodNameFavorites();
    
    res.json({
      success: true,
      message: message,
      data: updatedGodNameFavorites
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
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nicknameFavorites = await user.getNicknameFavorites();

    res.status(200).json({
      success: true,
      data: nicknameFavorites
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

    // 1. Validate the Nickname ID format (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(nicknameId)) {
      return res.status(400).json({ success: false, message: 'Invalid Nickname ID format' });
    }

    // 2. Find the user from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Check if the nickname actually exists in the database
    const nicknameExists = await NickName.findById(nicknameId);
    if (!nicknameExists) {
      return res.status(404).json({ success: false, message: 'The specified nickname does not exist' });
    }

    // 4. Check if the nickname is already in the user's favorites
    const isFavorite = await user.hasFavoriteNickname(nicknameId);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { nicknameFavorites: nicknameId } });
      message = 'Removed from nickname favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { nicknameFavorites: nicknameId } });
      message = 'Added to nickname favorites successfully';
    }

    // 5. Get updated nickname favorites
    const updatedNicknameFavorites = await user.getNicknameFavorites();

    res.status(200).json({
      success: true,
      message: message,
      data: updatedNicknameFavorites
    });

  } catch (error) {
    console.error("Error toggling nickname favorite:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};