const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer Configuration for File Uploads
 * Handles profile images and post images
 */

// Absolute path to uploads directory (backend/uploads)
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure upload directories exist
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists(path.join(UPLOADS_DIR, 'profiles'));
createDirIfNotExists(path.join(UPLOADS_DIR, 'posts'));

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.uploadType || 'posts';
    const dest = path.join(UPLOADS_DIR, uploadType === 'profile' ? 'profiles' : 'posts');
    createDirIfNotExists(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|ogg|mov|mkv|avi|heic|heif/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

// Upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB default
  }
});

module.exports = upload;
