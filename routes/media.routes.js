const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// Upload directory - same as pages uploads
const uploadDir = 'uploads/pages/';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files at once
  }
});

// Helper function to get image dimensions (optional - requires 'image-size' package)
const getImageInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime
    };
  } catch (error) {
    return {
      size: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
};

// GET /api/media - Get all media files with pagination and search
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Read all files from upload directory
    const files = fs.readdirSync(uploadDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    // Filter image files
    let mediaFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file, index) => {
        const filePath = path.join(uploadDir, file);
        const info = getImageInfo(filePath);
        const ext = path.extname(file).toLowerCase();
        
        return {
          id: index + 1,
          filename: file,
          originalName: file,
          name: path.basename(file, ext),
          url: `/uploads/pages/${file}`,
          mimetype: `image/${ext.replace('.', '') === 'jpg' ? 'jpeg' : ext.replace('.', '')}`,
          size: info.size,
          createdAt: info.createdAt,
          updatedAt: info.updatedAt
        };
      });

    // Sort by creation date (newest first)
    mediaFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      mediaFiles = mediaFiles.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.filename.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = mediaFiles.length;
    const pages = Math.ceil(total / limit);

    // Get paginated items
    const paginatedItems = mediaFiles.slice(offset, offset + limit);

    // Re-assign IDs after filtering and pagination
    const itemsWithIds = paginatedItems.map((item, index) => ({
      ...item,
      id: offset + index + 1
    }));

    res.json({
      success: true,
      data: itemsWithIds,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching media files'
    });
  }
});

// GET /api/media/:filename - Get single media item by filename
router.get('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    const info = getImageInfo(filePath);
    const ext = path.extname(filename).toLowerCase();

    const item = {
      filename: filename,
      originalName: filename,
      name: path.basename(filename, ext),
      url: `/uploads/pages/${filename}`,
      mimetype: `image/${ext.replace('.', '') === 'jpg' ? 'jpeg' : ext.replace('.', '')}`,
      size: info.size,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt
    };

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching media'
    });
  }
});

// POST /api/media/upload - Upload new media files (multiple)
router.post('/upload', auth, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 10MB'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files. Maximum is 10 files at once'
          });
        }
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading files'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map((file, index) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return {
        id: Date.now() + index,
        filename: file.filename,
        originalName: file.originalname,
        name: path.basename(file.originalname, ext),
        url: `/uploads/pages/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error uploading files'
    });
  }
});

// POST /api/media/upload-single - Single file upload
router.post('/upload-single', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading file'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();

    const uploadedFile = {
      id: Date.now(),
      filename: file.filename,
      originalName: file.originalname,
      name: path.basename(file.originalname, ext),
      url: `/uploads/pages/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: uploadedFile,
      url: uploadedFile.url // For CKEditor compatibility
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error uploading file'
    });
  }
});

// DELETE /api/media/:filename - Delete media file
router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    // Delete file from disk
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting media'
    });
  }
});

// DELETE /api/media/by-id/:id - Delete by ID (for frontend compatibility)
// Since we don't have database, we use filename from query
router.delete('/by-url', auth, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Extract filename from URL
    const filename = path.basename(url);
    
    // Security check
    if (filename.includes('..')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL'
      });
    }

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Media not found'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting media'
    });
  }
});

module.exports = router;