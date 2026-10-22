const User = require('../models/User');

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.file) {
      user.avatar = req.file.path; // Cloudinary secure image URL
    }
    if (req.body.name) {
      user.name = req.body.name;
    }

    await user.save();
    res.json({ 
      message: 'Profile updated successfully', 
      user: { name: user.name, email: user.email, avatar: user.avatar } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};