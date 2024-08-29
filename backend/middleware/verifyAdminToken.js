const jwt = require('jsonwebtoken');

function verifyAdminToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    console.error('No token provided');
    return res.status(403).json({ message: 'No token provided' });
  }

  const bearer = bearerHeader.split(' ');
  const token = bearer[1];

  console.log('Token received:', token);  // Log the token received

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ message: 'Failed to authenticate token' });
    }

    console.log('Decoded token:', decoded);  // Log the decoded token

    if (!decoded.id || !decoded.role) {
      console.error('Decoded token is missing id or role:', decoded);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = { id: decoded.id, role: decoded.role };
    console.log('User attached to request:', req.user);  // Log the user attached to req
    next();
  });
}

module.exports = verifyAdminToken;
