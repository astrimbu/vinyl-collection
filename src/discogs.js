require('dotenv').config();

let fetch;
(async () => {
    fetch = (await import('node-fetch')).default;
})();

class DiscogsClient {
    constructor() {
        if (!process.env.DISCOGS_TOKEN) {
            throw new Error('DISCOGS_TOKEN environment variable is required');
        }
        
        this.baseUrl = 'https://api.discogs.com';
        this.userAgent = 'VinylCollectionManager/1.0';
        this.token = process.env.DISCOGS_TOKEN;
        
        // Replace rate limiting properties with a request history
        this.requestHistory = [];
        this.requestQueue = [];
        this.processing = false;
    }

    async searchRelease(artist, title) {
        // Return a promise that resolves when it's safe to make the request
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ artist, title, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        // Discogs API rate limits to 60 requests per minute (rolling window)
        if (this.processing) return;
        this.processing = true;

        while (this.requestQueue.length > 0) {
            // Clean up old requests from history (older than 60 seconds)
            const now = Date.now();
            this.requestHistory = this.requestHistory.filter(
                timestamp => now - timestamp < 60000
            );

            // Check if we're at the rate limit
            if (this.requestHistory.length >= 60) {
                // Get the oldest request in our window
                const oldestRequest = this.requestHistory[0];
                // Calculate how long until it drops out of our 60-second window
                const waitTime = 60000 - (now - oldestRequest);
                
                console.log(`Rate limit approaching, waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Process next request
            const request = this.requestQueue[0];
            try {
                let result;
                if (request.type === 'tracks') {
                    result = await this._fetchTracks(request.artist, request.title);
                } else {
                    result = await this._makeRequest(request.artist, request.title);
                }
                
                // Record this request timestamp
                this.requestHistory.push(Date.now());
                
                request.resolve(result);
                this.requestQueue.shift();
            } catch (error) {
                if (error.message.includes('rate limit')) {
                    // Don't remove the request from queue, wait and try again
                    console.log('Rate limit hit, enforcing cooldown...');
                    // Wait for the oldest request to drop out of the window
                    const waitTime = 60000 - (now - this.requestHistory[0]);
                    await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
                    continue;
                }
                // For other errors, reject and remove from queue
                request.reject(error);
                this.requestQueue.shift();
            }
        }

        this.processing = false;
    }

    async _makeRequest(artist, title, retryCount = 0) {
        if (!fetch) {
            fetch = (await import('node-fetch')).default;
        }
    
        try {
            // Clean up the search terms
            const cleanArtist = artist
                .replace(/with/i, '')  // Remove "with" statements
                .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
                .trim();
                
            const cleanTitle = title
                .replace(/,.*$/, '')  // Remove anything after a comma
                .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
                .trim();
    
            const url = new URL(`${this.baseUrl}/database/search`);
            url.searchParams.append('type', 'release');
            url.searchParams.append('artist', cleanArtist);
            url.searchParams.append('release_title', cleanTitle);
    
            console.log(`Searching Discogs for: "${cleanArtist}" - "${cleanTitle}"`);
            console.log(`Original: "${artist}" - "${title}"`);
    
            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': this.userAgent,
                    'Authorization': `Discogs token=${this.token}`
                }
            });
    
            // Handle rate limit specifically
            if (response.status === 429) {
                if (retryCount >= 3) {
                    throw new Error('Max retry attempts reached for rate limit');
                }
                
                // Get retry-after header or default to 60 seconds
                const retryAfter = parseInt(response.headers.get('retry-after')) || 60;
                console.log(`Rate limit hit, waiting ${retryAfter} seconds before retry...`);
                
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                
                // Retry the request
                return this._makeRequest(artist, title, retryCount + 1);
            }
    
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Discogs error response:', errorText);
                throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            console.log(`Found ${data.results ? data.results.length : 0} results`);
            
            if (data.results && data.results.length > 0) {
                // Try each result until we find valid artwork
                for (let i = 0; i < Math.min(data.results.length, 5); i++) { // Limit to first 5 results
                    const result = data.results[i];
                    console.log(`Trying result ${i + 1}: ${result.title}`);
                    
                    // Validate artwork URLs
                    const cover = result.cover_image;
                    const thumb = result.thumb;
                    
                    // Check if URLs are valid and not spacer images
                    if (cover && 
                        !cover.includes('spacer.gif') && 
                        !cover.includes('spacer.png') &&
                        cover !== 'https://st.discogs.com/') {
                        console.log(`✓ Found valid artwork in result ${i + 1}`);
                        return {
                            thumb: thumb && !thumb.includes('spacer') ? thumb : null,
                            cover: cover
                        };
                    } else {
                        console.log(`✗ Invalid artwork URL in result ${i + 1}`);
                    }
                }
                
                console.log(`✗ No valid artwork found in first 5 results`);
                return null;
            }
            
            return null;
        } catch (error) {
            if (error.message.includes('rate limit')) {
                throw error; // Re-throw rate limit errors to be handled by processQueue
            }
            console.error('Discogs API error:', error);
            // Don't throw the error, just return null and continue
            return null;
        }
    }

    async getTrackList(artist, title) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ 
                type: 'tracks',
                artist, 
                title, 
                resolve, 
                reject 
            });
            this.processQueue();
        });
    }

    async _fetchTracks(artist, title) {
        if (!fetch) {
            fetch = (await import('node-fetch')).default;
        }

        try {
            // First, search for the release
            // Less aggressive cleaning - only remove special characters that would break the URL
            const cleanArtist = artist
                .replace(/[&+]/g, '') // Remove problematic URL characters
                .trim();
            const cleanTitle = title
                .replace(/,.*$/, '') // Remove anything after a comma
                .replace(/[&+]/g, '') // Remove problematic URL characters
                .trim();

            console.log(`[Discogs] Searching for release: ${artist} - ${title}`);
            console.log(`[Discogs] Using cleaned search terms: ${cleanArtist} - ${cleanTitle}`);

            const searchUrl = new URL(`${this.baseUrl}/database/search`);
            searchUrl.searchParams.append('type', 'release');
            searchUrl.searchParams.append('artist', cleanArtist);
            searchUrl.searchParams.append('release_title', cleanTitle);

            // Log the final URL for debugging
            console.log(`[Discogs] Search URL: ${searchUrl.toString()}`);

            const searchResponse = await fetch(searchUrl.toString(), {
                headers: {
                    'User-Agent': this.userAgent,
                    'Authorization': `Discogs token=${this.token}`
                }
            });

            if (!searchResponse.ok) {
                console.error(`[Discogs] Search API error: ${searchResponse.status}`);
                throw new Error(`Discogs API error: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            
            if (!searchData.results?.[0]?.id) {
                console.log(`[Discogs] No results found for: ${artist} - ${title}`);
                return null;
            }

            console.log(`[Discogs] Found release ID ${searchData.results[0].id} for: ${artist} - ${title}`);

            // Fetch the release details using the release ID
            const releaseUrl = `${this.baseUrl}/releases/${searchData.results[0].id}`;
            const releaseResponse = await fetch(releaseUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Authorization': `Discogs token=${this.token}`
                }
            });

            if (!releaseResponse.ok) {
                console.error(`[Discogs] Release API error: ${releaseResponse.status}`);
                throw new Error(`Discogs API error: ${releaseResponse.status}`);
            }

            const releaseData = await releaseResponse.json();
            console.log(`[Discogs] Successfully retrieved track data for: ${artist} - ${title}`);
            
            if (!releaseData.tracklist || releaseData.tracklist.length === 0) {
                return null;
            }
            
            // Transform the tracklist data
            const tracks = releaseData.tracklist.map(track => ({
                position: track.position,
                title: track.title,
                duration: track.duration
            }));

            return { tracks };
        } catch (error) {
            console.error('[Discogs] Error fetching tracks:', error);
            return null;
        }
    }
}

module.exports = new DiscogsClient();