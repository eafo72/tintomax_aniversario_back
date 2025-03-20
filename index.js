const cron = require('node-cron');
const express = require('express');
const cors = require('cors');

const app = express();
const userRoutes = require('./routes/users');

require('dotenv').config();

const db = require('./config/db');

app.use(cors());
app.use(express.json());

//rutas
app.use('/usuario', userRoutes);

app.get('/', (req, res) => res.send('TINTOMAX API'));

app.listen(4000);
console.log('Server running on port 4000');