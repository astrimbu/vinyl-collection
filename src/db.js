const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/vinyl.db'));

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS vinyls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_name TEXT NOT NULL,
        title TEXT NOT NULL,
        identifier TEXT,
        notes TEXT,
        dupe BOOLEAN DEFAULT false,
        weight INTEGER,
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL
    );
`);

module.exports = db;
