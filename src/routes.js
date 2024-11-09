const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateToken, authenticateToken, checkResourceOwnership } = require('./auth');
const bcrypt = require('bcrypt');

// GET vinyl records for specific user
router.get('/api/vinyl', authenticateToken, (req, res) => {
    try {
        const vinyls = db.prepare(
            'SELECT * FROM vinyls WHERE user_id = ? ORDER BY artist_name, title'
        ).all(req.user.id);
        res.json(vinyls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vinyl records' });
    }
});

// GET single vinyl record
router.get('/api/vinyl/:id', authenticateToken, checkResourceOwnership, (req, res) => {
    try {
        const vinyl = db.prepare('SELECT * FROM vinyls WHERE id = ?').get(req.params.id);
        res.json(vinyl);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vinyl record' });
    }
});

// POST new vinyl record
router.post('/api/vinyl', authenticateToken, (req, res) => {
    const { artist_name, title, identifier, notes, dupe, weight } = req.body;
    
    try {
        const result = db.prepare(
            'INSERT INTO vinyls (user_id, artist_name, title, identifier, notes, dupe, weight) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(req.user.id, artist_name, title, identifier, notes, dupe ? 1 : 0, weight);
        
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add vinyl record' });
    }
});

// PUT update vinyl record (protected)
router.put('/api/vinyl/:id', authenticateToken, checkResourceOwnership, (req, res) => {
    const { artist_name, title, identifier, notes, dupe, weight } = req.body;
    
    try {
        const result = db.prepare(
            'UPDATE vinyls SET artist_name = ?, title = ?, identifier = ?, notes = ?, dupe = ?, weight = ? WHERE id = ?'
        ).run(artist_name, title, identifier, notes, dupe ? 1 : 0, weight, req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Vinyl record not found' });
        }
        res.json({ message: 'Record updated successfully' });
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            params: req.params
        });
        res.status(500).json({ error: 'Failed to update vinyl record' });
    }
});

// DELETE vinyl record (protected)
router.delete('/api/vinyl/:id', authenticateToken, checkResourceOwnership, (req, res) => {
    try {
        const result = db.prepare('DELETE FROM vinyls WHERE id = ?').run(req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Vinyl record not found' });
        }
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete vinyl record' });
    }
});

// Login route
router.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Registration route
router.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    
    try {
        // Basic validation
        if (!username || !password || !email || password.length < 4) {
            return res.status(400).json({ 
                error: 'Invalid registration data. Password must be at least 4 characters.' 
            });
        }

        // Check if username or email already exists
        const existingUser = db.prepare(
            'SELECT username, email FROM users WHERE username = ? OR email = ?'
        ).get(username, email);

        if (existingUser) {
            return res.status(409).json({ 
                error: 'Username or email already exists' 
            });
        }

        // Create user
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)'
        ).run(username, passwordHash, email);

        res.status(201).json({ 
            message: 'Registration successful',
            userId: result.lastInsertRowid 
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

module.exports = router;
