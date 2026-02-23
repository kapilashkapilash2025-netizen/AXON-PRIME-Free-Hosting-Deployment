import { isDailyTradingLocked } from '../services/riskService.js';

export async function blockWhenDailyLocked(req, res, next) {
  const lock = await isDailyTradingLocked(req.user.id);
  if (lock.tradingLocked) {
    return res.status(423).json({ message: 'Daily Risk Limit Reached. Trading Disabled for Today.' });
  }
  return next();
}
