//Importación de libreria SQL
const mysql = require('mysql2/promise');
require('dotenv').config();

// Conexión con la BD
const pool = mysql.createPool({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSW,
    port:   3306,
    database: process.env.DBNAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 100,           // peticiones esperando
    acquireTimeout: 10000      // ms
});

pool.on('connection', connection =>{
    connection.query('SET time_zone="-06:00";',err =>{
        if(err){
            console.log(err);
            return;
        }
    });
});


module.exports = { pool };


