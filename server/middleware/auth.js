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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
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

        if (token !== latestSession.token) {
            const deviceInfo = latestSession.deviceInfo || 'another device';
            
            return res.status(401).json({
                isValid: false,
                message: `This account is already logged in on ${deviceInfo}`,
                error: 'SESSION_INVALID',
                deviceInfo
            });
        }

        await Session.updateOne(
            { _id: latestSession._id },
            { $set: { lastActivity: new Date() }}
        );

        req.user = {
            id: decoded.userId, 
            userId: decoded.userId 
        };
        
        req.session = latestSession;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                isValid: false,
                message: 'Invalid token format',
                error: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                isValid: false,
                message: 'Token has expired',
                error: 'TOKEN_EXPIRED'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            isValid: false,
            message: 'Internal server error during authentication',
            error: 'AUTH_ERROR'
        });
    }
};
