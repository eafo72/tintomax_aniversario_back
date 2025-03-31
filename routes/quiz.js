/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");


//preguntas por id trivia y id_usuario
app.get("/quiz/:idTrivia/:idUser", async (req, res) => {
  let id_trivia = req.params.idTrivia;
  let id_usuario = req.params.idUser;

  if (!id_trivia || !id_usuario) {
    return res.status(400).json({
      msg: "Faltan valores",
      error: true,
    });
  }

     
  try {
    let query = `SELECT * FROM conjunto_triv WHERE id_user_conj = ? AND num_trivia = ? AND estatus_conj = 'asignada'`;
    let quiz = await db.pool.query(query, [id_usuario, id_trivia]);
    quiz = quiz[0];


    query = `SELECT preguntas.id_pregunta, preguntas.opcion_1_preg, preguntas.opcion_2_preg, preguntas.opcion_3_preg, preguntas.pregunta FROM preguntas 
    WHERE id_pregunta = ? OR  id_pregunta = ? OR id_pregunta = ?
    AND id_pregunta NOT IN (
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ?
    ) 
    LIMIT 1
    `;

    quiz = await db.pool.query(query, [quiz[0].id_preg1_conj, quiz[0].id_preg2_conj, quiz[0].id_preg3_conj, id_usuario]);
    quiz = quiz[0];

    res.status(200).json({ error: false, quiz });
    
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

module.exports = app;
