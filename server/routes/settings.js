import express from 'express';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne({ userId: req.user.id });
        const user = await User.findById(req.user.id).select('defaultCurrency');
        
        if (!settings) {
            settings = await Settings.create({ 
                userId: req.user.id,
                budgetLimit: 0,
                savingsGoal: 0,
                notifications: {
                    budgetAlerts: true
                }
            });
        }
        
        res.json({
            ...settings.toObject(),
            defaultCurrency: user ? user.defaultCurrency : 'USD'
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const { budgetLimit, savingsGoal, notifications, defaultCurrency } = req.body;
        let settings = await Settings.findOne({ userId: req.user.id });
        
        if (!settings) {
            settings = new Settings({ 
                userId: req.user.id,
                budgetLimit: 0,
                savingsGoal: 0,
                notifications: {
                    budgetAlerts: true
                }
            });
        }
        
        if (budgetLimit !== undefined) settings.budgetLimit = Number(budgetLimit);
        if (savingsGoal !== undefined) settings.savingsGoal = Number(savingsGoal);
        
        // Handle notifications update
        if (notifications !== undefined) {
            if (typeof notifications === 'object' && notifications !== null) {
                settings.notifications = {
                    budgetAlerts: Boolean(notifications.budgetAlerts)
                };
            } else {
                // Handle legacy format or invalid input
                settings.notifications = {
                    budgetAlerts: Boolean(notifications)
                };
            }
        }
        
        await settings.save();

        // Update user's defaultCurrency if provided
        if (defaultCurrency) {
            await User.findByIdAndUpdate(req.user.id, { defaultCurrency });
        }

        const updatedUser = await User.findById(req.user.id).select('defaultCurrency');
        
        res.json({
            ...settings.toObject(),
            defaultCurrency: updatedUser.defaultCurrency
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// Get user currency
router.get('/currency', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('defaultCurrency');
        res.json({ currency: user ? user.defaultCurrency : 'USD' });
    } catch (error) {
        console.error('Error fetching currency:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user currency
router.put('/currency', async (req, res) => {
    try {
        const { currency } = req.body;
        if (!currency) {
            return res.status(400).json({ message: 'Currency is required' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { defaultCurrency: currency },
            { new: true }
        ).select('defaultCurrency');

        res.json({ currency: user.defaultCurrency });
    } catch (error) {
        console.error('Error updating currency:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check budget limit
router.get('/check-budget', async (req, res) => {
    try {
        const settings = await Settings.findOne({ userId: req.user.id });
        if (!settings || !settings.budgetLimit) {
            return res.json({ exceeded: false });
        }

        // Calculate total expenses for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        res.json({ exceeded: false });
    } catch (error) {
        console.error('Error checking budget:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
