const User = require('../models/user.model');
const Name = require('../models/name.model');
const NickName = require('../models/nickname.model');
const { query } = require('../config/database');
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

    // 1. Validate the Name ID format (Integer format)
    const nameIdInt = parseInt(nameId);
    if (isNaN(nameIdInt) || nameIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid Name ID format' });
    }

    // 2. Find the user from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Check if the name actually exists in the database
    const nameExists = await Name.findById(nameIdInt);
    if (!nameExists) {
      return res.status(404).json({ success: false, message: 'The specified name does not exist' });
    }

    // 4. Check if the name is already in the user's favorites
    const isFavorite = await user.hasFavoriteName(nameIdInt);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { favorites: nameIdInt } });
      message = 'Removed from favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { favorites: nameIdInt } });
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

    // 1. Validate the God Name ID format (Integer format)
    const godNameIdInt = parseInt(godNameId);
    if (isNaN(godNameIdInt) || godNameIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid God Name ID format' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Check if God Name exists
    const GodName = require('../models/godName.model');
    const godNameExists = await GodName.findById(godNameIdInt);
    if (!godNameExists) {
      return res.status(404).json({ success: false, message: 'The specified god name does not exist' });
    }

    // 3. Check if God Name is already in favorites
    const isFavorite = await user.hasFavoriteGodName(godNameIdInt);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { godNameFavorites: godNameIdInt } });
      message = 'Removed from god name favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { godNameFavorites: godNameIdInt } });
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

    // 1. Validate the Nickname ID format (Integer format)
    const nicknameIdInt = parseInt(nicknameId);
    if (isNaN(nicknameIdInt) || nicknameIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid Nickname ID format' });
    }

    // 2. Find the user from the token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 3. Check if the nickname actually exists in the database
    const nicknameExists = await NickName.findById(nicknameIdInt);
    if (!nicknameExists) {
      return res.status(404).json({ success: false, message: 'The specified nickname does not exist' });
    }

    // 4. Check if the nickname is already in the user's favorites
    const isFavorite = await user.hasFavoriteNickname(nicknameIdInt);
    let message;

    if (isFavorite) {
      // If it's already a favorite, remove it
      await User.findByIdAndUpdate(req.user.id, { $pull: { nicknameFavorites: nicknameIdInt } });
      message = 'Removed from nickname favorites successfully';
    } else {
      // If it's not a favorite, add it
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { nicknameFavorites: nicknameIdInt } });
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

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/user/all
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 10, search = '', sortBy = 'newest' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    if (search) {
      whereClause = `WHERE name ILIKE $${paramCount} OR email ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Add sorting logic
    let orderBy = 'ORDER BY "createdAt" DESC'; // default
    switch (sortBy) {
      case 'oldest':
        orderBy = 'ORDER BY "createdAt" ASC';
        break;
      case 'alphabetical':
        orderBy = 'ORDER BY name ASC';
        break;
      case 'newest':
      default:
        orderBy = 'ORDER BY "createdAt" DESC';
        break;
    }

    // Filter by status if provided
    if (req.query.status) {
      const statusFilter = req.query.status === 'active' ? true : req.query.status === 'inactive' ? false : null;
      if (statusFilter !== null) {
        if (whereClause) {
          whereClause += ` AND COALESCE("isActive", true) = $${paramCount}`;
        } else {
          whereClause = `WHERE COALESCE("isActive", true) = $${paramCount}`;
        }
        queryParams.push(statusFilter);
        paramCount++;
      }
    }

    // Build count query with same filters
    const countWhereClause = whereClause || '';
    const countParams = [...queryParams];
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${countWhereClause}`;
    const countResult = await query(countQuery, countParams);
    const totalUsers = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersQuery = `
      SELECT id, name, email, role, "createdAt", "updatedAt", picture, COALESCE("isActive", true) as "isActive"
      FROM users 
      ${whereClause || ''}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const usersResult = await query(usersQuery, queryParams);

    const users = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      picture: user.picture,
      isActive: user.isActive !== undefined ? user.isActive : true
    }));

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/**
 * @desc    Delete a user (Admin only)
 * @route   DELETE /api/user/:userId
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt) || userIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }

    // Check if user exists
    const user = await User.findById(userIdInt);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't allow admin to delete themselves
    if (userIdInt === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    // Delete user's favorites first
    await query('DELETE FROM user_favorite_names WHERE "userId" = $1', [userIdInt]);
    await query('DELETE FROM user_favorite_god_names WHERE "userId" = $1', [userIdInt]);
    await query('DELETE FROM user_favorite_nicknames WHERE "userId" = $1', [userIdInt]);

    // Delete the user
    await query('DELETE FROM users WHERE id = $1', [userIdInt]);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

/**
 * @desc    Deactivate/Activate a user (Admin only)
 * @route   PATCH /api/user/:userId/status
 * @access  Private (Admin)
 */
exports.updateUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { userId } = req.params;
    const { isActive } = req.body;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt) || userIdInt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }

    // Don't allow admin to deactivate themselves
    if (userIdInt === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    // Check if user exists
    const user = await User.findById(userIdInt);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user status
    await query('UPDATE users SET "isActive" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2', [isActive, userIdInt]);

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// List admins from admin_users table with pagination and optional search
exports.getAllAdmins = async (req, res) => {
  try {
    // Only admins can list admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 50, search = '', sortBy = 'newest' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let i = 1;

    if (search) {
      whereClause = `WHERE name ILIKE $${i} OR email ILIKE $${i}`;
      params.push(`%${search}%`);
      i++;
    }

    let orderBy = 'ORDER BY "createdAt" DESC';
    switch (sortBy) {
      case 'oldest':
        orderBy = 'ORDER BY "createdAt" ASC';
        break;
      case 'alphabetical':
        orderBy = 'ORDER BY name ASC';
        break;
      default:
        orderBy = 'ORDER BY "createdAt" DESC';
    }

    const countResult = await query(`SELECT COUNT(*) FROM admin_users ${whereClause}`, params);
    const totalAdmins = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const adminsResult = await query(`
      SELECT id, name, email, picture, "createdAt", "updatedAt"
      FROM admin_users
      ${whereClause}
      ${orderBy}
      LIMIT $${i} OFFSET $${i + 1}
    `, params);

    const admins = adminsResult.rows.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      picture: a.picture,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAdmins / limit),
        totalUsers: totalAdmins,
        hasNext: page < Math.ceil(totalAdmins / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};