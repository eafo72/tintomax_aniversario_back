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

  //calculamos el primer id de pregunta
  const startQuestionId = (Number(id_trivia) - 1) * 3 + 1;
  const endQuestionId = startQuestionId + 2;

  console.log("start:"+startQuestionId);
  console.log("end:"+endQuestionId);
  
  try {
    let query = `
    SELECT preguntas.id_pregunta, preguntas.opcion_1_preg, preguntas.opcion_2_preg, preguntas.opcion_3_preg, preguntas.pregunta FROM preguntas 
    WHERE id_pregunta >= ? 
    AND id_pregunta <= ? 
    AND id_pregunta NOT IN (
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ?
    ) 
    ORDER BY id_pregunta ASC 
    LIMIT 1
    `;

    

    let quiz = await db.pool.query(query, [startQuestionId, endQuestionId, id_usuario]);
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
