// backend/routes/user.js

const express = require("express");
const bcrypt = require('bcryptjs');
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ✅ GET /api/user/me/subscription — Protected Route
router.get("/me/subscription", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ subscription: user.subscription });
  } catch (err) {
    console.error("💥 Subscription fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 🔐 UPDATE PASSWORD ROUTE
router.put('/update-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update to new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
