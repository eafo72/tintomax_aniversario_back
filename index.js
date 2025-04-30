const cron = require('node-cron');
const express = require('express');
const cors = require('cors');

const app = express();
const userRoutes = require('./routes/users');
const quizRoutes = require('./routes/quiz');
const answerRoutes = require('./routes/answers');
const storeRoutes = require('./routes/stores');
const shopRoutes = require('./routes/shop');

require('dotenv').config();

const db = require('./config/db');

app.use(cors());
app.use(express.json());

const admin = require('firebase-admin');
const decoded = Buffer.from(process.env.FIREBASE_MESSAGING_PRIVATE_KEY, 'base64').toString('utf-8');
console.log("Deco:"+decoded);

const { privateKey } = decoded;

// Inicialización del Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    }),
});

//rutas
app.use('/usuario', userRoutes);
app.use('/preguntas', quizRoutes);
app.use('/respuestas', answerRoutes);
app.use('/tiendas', storeRoutes);
app.use('/compras', shopRoutes);

app.get('/', (req, res) => res.send('TINTOMAX API'));

app.listen(4000);
console.log('Server running on port 4000');