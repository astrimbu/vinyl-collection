export class GoogleSheetsManager {
    constructor(app) {
        this.app = app;
        this.isConnected = false;
        this.spreadsheetId = null;
        this.range = null;
    }

    async init() {
        // Check if we have stored Google Sheets credentials
        const storedCredentials = localStorage.getItem('googleSheetsCredentials');
        if (storedCredentials && storedCredentials !== 'undefined') {
            try {
                const credentials = JSON.parse(storedCredentials);
                if (credentials && credentials.spreadsheetId && credentials.range) {
                    this.isConnected = true;
                    this.spreadsheetId = credentials.spreadsheetId;
                    this.range = credentials.range;
                    this.updateUIState();
                } else {
                    console.error('Invalid Google Sheets credentials:', credentials);
                    this.disconnect();
                }
            } catch (error) {
                console.error('Error loading Google Sheets credentials:', error);
                this.disconnect();
            }
        }
    }

    async connect() {
        try {
            // Get the auth URL from the server
            const response = await fetch('/google-sheets/auth-url', {
                headers: {
                    'Authorization': `Bearer ${this.app.auth.token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.authUrl) {
                throw new Error('No auth URL received from server');
            }

            // Open the auth URL in a popup window
            const width = 600;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            
            const authWindow = window.open(
                data.authUrl,
                'Google Sheets Auth',
                `width=${width},height=${height},top=${top},left=${left}`
            );

            if (!authWindow) {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            }

            // Create a promise that will resolve when the auth is complete
            return new Promise((resolve, reject) => {
                const messageHandler = async (event) => {
                    // Verify the origin of the message
                    if (event.origin !== window.location.origin) {
                        return;
                    }

                    if (event.data.type === 'GOOGLE_SHEETS_AUTH_SUCCESS') {
                        window.removeEventListener('message', messageHandler);
                        authWindow.close();
                        try {
                            await this.handleAuthSuccess(event.data.credentials);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    } else if (event.data.type === 'GOOGLE_SHEETS_AUTH_ERROR') {
                        window.removeEventListener('message', messageHandler);
                        authWindow.close();
                        reject(new Error(event.data.error));
                    }
                };

                window.addEventListener('message', messageHandler);

                // Handle popup being closed
                const checkClosed = setInterval(() => {
                    if (authWindow.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageHandler);
                        reject(new Error('Authentication window was closed'));
                    }
                }, 1000);
            });
        } catch (error) {
            console.error('Error connecting to Google Sheets:', error);
            this.app.ui.showError(error.message || 'Failed to connect to Google Sheets');
            throw error;
        }
    }

    async handleAuthSuccess(credentials) {
        try {
            // Store the connection state
            localStorage.setItem('googleSheetsCredentials', JSON.stringify(credentials));
            this.isConnected = true;
            this.spreadsheetId = credentials.spreadsheetId;
            this.range = credentials.range;
            
            this.updateUIState();
            this.app.ui.showSuccess('Successfully connected to Google Sheets');
        } catch (error) {
            console.error('Error handling auth success:', error);
            this.app.ui.showError('Failed to complete Google Sheets connection');
            throw error;
        }
    }

    async syncCollection() {
        try {
            const response = await fetch('/google-sheets/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.app.auth.getAuthHeaders()
                },
                body: JSON.stringify({
                    spreadsheetId: this.spreadsheetId,
                    range: this.range
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                const error = new Error(result.error || `Server returned ${response.status}: ${response.statusText}`);
                error.response = { 
                    status: response.status,
                    data: result
                };
                throw error;
            }

            return result;
        } catch (error) {
            console.error('Error syncing collection:', error);
            throw error;
        }
    }

    disconnect() {
        localStorage.removeItem('googleSheetsCredentials');
        this.isConnected = false;
        this.spreadsheetId = null;
        this.range = null;
        this.updateUIState();
    }

    updateUIState() {
        this.app.ui.updateGoogleSheetsUI(this.isConnected);
    }
} 