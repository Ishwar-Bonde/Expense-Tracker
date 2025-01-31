import express from 'express';
import { sendRecurringTransactionWarning } from '../utils/emailService.js';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Test endpoint for email service (requires authentication)
router.post('/test-email', authenticateToken, async (req, res) => {
    try {
        console.log('Decoded token user:', req.user); // Debug log
        
        // Get the authenticated user
        const userId = req.user.userId;
        console.log('Looking for user with ID:', userId); // Debug log
        
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found in database'); // Debug log
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log('Found user:', user.email); // Debug log

        const mockTransactions = [
            {
                title: 'Monthly Rent',
                type: 'expense',
                amount: 15000,
                currency: 'INR',
                frequency: 'monthly',
                categoryId: {
                    name: 'Housing',
                    color: '#e74c3c'
                }
            }
        ];

        // Send test email to the authenticated user's email
        const result = await sendRecurringTransactionWarning(user, mockTransactions);
        console.log('Email sent successfully:', result);
        
        res.status(200).json({ 
            success: true, 
            message: 'Test email sent successfully',
            result
        });
    } catch (error) {
        console.error('Error in test-email route:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error',
            details: error.stack
        });
    }
});

export default router;
