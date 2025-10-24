
export default function checkRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(403).json({ message: 'User role not found in token.' });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      next(); // Proceed to route handler
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
};
