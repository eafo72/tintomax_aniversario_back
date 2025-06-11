const jwt = require("jsonwebtoken");
require('dotenv').config();

module.exports = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({
      error: true,
      msg: "No hay token, permiso no válido",
    });
  }

  try {
    //verificamos el token
    const openToken = jwt.verify(token, process.env.SECRET);

    req.user = openToken.user;

    next();
  } catch (error) {
    res.status(401).json({ error: true, msg: "Token no válido" });
  }
};
