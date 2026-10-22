const express = require('express');
const { updateProfile } = require('../controllers/userController');
const protect = require('../middleware/authMiddleware'); // Removed curly braces!
const { upload } = require('../config/cloudinary');

const router = express.Router();

// PUT request to update profile details and avatar image
router.put('/profile', protect, upload.single('avatar'), updateProfile);

module.exports = router;