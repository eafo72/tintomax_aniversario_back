/* Importing the express module and creating an instance of it. */
const express = require("express");
const app = express.Router();
const db = require("../config/db");

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
    ct.id_conj,
    c.fecha_comp,
    COALESCE(SUM(r.puntos_resp), 0) AS total_puntos
FROM conjunto_triv ct
JOIN compras c ON ct.id_comp_conj = c.id_compra
JOIN sucursales s ON c.id_unidad_comp = s.idSucursal
LEFT JOIN respuestas r 
    ON ct.id_user_conj = r.id_usuario_resp 
    AND ct.id_conj = r.id_conj_resp
WHERE ct.id_user_conj = ?
AND (ct.estatus_conj = 'asignada' OR ct.estatus_conj = 'contestada')
GROUP BY ct.id_conj, ct.id_user_conj, c.id_compra, s.nombreSucursal, c.fecha_comp
ORDER BY c.fecha_comp;`;

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


module.exports = app;
