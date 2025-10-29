import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];; // get JWT from cookie

  console.log("🔹 Token from cookie:", token); // <- log raw token

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔹 Decoded token payload:", decoded); // <- log decoded payload

    req.user = decoded; // attach to request
    req.token = token;  // attach raw token if needed in controller
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
