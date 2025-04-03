/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");


//preguntas por id trivia y id_usuario
app.get("/check/:idTrivia/:idUser/:idQuiz/:idAnswer/:numQuestion", async (req, res) => {
  let id_trivia = req.params.idTrivia;
  let id_usuario = req.params.idUser;
  let id_pregunta = req.params.idQuiz;
  let id_respuesta = req.params.idAnswer;
  let num_pregunta = req.params.numQuestion;
  
  if (!id_trivia || !id_usuario || !id_pregunta || !id_respuesta || !num_pregunta) {
    return res.status(400).json({
      msg: "Faltan valores",
      error: true,
    });
  }

  try {
    let tipo_pregunta = 'general';
    if(num_pregunta == 3){
      tipo_pregunta = 'max';
    }

    let query = '';  
    let answer = '';
    let resultado = 'Incorrecto';
    let respuesta_bool = 0 //false

    if(num_pregunta == 3){
      query = `SELECT * FROM preguntas_max WHERE id_pregunta_max = ?`;
      answer = await db.pool.query(query, [id_pregunta]);
      answer = answer[0][0];

      if(Number(answer.resp_preg_max) == Number(id_respuesta)){
        resultado = 'Correcto';
        respuesta_bool = 1 //true
      }

    }else{
      query = `SELECT * FROM preguntas WHERE id_pregunta = ?`;
      answer = await db.pool.query(query, [id_pregunta]);
      answer = answer[0][0];

      if(Number(answer.resp_preg) == Number(id_respuesta)){
        resultado = 'Correcto';
        respuesta_bool = 1 //true
      }

    }
    
    //buscamos cuantos puntos vale la respuesta correcta
    query = `SELECT * FROM conjunto_triv WHERE num_trivia = ? AND id_user_conj = ?`;
    answer = await db.pool.query(query, [id_trivia, id_usuario]);
    answer = answer[0][0];
    const puntosporrespuestacorrecta = answer.cat_conj;

    let totalPuntos = 0;
    if(respuesta_bool == 1){
      totalPuntos = puntosporrespuestacorrecta;
    }

    query = `INSERT INTO respuestas 
         (id_usuario_resp,
          id_preg_resp,
          tipo_preg_resp,
          id_conj_resp,
          id_cat_resp,
          opcion_selec_resp,
          correcta_resp,
          puntos_resp) 
          VALUES 
          (?, ?, ?, ?, ?, ?, ?, ?)`;
    
        const values = [
          id_usuario,
          id_pregunta,
          tipo_pregunta,
          id_trivia,
          puntosporrespuestacorrecta, 
          id_respuesta,
          respuesta_bool,
          totalPuntos
        ];
    
        await db.pool.query(query, values);

        //vemos si fue la ultima pregunta
        if(num_pregunta == 3){

           const updateQuery = `UPDATE conjunto_triv SET estatus_conj = 'contestada' WHERE id_user_conj = ? AND num_trivia = ?`;
           await db.pool.query(updateQuery, [id_usuario, id_trivia]);

        }


    res.status(200).json({ error: false, resultado, totalPuntos });
    
    
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

module.exports = app;
