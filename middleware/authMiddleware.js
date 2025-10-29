import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  console.log("🔹 Cookie token:", req.cookies?.token);
  console.log("🔹 Auth header:", req.headers.authorization);

  if (!token) {
    console.log("⚠️ No token found");
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔹 Decoded token payload:", decoded);

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


