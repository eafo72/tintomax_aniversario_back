function checkRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== role) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }
    next();
  };
}

module.exports = checkRole;
