require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 4567;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(routes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
