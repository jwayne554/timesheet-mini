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

    // Log the entire decoded token to ensure it contains expected fields
    console.log('Decoded token:', decoded);

    if (!decoded.id || !decoded.role) {
      console.error('Decoded token is missing id or role:', decoded);
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Attach the decoded token to req.user
    req.user = { id: decoded.id, role: decoded.role };
    next();
  });
}

module.exports = verifyAdminToken;
