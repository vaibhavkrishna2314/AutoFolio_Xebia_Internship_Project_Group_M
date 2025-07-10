const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// ✅ Registration Schema
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// ✅ Login Schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// 📩 REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { name, email, password } = parsed.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      subscription: {
        status: 'inactive',
      },
    });

    await newUser.save();
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        name: newUser.name,
        email: newUser.email,
        subscription: newUser.subscription?.status || 'inactive',
        isActive: false,
      },
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 🔐 LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const subscriptionStatus = user.subscription?.status || 'inactive';
    const isActive = subscriptionStatus === 'active';

    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.status(isActive ? 200 : 403).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        subscription: subscriptionStatus,
        isActive,
      },
      message: isActive ? 'Login successful' : 'Subscription required',
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// 🔄 FORGOT PASSWORD ROUTE
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('🔄 Forgot password request received');
    console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.log('🔑 EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    console.log('🔗 FRONTEND_URL:', process.env.FRONTEND_URL);
    
    const { email } = req.body;
    console.log('📨 Requested email:', email);
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found, but returning success for security');
      // Return success even if user doesn't exist (security best practice)
      return res.status(200).json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }
    
    console.log('✅ User found, generating reset token');
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save token to user using findOneAndUpdate to avoid validation issues
    await User.findOneAndUpdate(
      { email },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      }
    );
    
    console.log('💾 Token saved to database');
    console.log('📧 Attempting to send email...');
    
    // Send email
    await sendPasswordResetEmail(email, resetToken);
    
    console.log('✅ Email sent successfully');
    
    res.status(200).json({ 
      message: 'If an account with that email exists, we have sent a password reset link.' 
    });
  } catch (err) {
    console.error('❌ Forgot password error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// 🔄 RESET PASSWORD ROUTE
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Update password using findOneAndUpdate to avoid validation issues
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      },
      {
        password: hashedPassword,
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1
        }
      }
    );
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔍 GET CURRENT USER ROUTE
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionStatus = user.subscription?.status || 'inactive';
    const isActive = subscriptionStatus === 'active';

    return res.status(200).json({
      name: user.name,
      email: user.email,
      subscription: subscriptionStatus,
      isActive,
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error("/me route error:", err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
