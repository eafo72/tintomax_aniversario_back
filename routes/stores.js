/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "10mb" })); // Permitir imágenes grandes en base64

app.get("/sucursales", async (req, res) => {
  try {
    let query = `SELECT * FROM sucursales`;
    let sucursales = await db.pool.query(query);
    sucursales = sucursales[0];

    res.status(200).json({ error: false, sucursales });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

module.exports = app;
