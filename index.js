const cron = require('node-cron');
const express = require('express');
const path = require('path');
const helmet = require ('helmet');
const verificarIPBloqueada = require('./middlewares/verificarIPBloqueada');
const customRateLimit = require('./middlewares/customRateLimit');

const cors = require('cors');

const app = express();

// 1) Middleware de seguridad general
app.use(helmet());

// 1.1) Rate Limiting: protege de abusos (100 peticiones cada 15 minutos por IP)
app.set('trust proxy', '127.0.0.1'); // muy importante si usas proxy inverso sino devolvera la misma ip siempre desde nginx ojo la ip es la nginx
app.use(verificarIPBloqueada);
app.use(customRateLimit);


// 2) Parser de JSON / URL–encoded
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// 3) Denegar dotfiles en la carpeta pública
app.use(
  express.static(path.join(__dirname, 'public'), {
    dotfiles: 'deny'   // rechaza /.env, /.gitignore, etc.
  })
);

// 3.1 Bloqueo por User-Agent sospechoso
const blockedAgents = [
  'postmanruntime',
  'curl',
  'insomnia',
  'httpie',
  'python-requests',
  'axios',
];

app.use((req, res, next) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  if (blockedAgents.some(agent => userAgent.includes(agent))) {
    console.warn('[❌ USER-AGENT BLOQUEADO]', {
      metodo: req.method,
      url: req.originalUrl,
      userAgent,
    });
    return res.status(403).json({ error: 'User-Agent bloqueado' });
  }
  next();
});


// 4) Aquí iría tu middleware de CORS (el que registra origin, etc.)
//http://localhost:5173
const allowedOrigins = [
  'https://maxaniversario.com',
  'https://www.maxaniversario.com',
  'http://maxaniversario.com',
  'http://www.maxaniversario.com',
  'https://max-panel.web.app',
  'http://max-panel.web.app'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }else{
    console.warn('[⚠️ ORIGIN NO PERMITIDO]', {
      metodo: req.method,
      url: req.originalUrl,
      origin,
      userAgent,
    });
    // Bloquea la solicitud con un error 403 (Forbidden)
    return res.status(403).json({ error: 'Origen no permitido' });
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    // Preflight
    return res.sendStatus(204);
  }
  next();
});

require('dotenv').config();
const db = require('./config/db');

const admin = require('firebase-admin');

// Inicialización del Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCX1ZEARUCzZxbL
aL4l3MJ6uX9C2+w14D8bIQtUe6gEss6UH00U4FDOZtbQ3rYfUE9T/qa0yrkFk3Av
UfOjxUuolylrJ+uFFf1Zg7CkuPhi71kN+kb9v7uiuRQS90fF8Dzlk2aes0fHAnHT
38zxP2Uadc8tQwA7fGbTlf0zrA2UjyGG6alvir5e21ltAPnRVE/uT2rOfipcYZAq
9n4MGxORcQ22X4IDDbW39QjcOB66iAlayVPzgA/xVPyD4VsjfaO19AHHDlRdh8kD
Jy03c7h+KT/tD7wDkMiR59kx3RUE+AuK1aMZX7r4QX+5YXXafC3LhzQedxeYtJMM
afWSzL5jAgMBAAECggEAEpct/jgnLZA1b0nE4Rfq9rcts37//gdrUqQKIhmolI1c
KTC9Rw1sIh7fYIr/Bk3WrgnOWZvqFEUIMGhlX4EHEX5orjEgxOvQrcbSYxOEKNZL
iMrt1EtHQID5dJUIbwj05oXUw8u0bH6Kd2Ropdqa7ibMlisk+njx532Zl1u9Ue9q
5MzgFarCN/nbwGKAzKD7h1kpVacNQc0sKRNhEJFi5D08OgT8biEL63I0EXNe0swn
hcaPRb6B38p/KeNjW3H0SSg86NnXhMXbXshmarzI6YjnuNAnOkbRJZlmWCiMbXqo
H0gvWL7yqystlq1SeHMBDddbrSi+ocqIEMQh3e7NsQKBgQDILwLFsURf2TI8sJAW
EB+2R5LMihW/Lq7chVukwX/Fktl1s0xJ5Qd5Fkl61h5V/NTafCm3F9l2xsU7lFO+
HpHCqugU9r9PccCcWR6ufkjCzMh6a/euQA02SWkgpxMzF4CwcdaFjwwlP3qKNbHl
ZMbO1sIr08VWvnxKnN+drCBxKQKBgQDCK2eW/9Rvz7R1Bm0sI2jlDzJsulSGVSX3
5pLxaWkYlGIWmwA2Q2OHudv6StD7xQ9BZZd3HiTBOhNocigs5XHLhr/jNUSpBVdy
G28sc6qE2kBkduZOG+I8OkUmATHNvibFY777I/jvcJingXHesXKU+8D/AIyPps7u
7YIdDHToqwKBgF9TQ5awW0bpPqr3ySU4eGFso9MSzlhD+rC4MHO8UQPccgFCaEmn
7m8S1drQq5F23EVOau7tRHjzHmjIsTgPhomUqP+SoHdMS9Qn/BxLtopMygrB7yfj
CGeZfZ428UWbI4TiMK1Y+Qejus6l0xjRbHqCeeQ06/vqqXU+Tp3eoXRBAoGBAJiK
/wwbGqto823IybYWb48dHFFdJZCPjo+ufpzYYm+kC1eVGFqJIMV9l7uQUZSqoSyQ
gqlbbia72ImCvdtfusHZsCDxNWrQPn3v3ax/hmRvDo2e95o/v8HvSWntIFJx5AXJ
Mj4dabG6tMNMJ8h7gfhXvKzZopQsyX/d6g2mPqaXAoGBAIGVrsDwkN4S4b30/ZXr
+oKG3nzZyQuPmq98AuLewbVBRIfPKKVmZEpf5e7mUlZazt6CBorcwTw5qO2gOhEG
tVTw8zbBRIh+NbOG4xoK2MgMsSF1LGm1QSK3E2lv7anOlM/+kdnOVmZ0X4myg8FH
QQ3RyudOh/2uCQtNiHcQeGQB
-----END PRIVATE KEY-----`,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  }),
});



async function cronRanking() {
  try {
    let today = new Date();

    // Formatear la fecha y hora con la zona horaria específica
    let options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City', // Especificar la zona horaria
    };

    let fechaLocal = new Intl.DateTimeFormat('en-GB', options).format(today);

    // Separar fecha y hora
    let [date, time] = fechaLocal.split(', ');
    let [day, month, year] = date.split('/');
    let [hour, minute, second] = time.split(':');

    // Crear la fecha con el formato correcto para SQL
    let fecha = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    //Actualizar el ranking
    /*
    const updateRankingQuery = `
      UPDATE usuarios 
      JOIN (SELECT id_usuario, 
         RANK() OVER (ORDER BY acumulado_usur DESC) AS nueva_posicion
         FROM usuarios) AS ranking 
         ON usuarios.id_usuario = ranking.id_usuario
      SET usuarios.ranking_usur = ranking.nueva_posicion;
    `;
    */

    const updateRankingQuery = `    
    UPDATE usuarios 
    JOIN (SELECT id_usuario, estatus_usur,
        RANK() OVER (ORDER BY acumulado_usur DESC) AS nueva_posicion
        FROM usuarios) AS ranking 
        ON usuarios.id_usuario = ranking.id_usuario
    SET usuarios.ranking_usur = CASE 
        WHEN ranking.estatus_usur = 'cancelado' THEN NULL 
        ELSE ranking.nueva_posicion 
    END;
    `;

    await db.pool.query(updateRankingQuery);

    const updateRankingTableQuery = `UPDATE ranking SET lastUpdated = '${fecha}' WHERE idRanking = 1`;
    await db.pool.query(updateRankingTableQuery);


    console.log("Cron job realizado");


  } catch (error) {
    console.log(error);
    console.log("Cron job NO realizado");
  }
}

cron.schedule("0 1 * * *", function () {
  console.log("---------------------");
  console.log("running a cron job every day at 1:00 AM");
  cronRanking();
}, {
  timezone: "America/Mexico_City"
});

//rutas
const userRoutes = require('./routes/users');
const quizRoutes = require('./routes/quiz');
const answerRoutes = require('./routes/answers');
const storeRoutes = require('./routes/stores');
const shopRoutes = require('./routes/shop');
const rankingRoutes = require('./routes/ranking');

app.use('/usuario', userRoutes);
app.use('/preguntas', quizRoutes);
app.use('/respuestas', answerRoutes);
app.use('/tiendas', storeRoutes);
app.use('/compras', shopRoutes);
app.use('/ranking', rankingRoutes);

app.get('/', (req, res) => res.send('TINTOMAX API'));

app.listen(4000);
console.log('Server running on port 4000');