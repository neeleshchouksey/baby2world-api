-- PostgreSQL Schema for Baby Name Application
-- Database: name

-- Users table (using SERIAL instead of UUID)
-- Note: Column names use camelCase with quoted identifiers for PostgreSQL
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "googleId" VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    picture TEXT,
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId");
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Religions table
CREATE TABLE IF NOT EXISTS religions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
    "updatedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for religions
CREATE INDEX IF NOT EXISTS idx_religions_name ON religions(name);
CREATE INDEX IF NOT EXISTS idx_religions_is_active ON religions("isActive");

-- Names table
CREATE TABLE IF NOT EXISTS names (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    "religionId" INTEGER NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for names
CREATE INDEX IF NOT EXISTS idx_names_name ON names(name);
CREATE INDEX IF NOT EXISTS idx_names_religion_id ON names("religionId");
CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender);

-- God Names table
CREATE TABLE IF NOT EXISTS god_names (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "religionId" INTEGER NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
    "createdBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for god_names
CREATE INDEX IF NOT EXISTS idx_god_names_name ON god_names(name);
CREATE INDEX IF NOT EXISTS idx_god_names_religion_id ON god_names("religionId");

-- God Names Sub Names table (for the subNames array)
CREATE TABLE IF NOT EXISTS god_name_sub_names (
    id SERIAL PRIMARY KEY,
    "godNameId" INTEGER NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
    "subName" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for god_name_sub_names
CREATE INDEX IF NOT EXISTS idx_god_name_sub_names_god_name_id ON god_name_sub_names("godNameId");

-- Nicknames table
CREATE TABLE IF NOT EXISTS nicknames (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    gender VARCHAR(10) DEFAULT 'unisex',
    "createdBy" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "updatedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for nicknames
CREATE INDEX IF NOT EXISTS idx_nicknames_name ON nicknames(name);
CREATE INDEX IF NOT EXISTS idx_nicknames_is_active ON nicknames("isActive");
CREATE INDEX IF NOT EXISTS idx_nicknames_created_by ON nicknames("createdBy");

-- User Favorites - Names (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_names (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "nameId" INTEGER NOT NULL REFERENCES names(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "nameId")
);

-- Create indexes for user_favorite_names
CREATE INDEX IF NOT EXISTS idx_user_favorite_names_user_id ON user_favorite_names("userId");
CREATE INDEX IF NOT EXISTS idx_user_favorite_names_name_id ON user_favorite_names("nameId");

-- User Favorites - God Names (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_god_names (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "godNameId" INTEGER NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "godNameId")
);

-- Create indexes for user_favorite_god_names
CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_user_id ON user_favorite_god_names("userId");
CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_god_name_id ON user_favorite_god_names("godNameId");

-- User Favorites - Nicknames (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_nicknames (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "nicknameId" INTEGER NOT NULL REFERENCES nicknames(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "nicknameId")
);

-- Create indexes for user_favorite_nicknames
CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_user_id ON user_favorite_nicknames("userId");
CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_nickname_id ON user_favorite_nicknames("nicknameId");

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_religions_updated_at BEFORE UPDATE ON religions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_names_updated_at BEFORE UPDATE ON names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_god_names_updated_at BEFORE UPDATE ON god_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nicknames_updated_at BEFORE UPDATE ON nicknames FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
