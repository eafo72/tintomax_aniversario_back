/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const auth = require("../middlewares/authorization");
const checkRole = require('../middlewares/checkRole');
const db = require("../config/db");
const bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "10mb" })); // Permitir imágenes grandes en base64

app.get("/sucursales", async (req, res) => {
  try {
    let query = `SELECT * FROM sucursales ORDER BY nombreSucursal ASC`;
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


app.get("/obtener/:id",auth, checkRole('Administrador'), async (req, res) => {
  try {
    let storeId = req.params.id;

    if (!storeId) {
      return res.status(400).json({
        msg: "El id debe de tener algun valor",
        error: true,
      });
    }

    let query = `SELECT * FROM sucursales WHERE idSucursal = ?`;
    let store = await db.pool.query(query,[storeId]);

    store = store[0];

    res.status(200).json({ error: false, store });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});


module.exports = app;
