/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/authorization");
const db = require("../config/db");
const mailer = require("../controller/mailController");
const cloudinary = require("../config/cloudinaryConfig");
const bodyParser = require("body-parser");

app.use(bodyParser.json({ limit: "10mb" })); // Permitir imágenes grandes en base64

//preguntas por id trivia
app.get("/quiz/:idTrivia", async (req, res) => {
  let id_trivia = req.params.idTrivia;

  if (!id_trivia) {
    return res.status(400).json({
      msg: "El id_trivia debe de tener algun valor",
      error: true,
    });
  }

  //calculamos el primer id de pregunta
  const questionId = (Number(id_trivia) - 1) * 3 + 1;
  
  try {

    let query = `SELECT * FROM preguntas WHERE id_preguta >= ? LIMIT 3`;
    let trivias = await db.pool.query(query, [questionId]);
    trivias = trivias[0];

    res.status(200).json({ error: false, trivias });
    
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

module.exports = app;
