/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");

app.get("/generales", async (req, res) => {
  try {
    let query = `SELECT * FROM compras c INNER JOIN usuarios u ON c.id_usuario_comp = u.id_usuario INNER JOIN sucursales s ON c.id_unidad_comp = s.idSucursal ORDER BY fecha_reg_comp DESC`;
    let compras = await db.pool.query(query);
    compras = compras[0];

    res.status(200).json({ error: false, compras });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

app.get("/tickets/:id", async (req, res) => {
  let userId = req.params.id;

  if (!userId) {
    return res.status(400).json({
      msg: "El id debe de tener algun valor",
      error: true,
    });
  }

  try {
    let query = `SELECT 
    ct.id_user_conj AS id_usuario,
    s.nombreSucursal,
    c.id_compra,
    c.fecha_comp,
    c.foto_comp,
    c.nota_comp,
    ct.num_trivia,
    COALESCE(SUM(r.puntos_resp), 0) AS total_puntos
FROM conjunto_triv ct
JOIN compras c ON ct.id_comp_conj = c.id_compra
JOIN sucursales s ON c.id_unidad_comp = s.idSucursal
LEFT JOIN respuestas r 
    ON ct.id_user_conj = r.id_usuario_resp 
    AND ct.num_trivia = r.id_conj_resp
WHERE ct.id_user_conj = ?
AND (ct.estatus_conj = 'asignada' OR ct.estatus_conj = 'contestada')
GROUP BY ct.num_trivia, ct.id_user_conj, c.id_compra, s.nombreSucursal, c.fecha_comp
ORDER BY c.fecha_comp`;



    let tickets = await db.pool.query(query, [userId]);
    tickets = tickets[0];

    res.status(200).json({ error: false, tickets });

  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});



app.get("/colaboradores", async (req, res) => {
  try {
    let query = `SELECT 
    u.nombre_usur,
    c.id_usuario_vend_comp,
    COUNT(*) AS total_compras
    FROM compras c
    INNER JOIN usuarios u ON c.id_usuario_vend_comp = u.id_usuario
    GROUP BY c.id_usuario_vend_comp, u.nombre_usur
    ORDER BY total_compras ASC
        `;
    let colaboradores = await db.pool.query(query);
    colaboradores = colaboradores[0];

    res.status(200).json({ error: false, colaboradores });
  } catch (error) {
    res.status(500).json({
      msg: "Hubo un error obteniendo los datos",
      error: true,
      details: error,
    });
  }
});

module.exports = app;
