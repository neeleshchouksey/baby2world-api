const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth.middleware');

// Ensure uploads directories exist
const uploadsImagesDir = 'uploads/images/';
const uploadsPagesDir = 'uploads/pages/';
if (!fs.existsSync(uploadsImagesDir)) {
  fs.mkdirSync(uploadsImagesDir, { recursive: true });
}
if (!fs.existsSync(uploadsPagesDir)) {
  fs.mkdirSync(uploadsPagesDir, { recursive: true });
}

// Configure multer for image uploads (general images)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsImagesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// Configure multer for page images (CKEditor uploads)
const pagesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsPagesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// File filter function
const imageFileFilter = function (req, file, cb) {
  // Accept only image files
  const filetypes = /jpeg|jpg|png|gif|webp|svg/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const errorMsg = `Only image files are allowed (jpeg, jpg, png, gif, webp, svg). Received: ${file.mimetype || 'unknown type'}, extension: ${path.extname(file.originalname)}`;
    console.error('File upload rejected:', errorMsg);
    cb(new Error(errorMsg));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Multer for pages (CKEditor uploads)
const uploadPages = multer({
  storage: pagesStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Image upload route with error handling
router.post('/image', auth, (req, res, next) => {
  console.log('Upload route hit, Content-Type:', req.headers['content-type']);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error uploading image. Please check file type and size (max 10MB).'
      });
    }
    console.log('File received:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded. Please select an image file.'
      });
    }

    // Return the file URL (relative path that can be served statically)
    // In production, you might want to use a CDN URL here
    const fileUrl = `/uploads/images/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error uploading image'
    });
  }
});


// CKEditor expects this exact format: { url: "/uploads/pages/filename.jpg" }
router.post('/', auth, uploadPages.single('upload'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    // CKEditor expects: { url: "/uploads/pages/filename.jpg" }
    const fileUrl = `/uploads/pages/${req.file.filename}`;
    
    res.json({
      url: fileUrl
    });
  } catch (error) {
    console.error('CKEditor image upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error uploading image'
    });
  }
});

module.exports = router;

