const db = require('../src/db');
const discogsClient = require('../src/discogs');

async function updateTracks() {
    // Get all records without track information
    const records = db.prepare('SELECT id, artist_name, title FROM vinyls WHERE tracks IS NULL').all();
    
    console.log(`Found ${records.length} records without track information`);
    
    let success = 0;
    let failed = 0;
    
    for (const record of records) {
        try {
            console.log(`Processing ${record.artist_name} - ${record.title}...`);
            
            const trackInfo = await discogsClient.getTrackList(record.artist_name, record.title);
            
            if (trackInfo.tracks && trackInfo.tracks.length > 0) {
                db.prepare('UPDATE vinyls SET tracks = ? WHERE id = ?')
                    .run(JSON.stringify(trackInfo.tracks), record.id);
                console.log(`✓ Updated tracks for: ${record.artist_name} - ${record.title}`);
                success++;
            } else {
                console.log(`✗ No tracks found for: ${record.artist_name} - ${record.title}`);
                failed++;
            }
            
            // Add a small delay to be nice to the Discogs API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`Error updating tracks for ${record.artist_name} - ${record.title}:`, error);
            failed++;
        }
    }
    
    console.log('\nTrack update complete!');
    console.log(`Successfully updated: ${success}`);
    console.log(`Failed to update: ${failed}`);
}

updateTracks().catch(console.error); 