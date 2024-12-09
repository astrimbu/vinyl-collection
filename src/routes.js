const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateToken, authenticateToken, checkResourceOwnership } = require('./auth');
const bcrypt = require('bcrypt');
const csv = require('csv-parse/sync');
const discogsClient = require('./discogs');

global.currentProcessingRecord = null;
global.updateResults = {
    success: [],
    failed: []
};

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
router.post('/api/vinyl', authenticateToken, async (req, res) => {
    const { artist_name, title, identifier, notes, dupe, weight } = req.body;
    
    try {
        // Fetch artwork URL from Discogs
        const artworkUrl = await discogsClient.searchRelease(artist_name, title);
        
        const result = db.prepare(`
            INSERT INTO vinyls (
                user_id, artist_name, title, identifier, 
                notes, weight, dupe, artwork_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, artist_name, title, identifier, notes, weight, dupe ? 1 : 0, artworkUrl);
        
        res.status(201).json({ 
            id: result.lastInsertRowid,
            artwork_url: artworkUrl 
        });
    } catch (error) {
        console.error('Error adding vinyl:', error);
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

// Modify the import endpoint to fetch artwork
router.post('/api/vinyl/import', authenticateToken, async (req, res) => {
    try {
        let csvData = '';
        req.on('data', chunk => {
            csvData += chunk;
        });

        req.on('end', async () => {
            try {
                // Parse CSV
                const records = csv.parse(csvData, {
                    columns: true,
                    skip_empty_lines: true
                });

                // Transform records
                const transformedRecords = records.map(record => ({
                    artist_name: record['Artist Name'],
                    title: record['Title'],
                    identifier: record['Identifiers (SKU, Cat #, Barcode, Runout Etchings)'],
                    notes: record['Notes'],
                    weight: record['Weight'] ? parseInt(record['Weight']) : null,
                    dupe: record['Dupe'] === 'X' ? 1 : 0
                }));

                // Prepare the insert statement
                const stmt = db.prepare(`
                    INSERT INTO vinyls (
                        user_id, artist_name, title, identifier, 
                        notes, weight, dupe, artwork_url
                    ) VALUES (?, @artist_name, @title, @identifier, @notes, @weight, @dupe, @artwork_url)
                `);

                // Use transaction for bulk insert
                const insertMany = db.transaction(async (vinyls) => {
                    let count = 0;
                    for (const vinyl of vinyls) {
                        try {
                            // Fetch artwork URL from Discogs
                            const artwork = await discogsClient.searchRelease(vinyl.artist_name, vinyl.title);
                            vinyl.artwork_url = artwork ? artwork.cover : null;
                            
                            stmt.run(req.user.id, vinyl);
                            count++;
                            
                            console.log(`Processed ${count}/${vinyls.length}: ${vinyl.artist_name} - ${vinyl.title}`);
                        } catch (err) {
                            console.error('Error importing record:', err);
                        }
                    }
                    return count;
                });

                const importedCount = await insertMany(transformedRecords);

                res.json({ 
                    message: 'Import successful', 
                    count: importedCount 
                });
            } catch (error) {
                console.error('CSV parsing error:', error);
                res.status(400).json({ error: 'Invalid CSV format' });
            }
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Import failed' });
    }
});

// GET public vinyl records
router.get('/api/public/vinyl', (req, res) => {
    try {
        const vinyls = db.prepare(
            'SELECT artist_name, title, identifier, weight, notes, dupe, artwork_url FROM vinyls ORDER BY artist_name, title'
        ).all();
        res.json(vinyls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vinyl records' });
    }
});

// Update artwork endpoint
router.post('/api/vinyl/update-artwork', authenticateToken, async (req, res) => {
    try {
        global.currentProcessingRecord = null;
        global.updateResults = {
            success: [],
            failed: []
        };

        // Get all records without artwork
        const records = db.prepare('SELECT id, artist_name, title FROM vinyls WHERE artwork_url IS NULL AND user_id = ?')
            .all(req.user.id);
        
        if (records.length === 0) {
            return res.json({ 
                message: 'No records need artwork updates',
                totalRecords: 0,
                completed: true
            });
        }

        res.json({ 
            message: 'Artwork update started', 
            totalRecords: records.length,
            completed: false
        });

        let processed = 0;
        for (const record of records) {
            try {
                global.currentProcessingRecord = record;
                console.log(`Processing ${processed + 1}/${records.length}: ${record.artist_name} - ${record.title}`);
                
                const artwork = await discogsClient.searchRelease(record.artist_name, record.title);
                if (artwork && artwork.cover) {
                    db.prepare('UPDATE vinyls SET artwork_url = ? WHERE id = ?')
                        .run(artwork.cover, record.id);
                    console.log(`✓ Updated artwork for: ${record.artist_name} - ${record.title}`);
                    global.updateResults.success.push(record);
                } else {
                    console.log(`✗ No artwork found for: ${record.artist_name} - ${record.title}`);
                    global.updateResults.failed.push(record);
                }
                
                processed++;
                
                db.prepare('UPDATE vinyls SET last_artwork_check = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(record.id);
                
            } catch (error) {
                console.error(`Error processing ${record.artist_name} - ${record.title}:`, error);
                global.updateResults.failed.push(record);
            }
        }

        global.currentProcessingRecord = null;
        console.log(`Artwork update complete! Processed ${processed} records`);
        
    } catch (error) {
        console.error('Error in artwork update:', error);
    }
});

router.get('/api/vinyl/update-artwork/progress', authenticateToken, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM vinyls WHERE artwork_url IS NULL AND user_id = ?')
            .get(req.user.id).count;
            
        const processed = db.prepare(`
            SELECT COUNT(*) as count 
            FROM vinyls 
            WHERE user_id = ? 
            AND artwork_url IS NULL 
            AND last_artwork_check IS NOT NULL
        `).get(req.user.id).count;
        
        res.json({
            total,
            processed,
            completed: total === 0,
            currentRecord: global.currentProcessingRecord,
            results: global.updateResults
        });
    } catch (error) {
        console.error('Error checking progress:', error);
        res.status(500).json({ error: 'Failed to check progress' });
    }
});

router.get('/api/vinyl/:id/tracks', async (req, res) => {
    try {
        const vinyl = db.prepare('SELECT * FROM vinyls WHERE id = ?').get(req.params.id);
        
        if (!vinyl) {
            console.log(`[DB] No vinyl found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Vinyl not found' });
        }

        // If we already have tracks stored, return them
        if (vinyl.tracks) {
            console.log(`[DB] Retrieved cached tracks for: ${vinyl.artist_name} - ${vinyl.title}`);
            return res.json({ tracks: JSON.parse(vinyl.tracks) });
        }

        // Otherwise fetch from Discogs
        console.log(`[Discogs] Fetching tracks for: ${vinyl.artist_name} - ${vinyl.title}`);
        const trackInfo = await discogsClient.getTrackList(vinyl.artist_name, vinyl.title);
        
        // Store the tracks in the database
        if (trackInfo && trackInfo.tracks) {
            console.log(`[DB] Storing tracks for: ${vinyl.artist_name} - ${vinyl.title}`);
            db.prepare('UPDATE vinyls SET tracks = ? WHERE id = ?')
                .run(JSON.stringify(trackInfo.tracks), vinyl.id);
        }

        res.json({ tracks: trackInfo.tracks || [] });
    } catch (error) {
        console.error('[Error] Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

module.exports = router;
