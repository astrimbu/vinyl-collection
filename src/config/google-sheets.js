const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Initialize the OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Initialize the Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// Function to get auth URL
const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

// Function to get tokens from code
const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};

// Function to set credentials
const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
};

// Function to read sheet data
const readSheet = async (spreadsheetId, range) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values;
  } catch (error) {
    console.error('Error reading sheet:', error);
    throw error;
  }
};

// Function to write data to sheet
const writeSheet = async (spreadsheetId, range, values) => {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('Error writing to sheet:', error);
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  getTokens,
  setCredentials,
  readSheet,
  writeSheet,
  oauth2Client
}; 