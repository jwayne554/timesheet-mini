const jwt = require('jsonwebtoken');

function verifyAdminToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) return res.status(403).json({ message: 'No token provided' });

  const bearer = bearerHeader.split(' ');
  const token = bearer[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Failed to authenticate token' });
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
    req.adminId = decoded.id;
    next();
  });
}

module.exports = verifyAdminToken;