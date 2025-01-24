import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            isValid: false,
            message: 'No authentication token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                isValid: false,
                message: 'Token has expired',
                error: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({ 
            isValid: false,
            message: 'Invalid token',
            error: 'TOKEN_INVALID'
        });
    }
};