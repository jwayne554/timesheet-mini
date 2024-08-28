const jwt = require('jsonwebtoken');

function verifyAdminToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    console.error('No token provided');
    return res.status(403).json({ message: 'No token provided' });
  }

  const bearer = bearerHeader.split(' ');
  const token = bearer[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ message: 'Failed to authenticate token' });
    }

    // Ensure only admin or superadmin can proceed
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      console.error(`Unauthorized role: ${decoded.role}`);
      return res.status(403).json({ message: 'Not authorized - Admins only' });
    }

    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    console.log(`Token verified. User ID: ${decoded.id}, Role: ${decoded.role}`);
    next();
  });
}

module.exports = verifyAdminToken;
