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

  //vemos si en base a las fechas de vigencia del concurso todavia puede responder preguntas
  const [rows] = await db.pool.query("SELECT fecha_inicio, fecha_fin FROM vigencia LIMIT 1");

  if (rows.length === 0) {
    return res.status(400).json({ error: true, msg: "No se encontró información de vigencia en la base de datos" });
  } else {

    //vemos si entra en los parametros del concurso
    const { fecha_inicio, fecha_fin } = rows[0];
    const fechaActual = new Date();
    const soloFecha = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

    const inicio = soloFecha(new Date(fecha_inicio));
    const fin = soloFecha(new Date(fecha_fin));
    const actual = soloFecha(fechaActual);

    if (actual < inicio || actual > fin) {
      return res.status(400).json({ error: true, msg: "La fecha actual no está dentro del periodo de vigencia de la dinámica" });
    }
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
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ? AND tipo_preg_resp = 'general'
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
        SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ? AND tipo_preg_resp = 'general'
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
          SELECT id_preg_resp FROM respuestas WHERE id_usuario_resp = ? AND tipo_preg_resp = 'max'
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
    let res1 = await db.pool.query(query, [id_usuario, id_trivia]);
    res1 = res1[0];

    const id_pregunta1 = res1[0].id_preg1_conj;
    const id_pregunta2 = res1[0].id_preg2_conj;
    const id_pregunta3 = res1[0].id_preg3_conj;

    let quiz = [];

    //pregunta 1
    query = `SELECT * FROM preguntas INNER JOIN respuestas ON preguntas.id_pregunta = respuestas.id_preg_resp WHERE preguntas.id_pregunta = ? AND respuestas.id_usuario_resp = ?`;
    let resultado = await db.pool.query(query, [id_pregunta1, id_usuario]);
    quiz.push(resultado[0][0]);


    //pregunta 2
    query = `SELECT * FROM preguntas INNER JOIN respuestas ON preguntas.id_pregunta = respuestas.id_preg_resp WHERE preguntas.id_pregunta = ? AND respuestas.id_usuario_resp = ?`;
    let resultado2 = await db.pool.query(query, [id_pregunta2, id_usuario]);
    //resultado2.forEach(row => quiz.push(row));
    quiz.push(resultado2[0][0]);

    //pregunta 3
    query = `SELECT * FROM preguntas_max INNER JOIN respuestas ON preguntas_max.id_pregunta_max = respuestas.id_preg_resp WHERE preguntas_max.id_pregunta_max = ? AND respuestas.id_usuario_resp = ? AND respuestas.tipo_preg_resp = 'max'`;
    let resultado3 = await db.pool.query(query, [id_pregunta3, id_usuario]);
    //resultado3.forEach(row => quiz.push(row));
    quiz.push(resultado3[0][0]);


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
