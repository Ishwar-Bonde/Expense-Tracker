import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                isValid: false,
                message: 'No authentication token provided',
                error: 'NO_TOKEN'
            });
        }

        // First verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find the most recent active session for this user
        const latestSession = await Session.findOne({ 
            userId: decoded.userId,
            isActive: true 
        }).sort({ createdAt: -1 });

        if (!latestSession) {
            return res.status(401).json({
                isValid: false,
                message: 'No active session found. Please login again.',
                error: 'NO_ACTIVE_SESSION'
            });
        }

        // Check if the current token matches the latest session token
        if (token !== latestSession.token) {
            // Get device info from the latest session
            const deviceInfo = latestSession.deviceInfo || 'another device';
            
            return res.status(401).json({
                isValid: false,
                message: `This account is already logged in on ${deviceInfo}`,
                error: 'SESSION_INVALID',
                deviceInfo
            });
        }

        // Update last activity
        await Session.updateOne(
            { _id: latestSession._id },
            { $set: { lastActivity: new Date() }}
        );

        req.user = { id: decoded.userId };
        req.session = latestSession;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                isValid: false,
                message: 'Token has expired',
                error: 'TOKEN_EXPIRED'
            });
        }
        console.error('Auth error:', error);
        return res.status(401).json({ 
            isValid: false,
            message: 'Invalid token',
            error: 'TOKEN_INVALID'
        });
    }
};