import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import RecurringTransaction from '../models/RecurringTransaction.js';
import Session from '../models/Session.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate new token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'ExpenseTracker',
        audience: 'ExpenseTrackerUser'
      }
    );

    // Get device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || req.connection.remoteAddress || 'Unknown IP'
    };

    // Deactivate all other sessions for this user
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { 
        $set: { 
          isActive: false,
          lastActivity: new Date()
        }
      }
    );

    // Create new session
    const session = new Session({
      userId: user._id,
      token,
      deviceInfo,
      isActive: true,
      lastActivity: new Date()
    });
    await session.save();

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'ExpenseTracker',
        audience: 'ExpenseTrackerUser'
      }
    );

    // Remove password from user object
    const userWithoutPassword = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency
    };

    res.json({ 
      token,
      refreshToken,
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Deactivate the current session
    await Session.updateOne(
      { _id: req.session._id },
      { $set: { isActive: false }}
    );
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, defaultCurrency } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      defaultCurrency: defaultCurrency || 'USD'
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',  
        issuer: 'ExpenseTracker',
        audience: 'ExpenseTrackerUser'
      }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'ExpenseTracker',
        audience: 'ExpenseTrackerUser'
      }
    );

    // Create new session for the user
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ip: req.ip || req.connection.remoteAddress || 'Unknown IP'
    };
    
    const session = new Session({
      userId: user._id,
      token,
      deviceInfo,
      isActive: true,
      lastActivity: new Date()
    });
    await session.save();

    // Format user data consistently with login route
    const userWithoutPassword = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency
    };

    res.status(201).json({
      token,
      refreshToken,
      user: userWithoutPassword,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Error creating user',
      details: error.message 
    });
  }
});

// Verify token route
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        isValid: false,
        message: 'User not found' 
      });
    }

    // Format user data consistently
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency
    };

    res.json({ 
      isValid: true,
      user: userData
    });
  } catch (error) {
    res.status(500).json({ 
      isValid: false,
      message: 'Error verifying token' 
    });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password if trying to change password
    if (newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    // Update other fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      user.email = email;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account route
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Delete user's data
    await Category.deleteMany({ userId: userId });
    await Settings.deleteMany({ userId: userId });
    await Transaction.deleteMany({ userId: userId });
    await RecurringTransaction.deleteMany({ userId: userId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      defaultCurrency: user.defaultCurrency,
      theme: user.theme
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { defaultCurrency, theme } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (defaultCurrency) user.defaultCurrency = defaultCurrency;
    if (theme) user.theme = theme;

    await user.save();
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Generate new access token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { 
          expiresIn: '24h',
          issuer: 'ExpenseTracker',
          audience: 'ExpenseTrackerUser'
        }
      );

      res.json({ token });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export the router
export default router;