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
    let query = `SELECT * FROM conjunto_triv WHERE id_user_conj = ? AND num_trivia = ?`;
    let quiz = await db.pool.query(query, [id_usuario, id_trivia]);
    quiz = quiz[0];

    let numeroPregunta = 0;

    const id_pregunta1 = quiz[0].id_preg1_conj;
    const id_pregunta2 = quiz[0].id_preg2_conj;
    const id_pregunta3 = quiz[0].id_preg3_conj;

    //pregunta 1
    query = `SELECT preguntas.id_pregunta, preguntas.opcion_1_preg, preguntas.opcion_2_preg, preguntas.opcion_3_preg, preguntas.pregunta FROM preguntas 
    WHERE id_pregunta = ?
    AND id_pregunta NOT IN (
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ?
    ) 
    LIMIT 1
    `;
    quiz = await db.pool.query(query, [id_pregunta1, id_usuario]);
    quiz = quiz[0];
    numeroPregunta = 1;

    if (quiz.length == 0) {
      //pregunta 2
      query = `SELECT preguntas.id_pregunta, preguntas.opcion_1_preg, preguntas.opcion_2_preg, preguntas.opcion_3_preg, preguntas.pregunta FROM preguntas 
      WHERE id_pregunta = ?
      AND id_pregunta NOT IN (
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ?
      ) 
      LIMIT 1
      `;
      quiz = await db.pool.query(query, [id_pregunta2, id_usuario]);
      quiz = quiz[0];
      numeroPregunta = 2;

      if (quiz.length == 0) {
        //pregunta 3 OJO es del la tabla preguntas_max
        query = `SELECT preguntas_max.id_pregunta_max, preguntas_max.opcion_1_preg_max, preguntas_max.opcion_2_preg_max, preguntas_max.opcion_3_preg_max, preguntas_max.pregunta_max FROM preguntas_max 
        WHERE id_pregunta_max = ?
        AND id_pregunta_max NOT IN (
          SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ?
        ) 
        LIMIT 1
        `;
        quiz = await db.pool.query(query, [id_pregunta3, id_usuario]);
        quiz = quiz[0];
        numeroPregunta = 3;

      }
    }

    if (quiz.length != 0) {
      quiz[0].numeroPregunta = numeroPregunta;
    }  
    res.status(200).json({ error: false, quiz });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/result/:idTrivia/:idUser", async (req, res) => {
  let id_trivia = req.params.idTrivia;
  let id_usuario = req.params.idUser;

  if (!id_trivia || !id_usuario) {
    return res.status(400).json({
      msg: "Faltan valores",
      error: true,
    });
  }

  try {
    let query = `SELECT * FROM conjunto_triv WHERE id_user_conj = ? AND num_trivia = ?`;
    let res = await db.pool.query(query, [id_usuario, id_trivia]);
    res = res[0];
    

    const id_pregunta1 = res[0].id_preg1_conj;
    const id_pregunta2 = res[0].id_preg2_conj;
    const id_pregunta3 = res[0].id_preg3_conj;

    let quiz = []; // Array para almacenar todas las preguntas

    //pregunta 1
    query = `SELECT * FROM preguntas INNER JOIN respuestas ON preguntas.id_pregunta = respuestas.id_preg_resp WHERE preguntas.id_pregunta = ? AND respuestas.id_usuario_resp = ?`;
    let resultado1 = await db.pool.query(query, [id_pregunta1, id_usuario]);
    resultado1 = resultado1[0];
    if (resultado1.length > 0) {
      quiz = quiz.concat(resultado1); // Agregamos los resultados al array sin sobrescribirlo
    }

    //pregunta 2
    query = `SELECT * FROM preguntas INNER JOIN respuestas ON preguntas.id_pregunta = respuestas.id_preg_resp WHERE preguntas.id_pregunta = ? AND respuestas.id_usuario_resp = ?`;
    let resultado2 = await db.pool.query(query, [id_pregunta2, id_usuario]);
    resultado2 = resultado2[0];
    if (resultado2.length > 0) {
      quiz = quiz.concat(resultado2); // Agregamos los resultados al array sin sobrescribirlo
    }
       
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
