import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's theme
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('theme');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ theme: user.theme || 'light' });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching theme' });
    }
});

// Update user's theme
router.put('/', async (req, res) => {
    try {
        const { theme } = req.body;
        if (!theme || !['light', 'dark'].includes(theme)) {
            return res.status(400).json({ message: 'Invalid theme value' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { theme },
            { new: true }
        ).select('theme');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ theme: user.theme });
    } catch (error) {
        res.status(500).json({ message: 'Error updating theme' });
    }
});

export default router;
