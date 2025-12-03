// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadRouter = require('./routes/upload');

const app = express();
const port = 3000;

app.use(cors());

// pour servir les vidéos traitées
app.use('/processed', express.static(path.join(__dirname, 'processed')));

app.use('/subtitles', express.static(path.join(__dirname, 'subtitles')));

// routes
app.use('/', uploadRouter);

app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://192.168.68.54:${port}`);
});
