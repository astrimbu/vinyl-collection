const csv = require('csv-parser');
const fs = require('fs');
const db = require('./db');

const results = [];

fs.createReadStream('vinyl-data.csv')
  .pipe(csv())
  .on('data', (data) => {
    results.push({
        artist_name: data['Artist Name'],
        title: data['Title'],
        identifier: data['Identifiers (SKU, Cat #, Barcode, Runout Etchings)'],
        notes: data['Notes'],
        weight: data['Weight'] ? parseInt(data['Weight']) : null,
        dupe: data['Dupe'] === 'X' ? 1 : 0
    });
  })
  .on('end', () => {
    const stmt = db.prepare(`
        INSERT INTO vinyls (artist_name, title, identifier, notes, weight, dupe)
        VALUES (@artist_name, @title, @identifier, @notes, @weight, @dupe)
    `);

    const insertMany = db.transaction((vinyls) => {
        for (const vinyl of vinyls) stmt.run(vinyl);
    });

    try {
        insertMany(results);
        console.log(`Successfully imported ${results.length} vinyl records`);
    } catch (error) {
        console.error('Error importing records:', error);
    }
  });
