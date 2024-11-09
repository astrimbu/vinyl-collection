const jwt = require('jsonwebtoken');
const db = require('./db');

function generateToken(user) {
    return jwt.sign({ 
        id: user.id,
        username: user.username,
        email: user.email
    }, process.env.JWT_SECRET, { 
        expiresIn: '24h' 
    });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Verify user still exists in database
        const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?')
            .get(decoded.id);

        if (!user) {
            return res.status(403).json({ error: 'User no longer exists' });
        }

        req.user = user;
        next();
    });
}

// Helper function to check if user owns a resource
function checkResourceOwnership(req, res, next) {
    const resourceId = req.params.id;
    const userId = req.user.id;

    const resource = db.prepare(
        'SELECT user_id FROM vinyls WHERE id = ?'
    ).get(resourceId);

    if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to this resource' });
    }

    next();
}

module.exports = { 
    generateToken,
    authenticateToken,
    checkResourceOwnership
};
