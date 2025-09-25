const { query } = require('./config/database');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection for migration
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for migration'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Models
const User = mongoose.model('User', new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  picture: String,
  password: String,
  role: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Name' }],
  godNameFavorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GodName' }],
  nicknameFavorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nickname' }]
}, { timestamps: true }));

const Name = mongoose.model('Name', new mongoose.Schema({
  name: String,
  description: String,
  religionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  gender: String
}, { timestamps: true }));

const Religion = mongoose.model('Religion', new mongoose.Schema({
  name: String,
  isActive: Boolean,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

const GodName = mongoose.model('GodName', new mongoose.Schema({
  name: String,
  description: String,
  religionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  subNames: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

const Nickname = mongoose.model('Nickname', new mongoose.Schema({
  name: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: Boolean
}, { timestamps: true }));

// ID mapping to store MongoDB ObjectId to PostgreSQL UUID mappings
const idMappings = {
  users: new Map(),
  religions: new Map(),
  names: new Map(),
  godNames: new Map(),
  nicknames: new Map()
};

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Migrate Users
async function migrateUsers() {
  console.log('Starting user migration...');
  const users = await User.find({});
  
  for (const user of users) {
    const newId = generateUUID();
    idMappings.users.set(user._id.toString(), newId);
    
    await query(
      `INSERT INTO users (id, google_id, name, email, picture, password, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newId,
        user.googleId || null,
        user.name,
        user.email,
        user.picture || null,
        user.password || null,
        user.role || 'user',
        user.createdAt,
        user.updatedAt
      ]
    );
  }
  
  console.log(`Migrated ${users.length} users`);
}

// Migrate Religions
async function migrateReligions() {
  console.log('Starting religion migration...');
  const religions = await Religion.find({});
  
  for (const religion of religions) {
    const newId = generateUUID();
    idMappings.religions.set(religion._id.toString(), newId);
    
    const createdBy = religion.createdBy ? idMappings.users.get(religion.createdBy.toString()) : null;
    const updatedBy = religion.updatedBy ? idMappings.users.get(religion.updatedBy.toString()) : null;
    
    await query(
      `INSERT INTO religions (id, name, is_active, created_by, updated_by, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        religion.name,
        religion.isActive !== undefined ? religion.isActive : true,
        createdBy,
        updatedBy,
        religion.createdAt,
        religion.updatedAt
      ]
    );
  }
  
  console.log(`Migrated ${religions.length} religions`);
}

// Migrate Names
async function migrateNames() {
  console.log('Starting name migration...');
  const names = await Name.find({});
  
  for (const name of names) {
    const newId = generateUUID();
    idMappings.names.set(name._id.toString(), newId);
    
    const religionId = name.religionId ? idMappings.religions.get(name.religionId.toString()) : null;
    
    await query(
      `INSERT INTO names (id, name, description, religion_id, gender, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        name.name,
        name.description || '',
        religionId,
        name.gender,
        name.createdAt,
        name.updatedAt
      ]
    );
  }
  
  console.log(`Migrated ${names.length} names`);
}

// Migrate God Names
async function migrateGodNames() {
  console.log('Starting god name migration...');
  const godNames = await GodName.find({});
  
  for (const godName of godNames) {
    const newId = generateUUID();
    idMappings.godNames.set(godName._id.toString(), newId);
    
    const religionId = godName.religionId ? idMappings.religions.get(godName.religionId.toString()) : null;
    const createdBy = godName.createdBy ? idMappings.users.get(godName.createdBy.toString()) : null;
    
    await query(
      `INSERT INTO god_names (id, name, description, religion_id, created_by, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        godName.name,
        godName.description || '',
        religionId,
        createdBy,
        godName.createdAt,
        godName.updatedAt
      ]
    );
    
    // Migrate sub names
    if (godName.subNames && godName.subNames.length > 0) {
      for (const subName of godName.subNames) {
        await query(
          'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
          [newId, subName]
        );
      }
    }
  }
  
  console.log(`Migrated ${godNames.length} god names`);
}

// Migrate Nicknames
async function migrateNicknames() {
  console.log('Starting nickname migration...');
  const nicknames = await Nickname.find({});
  
  for (const nickname of nicknames) {
    const newId = generateUUID();
    idMappings.nicknames.set(nickname._id.toString(), newId);
    
    const createdBy = nickname.createdBy ? idMappings.users.get(nickname.createdBy.toString()) : null;
    const updatedBy = nickname.updatedBy ? idMappings.users.get(nickname.updatedBy.toString()) : null;
    
    await query(
      `INSERT INTO nicknames (id, name, description, created_by, updated_by, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId,
        nickname.name,
        nickname.description || '',
        createdBy,
        updatedBy,
        nickname.isActive !== undefined ? nickname.isActive : true,
        nickname.createdAt,
        nickname.updatedAt
      ]
    );
  }
  
  console.log(`Migrated ${nicknames.length} nicknames`);
}

// Migrate User Favorites
async function migrateUserFavorites() {
  console.log('Starting user favorites migration...');
  const users = await User.find({}).populate('favorites godNameFavorites nicknameFavorites');
  
  for (const user of users) {
    const userId = idMappings.users.get(user._id.toString());
    
    // Migrate name favorites
    if (user.favorites && user.favorites.length > 0) {
      for (const favorite of user.favorites) {
        const nameId = idMappings.names.get(favorite._id.toString());
        if (nameId) {
          await query(
            'INSERT INTO user_favorite_names (user_id, name_id) VALUES ($1, $2) ON CONFLICT (user_id, name_id) DO NOTHING',
            [userId, nameId]
          );
        }
      }
    }
    
    // Migrate god name favorites
    if (user.godNameFavorites && user.godNameFavorites.length > 0) {
      for (const favorite of user.godNameFavorites) {
        const godNameId = idMappings.godNames.get(favorite._id.toString());
        if (godNameId) {
          await query(
            'INSERT INTO user_favorite_god_names (user_id, god_name_id) VALUES ($1, $2) ON CONFLICT (user_id, god_name_id) DO NOTHING',
            [userId, godNameId]
          );
        }
      }
    }
    
    // Migrate nickname favorites
    if (user.nicknameFavorites && user.nicknameFavorites.length > 0) {
      for (const favorite of user.nicknameFavorites) {
        const nicknameId = idMappings.nicknames.get(favorite._id.toString());
        if (nicknameId) {
          await query(
            'INSERT INTO user_favorite_nicknames (user_id, nickname_id) VALUES ($1, $2) ON CONFLICT (user_id, nickname_id) DO NOTHING',
            [userId, nicknameId]
          );
        }
      }
    }
  }
  
  console.log('Completed user favorites migration');
}

// Main migration function
async function migrateData() {
  try {
    console.log('Starting data migration from MongoDB to PostgreSQL...');
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('Clearing existing PostgreSQL data...');
    await query('DELETE FROM user_favorite_nicknames');
    await query('DELETE FROM user_favorite_god_names');
    await query('DELETE FROM user_favorite_names');
    await query('DELETE FROM god_name_sub_names');
    await query('DELETE FROM nicknames');
    await query('DELETE FROM god_names');
    await query('DELETE FROM names');
    await query('DELETE FROM religions');
    await query('DELETE FROM users');
    
    // Run migrations in order
    await migrateUsers();
    await migrateReligions();
    await migrateNames();
    await migrateGodNames();
    await migrateNicknames();
    await migrateUserFavorites();
    
    console.log('Data migration completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    // Close PostgreSQL connection
    process.exit(0);
  }
}

// Run migration
migrateData();
