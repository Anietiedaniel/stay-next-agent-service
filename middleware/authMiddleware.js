import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  const token = req.cookies.token; // ✅ get from cookie
  console.log("decoded token: ", req.cookies)
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // or fetch from DB if needed
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
