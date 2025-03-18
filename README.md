# Vinyl Collection Manager

A full-featured web application for managing vinyl record collections with Discogs and Google Sheets integration.

![preview](./preview.png)

## Features

### Collection Management
- View and manage your complete vinyl collection
- Grid and table view options
- Sort by artist, title, ID, weight, notes, and duplicate status
- Advanced search across multiple fields
- Track listing support with Discogs integration
- Album artwork fetching and management

### Data Management
- CSV import functionality for bulk record additions
- Google Sheets integration for cloud synchronization
- Automatic artwork fetching from Discogs
- Track information synchronization
- Duplicate record tracking

### User Interface
- Responsive grid and table views
- Modal-based detailed record view
- Real-time search filtering
- Progress tracking for bulk operations
- Settings menu for advanced features
- Collapsible admin controls

### Integration Features
- Discogs API for artwork and track information
- Google Sheets API for cloud backup and sync
- CSV import/export functionality
- Automatic data synchronization

### Security
- Secure user authentication system
- Protected admin routes
- JWT-based authentication
- Bcrypt password hashing
- Protected API routes
- Secure session management
- OAuth 2.0 for Google Sheets integration

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5
- CSS3 with CSS Variables for theming
- Modular JavaScript architecture
- Material Icons integration

### Backend
- Node.js
- Express.js
- SQLite (via better-sqlite3)
- JWT for authentication
- Bcrypt for password hashing
- Discogs API integration
- Google Sheets API integration

### Database
- SQLite with better-sqlite3
- Structured schema for users and vinyl records
- Foreign key relationships
- Timestamp tracking for records

## Development

Install dependencies:
    npm install

Start development server:
    npm run dev

Start production server:
    npm start

## Environment Setup
Rename `.envexample` to `.env` and add your secrets:

    DISCOGS_TOKEN=your_discogs_token
    JWT_SECRET=your_jwt_secret
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_REDIRECT_URI=http://localhost:4567/google-sheets/callback

### Setting up Google Sheets Integration

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Sheets API for your project
4. Go to "Credentials" and create a new OAuth 2.0 Client ID
5. Add `http://localhost:4567/google-sheets/callback` as an authorized redirect URI
6. Copy the Client ID and Client Secret to your `.env` file

## Database
The application automatically creates and manages an SQLite database in the `db` directory. The schema includes:
- Users table for authentication
- Vinyls table for record management
- Automatic timestamp tracking
- Foreign key relationships
