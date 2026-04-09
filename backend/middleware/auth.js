import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Strict auth middleware — used by existing routes as `auth`
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Factory that returns an auth middleware.
 * protect()                — strict, 401 if no/invalid token
 * protect({ optional: true }) — attaches req.user if token present, otherwise continues
 */
export const protect = ({ optional = false } = {}) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (optional) return next();
        return res.status(401).json({ message: 'No token, authorization denied' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        if (optional) return next();
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch {
      if (optional) return next();
      return res.status(401).json({ message: 'Token is not valid' });
    }
  };

export default auth;
