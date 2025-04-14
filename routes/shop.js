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
    c.id_usuario_comp,
    s.nombreSucursal,
    c.id_compra,
    ct.id_conj,
    c.fecha_comp,
    COALESCE(SUM(r.puntos_resp), 0) AS total_puntos
FROM compras c
JOIN sucursales s ON c.id_unidad_comp = s.idSucursal
LEFT JOIN conjunto_triv ct ON c.id_compra = ct.id_comp_conj
LEFT JOIN respuestas r 
    ON ct.id_conj = r.id_conj_resp 
    AND c.id_usuario_comp = r.id_usuario_resp
WHERE c.id_usuario_comp = ?
GROUP BY 
    c.id_usuario_comp,
    s.nombreSucursal,
    c.id_compra,
    ct.id_conj,
    c.fecha_comp
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


module.exports = app;
