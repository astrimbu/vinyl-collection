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
        
        // Rate limiting properties
        this.requestQueue = [];
        this.processing = false;
        this.requestsThisMinute = 0;
        this.minuteStart = Date.now();
    }

    async searchRelease(artist, title) {
        // Return a promise that resolves when it's safe to make the request
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ artist, title, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.requestQueue.length > 0) {
            // Check rate limit
            const now = Date.now();
            if (now - this.minuteStart >= 60000) {
                // Reset counter for new minute
                this.requestsThisMinute = 0;
                this.minuteStart = now;
            }

            if (this.requestsThisMinute >= 55) { // Buffer of 5 requests
                // Wait until next minute
                const waitTime = 60000 - (now - this.minuteStart);
                console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Process next request
            const request = this.requestQueue[0];
            try {
                const result = await this._makeRequest(request.artist, request.title);
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
            
            this.requestQueue.shift();
            this.requestsThisMinute++;
        }

        this.processing = false;
    }

    async _makeRequest(artist, title) {
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
    
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Discogs error response:', errorText);
                throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            console.log(`Found ${data.results ? data.results.length : 0} results`);
            
            if (data.results && data.results[0]) {
                console.log(`Selected result: ${data.results[0].title}`);
                return {
                    thumb: data.results[0].thumb,
                    cover: data.results[0].cover_image
                };
            }
            
            return null;
        } catch (error) {
            console.error('Discogs API error:', error);
            // Don't throw the error, just return null and continue
            return null;
        }
    }
}

module.exports = new DiscogsClient();