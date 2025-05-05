/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");


app.get("/obtener", async (req, res) => {
  try {
    let query = `SELECT lastUpdated FROM ranking`;
    let ranking = await db.pool.query(query);
    ranking = ranking[0];

    res.status(200).json({ error: false, ranking });
    
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});


module.exports = app;
