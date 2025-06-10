const db = require("../config/db");

const verificarIPBloqueada = async (req, res, next) => {
  const ip = req.ip;

  try {
    
    const [rows] = await db.pool.query(
      'SELECT * FROM blocked_ips WHERE ip = ? AND blocked_until > NOW()',
      [ip]
    );

    if (rows.length > 0) {
      return res.status(403).json({ error: 'Tu IP ha sido bloqueada temporalmente.' });
    }

    next();
  } catch (err) {
    console.error('Error al verificar IP bloqueada', err);
    next(); // Permitir continuar si hay error de base
  }
};

module.exports = verificarIPBloqueada;
