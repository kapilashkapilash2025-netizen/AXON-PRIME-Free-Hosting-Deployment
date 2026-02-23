import { prisma } from '../config/db.js';
import { verifyJwt } from '../utils/tokens.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyJwt(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
