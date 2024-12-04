const db = require('../src/db');
const discogsClient = require('../src/discogs');

async function updateArtwork() {
    // Get all records without artwork
    const records = db.prepare('SELECT id, artist_name, title FROM vinyls WHERE artwork_url IS NULL').all();
    
    console.log(`Found ${records.length} records without artwork`);
    
    for (const record of records) {
        try {
            const artwork = await discogsClient.searchRelease(record.artist_name, record.title);
            if (artwork) {
                db.prepare('UPDATE vinyls SET artwork_url = ? WHERE id = ?')
                    .run(artwork.cover, record.id);
                console.log(`Updated artwork for: ${record.artist_name} - ${record.title}`);
            } else {
                console.log(`No artwork found for: ${record.artist_name} - ${record.title}`);
            }
        } catch (error) {
            console.error(`Error updating artwork for ${record.artist_name} - ${record.title}:`, error);
        }
    }
    
    console.log('Artwork update complete!');
}

updateArtwork().catch(console.error); 