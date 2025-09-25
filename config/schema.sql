-- PostgreSQL Schema for Baby Name Application
-- Database: name

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    picture TEXT,
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Religions table
CREATE TABLE IF NOT EXISTS religions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for religions
CREATE INDEX IF NOT EXISTS idx_religions_name ON religions(name);
CREATE INDEX IF NOT EXISTS idx_religions_is_active ON religions(is_active);

-- Names table
CREATE TABLE IF NOT EXISTS names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    religion_id UUID NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for names
CREATE INDEX IF NOT EXISTS idx_names_name ON names(name);
CREATE INDEX IF NOT EXISTS idx_names_religion_id ON names(religion_id);
CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender);

-- God Names table
CREATE TABLE IF NOT EXISTS god_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    religion_id UUID NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for god_names
CREATE INDEX IF NOT EXISTS idx_god_names_name ON god_names(name);
CREATE INDEX IF NOT EXISTS idx_god_names_religion_id ON god_names(religion_id);

-- God Names Sub Names table (for the subNames array)
CREATE TABLE IF NOT EXISTS god_name_sub_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    god_name_id UUID NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
    sub_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for god_name_sub_names
CREATE INDEX IF NOT EXISTS idx_god_name_sub_names_god_name_id ON god_name_sub_names(god_name_id);

-- Nicknames table
CREATE TABLE IF NOT EXISTS nicknames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for nicknames
CREATE INDEX IF NOT EXISTS idx_nicknames_name ON nicknames(name);
CREATE INDEX IF NOT EXISTS idx_nicknames_is_active ON nicknames(is_active);
CREATE INDEX IF NOT EXISTS idx_nicknames_created_by ON nicknames(created_by);

-- User Favorites - Names (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name_id UUID NOT NULL REFERENCES names(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name_id)
);

-- Create indexes for user_favorite_names
CREATE INDEX IF NOT EXISTS idx_user_favorite_names_user_id ON user_favorite_names(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_names_name_id ON user_favorite_names(name_id);

-- User Favorites - God Names (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_god_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    god_name_id UUID NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, god_name_id)
);

-- Create indexes for user_favorite_god_names
CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_user_id ON user_favorite_god_names(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_god_name_id ON user_favorite_god_names(god_name_id);

-- User Favorites - Nicknames (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_favorite_nicknames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname_id UUID NOT NULL REFERENCES nicknames(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, nickname_id)
);

-- Create indexes for user_favorite_nicknames
CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_user_id ON user_favorite_nicknames(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_nickname_id ON user_favorite_nicknames(nickname_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_religions_updated_at BEFORE UPDATE ON religions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_names_updated_at BEFORE UPDATE ON names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_god_names_updated_at BEFORE UPDATE ON god_names FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nicknames_updated_at BEFORE UPDATE ON nicknames FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
