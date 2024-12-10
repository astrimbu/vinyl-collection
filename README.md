# Vinyl Collection Manager

A full-featured web application for managing vinyl record collections with Discogs integration.

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
- Automatic artwork fetching from Discogs
- Track information synchronization
- Duplicate record tracking

### User Interface
- Responsive grid and table views
- Modal-based detailed record view
- Real-time search filtering
- Progress tracking for bulk operations
- Collapsible admin controls

### Security
- Secure user authentication system
- Protected admin routes
- JWT-based authentication
- Bcrypt password hashing
- Protected API routes
- Secure session management

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
Create a `.env` file in the root directory with:

    DISCOGS_TOKEN=your_discogs_token
    JWT_SECRET=your_jwt_secret

## Database
The application automatically creates and manages an SQLite database in the `db` directory. The schema includes:
- Users table for authentication
- Vinyls table for record management
- Automatic timestamp tracking
- Foreign key relationships
