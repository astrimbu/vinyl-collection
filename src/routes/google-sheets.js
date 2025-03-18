const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { authenticateToken } = require('../auth');

// Initialize the OAuth2 client
const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Initialize the Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// Get Google Sheets auth URL
router.get('/auth-url', authenticateToken, (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/drive.file'  // This scope only allows access to files created or opened by the app
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: req.user.id.toString() // Pass the user ID in the state parameter
    });
    
    res.json({ authUrl });
});

// Handle Google OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const userId = parseInt(state); // Get the user ID from the state parameter
        
        if (!userId) {
            throw new Error('No user ID provided');
        }

        const { tokens } = await oauth2Client.getToken(code);
        
        // Store tokens in database
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO user_tokens 
            (user_id, access_token, refresh_token, expiry_date) 
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(
            userId,
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date
        );
        
        res.send(`
            <html>
            <head>
                <title>Google Sheets Connection</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; text-align: center; }
                    h1 { color: #4285f4; }
                    button { 
                        background-color: #4285f4; 
                        color: white; 
                        border: none; 
                        padding: 12px 24px; 
                        cursor: pointer;
                        margin: 20px 0;
                        font-size: 16px;
                        border-radius: 4px;
                    }
                    button:hover { background-color: #3367d6; }
                    .explanation { margin: 20px 0; background: #f9f9f9; padding: 15px; border-radius: 4px; text-align: left; }
                    #status { margin-top: 20px; color: #d32f2f; font-weight: bold; }
                </style>
                <script>
                    // Create a new spreadsheet
                    function createNewSpreadsheet() {
                        document.getElementById('createBtn').disabled = true;
                        document.getElementById('createBtn').textContent = 'Creating spreadsheet...';
                        document.getElementById('status').textContent = '';
                        
                        fetch('/google-sheets/create-spreadsheet', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                userId: ${userId},
                                title: 'Vinyl Collection'
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.spreadsheetId) {
                                if (window.opener) {
                                    window.opener.postMessage({
                                        type: 'GOOGLE_SHEETS_AUTH_SUCCESS',
                                        credentials: {
                                            connected: true,
                                            spreadsheetId: data.spreadsheetId,
                                            range: "A1:Z1000"
                                        }
                                    }, '*');
                                    window.close();
                                }
                            } else {
                                document.getElementById('status').textContent = 'Failed to create spreadsheet: ' + (data.error || 'Unknown error');
                                document.getElementById('createBtn').disabled = false;
                                document.getElementById('createBtn').textContent = 'Create New Spreadsheet';
                            }
                        })
                        .catch(error => {
                            document.getElementById('status').textContent = 'Error: ' + error.message;
                            document.getElementById('createBtn').disabled = false;
                            document.getElementById('createBtn').textContent = 'Create New Spreadsheet';
                        });
                    }
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>Connect to Google Sheets</h1>
                    <p>We'll create a new Google Sheet specifically for your vinyl collection.</p>
                    
                    <div class="explanation">
                        <p><strong>Note:</strong> Due to the privacy-focused permissions we use, the app can only work with spreadsheets it creates rather than existing ones. This ensures we only access the specific data needed for this app.</p>
                    </div>
                    
                    <button id="createBtn" onclick="createNewSpreadsheet()">Create New Spreadsheet</button>
                    
                    <div id="status"></div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in callback:', error);
        res.send(`
            <script>
                if (window.opener) {
                    window.opener.postMessage({ 
                        type: 'GOOGLE_SHEETS_AUTH_ERROR',
                        error: 'Failed to authenticate with Google Sheets'
                    }, '*');
                    window.close();
                } else {
                    window.location.href = '/?sheets=error';
                }
            </script>
        `);
    }
});

// Sync collection with Google Sheets
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const { spreadsheetId, range } = req.body;
        const userId = req.user.id;

        if (!spreadsheetId) {
            throw new Error('No spreadsheet ID provided');
        }

        // Get user's tokens from database
        const tokens = db.prepare('SELECT * FROM user_tokens WHERE user_id = ?').get(userId);
        if (!tokens) {
            throw new Error('No Google Sheets tokens found');
        }

        // Set credentials
        oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        });

        try {
            const targetSheetTitle = "Vinyl";
            const fullRange = `${targetSheetTitle}!${range.replace(/^[^!]+!/, '')}`;
            
            console.log(`Using sheet: ${targetSheetTitle}, full range: ${fullRange}`);
            
            // Get the values
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: fullRange,
            });
            
            const sheetData = response.data.values || [];
            
            // Get local collection data
            const localCollection = db.prepare('SELECT * FROM vinyls WHERE user_id = ?').all(userId);
            
            // Compare and merge data
            const mergedData = mergeCollections(sheetData, localCollection);
            
            // Write merged data back to sheet
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: fullRange,
                valueInputOption: 'RAW',
                resource: { values: mergedData },
            });
            
            res.json({ success: true, message: 'Collection synced successfully' });
        } catch (error) {
            console.error('Error accessing spreadsheet:', error);
            
            // If the error is 404, it might be because the sheet was deleted
            if (error.status === 404) {
                return res.status(404).json({ 
                    success: false, 
                    error: "Spreadsheet not found. It may have been deleted.",
                    errorCode: "SPREADSHEET_NOT_FOUND",
                    message: "The spreadsheet could not be found. Please disconnect and create a new spreadsheet."
                });
            }
            
            throw error;
        }
    } catch (error) {
        console.error('Error syncing collection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new spreadsheet
router.post('/create-spreadsheet', express.json(), async (req, res) => {
    try {
        const { userId, title } = req.body;
        
        if (!userId) {
            throw new Error('No user ID provided');
        }

        // Get user's tokens from database
        const tokens = db.prepare('SELECT * FROM user_tokens WHERE user_id = ?').get(userId);
        if (!tokens) {
            throw new Error('No Google Sheets tokens found');
        }

        // Set credentials
        oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        });

        // Create a new spreadsheet
        const spreadsheet = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: title || 'Vinyl Collection'
                },
                sheets: [
                    {
                        properties: {
                            title: 'Vinyl',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 6
                            }
                        }
                    }
                ]
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        
        // Get the sheetId of the first sheet
        const sheetId = spreadsheet.data.sheets[0].properties.sheetId;
        console.log(`Created spreadsheet with ID: ${spreadsheetId}, first sheet has sheetId: ${sheetId}`);

        // Add headers to the new spreadsheet
        const headers = [
            'Artist',
            'Album',
            'Identifier',
            'Notes',
            'Weight',
            'Duplicate'
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Vinyl!A1:F1',
            valueInputOption: 'RAW',
            resource: {
                values: [headers]
            }
        });

        // Apply some basic formatting to headers
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: 6
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.8,
                                        green: 0.8,
                                        blue: 0.8
                                    },
                                    horizontalAlignment: 'CENTER',
                                    textFormat: {
                                        fontSize: 12,
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetId,
                                gridProperties: {
                                    frozenRowCount: 1
                                }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    }
                ]
            }
        });

        res.json({ 
            success: true, 
            spreadsheetId,
            message: 'Spreadsheet created successfully' 
        });
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Helper function to merge collections
function mergeCollections(sheetData, localCollection) {
    console.log('Sheet data:', JSON.stringify(sheetData));
    console.log('Local collection:', JSON.stringify(localCollection));
    
    const headers = [
        'Artist',
        'Album',
        'Identifier',
        'Notes',
        'Weight',
        'Duplicate'
    ];

    // If the sheet already has data, try to use its existing headers
    let existingHeaders = [];
    if (sheetData && sheetData.length > 0) {
        existingHeaders = sheetData[0];
        console.log('Using existing headers:', existingHeaders);
    }

    // Use existing headers if they exist, otherwise use our default headers
    const finalHeaders = existingHeaders.length > 0 ? existingHeaders : headers;
    
    // Convert local collection to sheet format
    const localRecords = localCollection.map(record => {
        // Create a record matching the header structure
        const row = Array(finalHeaders.length).fill('');
        
        // Map the record fields to the appropriate columns
        const fieldMap = {
            'Artist': record.artist_name,
            'Album': record.title,
            'Identifier': record.identifier || '',
            'Notes': record.notes || '',
            'Weight': record.weight || '',
            'Duplicate': record.dupe ? 'Yes' : 'No'
        };
        
        // Fill in the row based on the headers
        finalHeaders.forEach((header, index) => {
            if (fieldMap[header] !== undefined) {
                row[index] = fieldMap[header];
            }
        });
        
        // Add a unique identifier for this record to help with merging
        row.recordId = record.id;
        
        return row;
    });

    // Process sheet data to identify existing records
    let existingRecords = [];
    if (sheetData && sheetData.length > 1) {
        // Skip the header row
        existingRecords = sheetData.slice(1);
    }
    
    // Create a map to easily identify duplicates
    // We'll use a combination of artist and album as a basic unique identifier
    const existingMap = new Map();
    
    // Track indices of artist and album columns
    const artistIndex = finalHeaders.indexOf('Artist');
    const albumIndex = finalHeaders.indexOf('Album');
    
    // Add existing records to the map
    existingRecords.forEach((record, index) => {
        if (artistIndex >= 0 && albumIndex >= 0) {
            const artist = record[artistIndex];
            const album = record[albumIndex];
            if (artist && album) {
                const key = `${artist}__${album}`.toLowerCase();
                existingMap.set(key, index);
            }
        }
    });
    
    // Now merge local records with existing records
    localRecords.forEach(localRecord => {
        if (artistIndex >= 0 && albumIndex >= 0) {
            const artist = localRecord[artistIndex];
            const album = localRecord[albumIndex];
            if (artist && album) {
                const key = `${artist}__${album}`.toLowerCase();
                const existingIndex = existingMap.get(key);
                
                if (existingIndex !== undefined) {
                    // Update existing record with our local data
                    const existingRecord = existingRecords[existingIndex];
                    finalHeaders.forEach((_, index) => {
                        if (localRecord[index] !== '') {
                            existingRecord[index] = localRecord[index];
                        }
                    });
                } else {
                    // This is a new record, add it to existingRecords
                    existingMap.set(key, existingRecords.length);
                    existingRecords.push(localRecord);
                }
            } else {
                // If no artist or album, just add it (though this should be rare)
                existingRecords.push(localRecord);
            }
        } else {
            // If we can't find the right columns, just add it
            existingRecords.push(localRecord);
        }
    });

    // Return the merged data
    return [finalHeaders, ...existingRecords];
}

module.exports = router; 