const express = require('express');
const router = express.Router();
const db = require('./db');
const { authenticateToken } = require('./auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// GET all vinyl records
router.get('/api/vinyl', (req, res) => {
    try {
        const vinyls = db.prepare('SELECT * FROM vinyls ORDER BY artist_name, title').all();
        res.json(vinyls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vinyl records' });
    }
});

// GET single vinyl record
router.get('/api/vinyl/:id', (req, res) => {
    try {
        const vinyl = db.prepare('SELECT * FROM vinyls WHERE id = ?').get(req.params.id);
        if (!vinyl) {
            return res.status(404).json({ error: 'Vinyl record not found' });
        }
        res.json(vinyl);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vinyl record' });
    }
});

// POST new vinyl record (protected)
router.post('/api/vinyl', authenticateToken, (req, res) => {
    const { artist_name, title, identifier, notes, dupe, weight } = req.body;
    
    try {
        const result = db.prepare(
            'INSERT INTO vinyls (artist_name, title, identifier, notes, dupe, weight) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(artist_name, title, identifier, notes, dupe ? 1 : 0, weight);
        
        res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ error: 'Failed to add vinyl record' });
    }
});

// PUT update vinyl record (protected)
router.put('/api/vinyl/:id', authenticateToken, (req, res) => {
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
router.delete('/api/vinyl/:id', authenticateToken, (req, res) => {
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
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
        
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

const adminInitialized = new Set();

router.post('/api/init-admin', async (req, res) => {
    try {
        // Check if any admin exists
        const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
        
        if (adminExists.count > 0 || adminInitialized.size > 0) {
            return res.status(403).json({ error: 'Admin already exists' });
        }

        const { username, password } = req.body;
        
        // Basic validation
        if (!username || !password || password.length < 4) {
            return res.status(400).json({ 
                error: 'Invalid credentials. Password must be at least 4 characters.' 
            });
        }

        // Create admin
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
            .run(username, passwordHash);
        
        adminInitialized.add(true);
        res.json({ message: 'Admin initialized successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to initialize admin' });
    }
});

// Add this new endpoint
router.get('/api/admin-exists', (req, res) => {
    try {
        const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
        res.json({ exists: adminExists.count > 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check admin status' });
    }
});

module.exports = router;
