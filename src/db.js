const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/vinyl.db'));

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vinyls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        artist_name TEXT NOT NULL,
        title TEXT NOT NULL,
        identifier TEXT,
        notes TEXT,
        dupe BOOLEAN DEFAULT false,
        weight INTEGER,
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

module.exports = db;
