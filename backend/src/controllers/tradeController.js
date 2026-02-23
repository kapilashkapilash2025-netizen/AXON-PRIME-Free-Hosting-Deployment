import { createTrade, deleteTrade, listTrades, updateTrade } from '../services/tradeService.js';
import { ApiError } from '../utils/apiError.js';

export async function create(req, res, next) {
  try {
    const trade = await createTrade(req.user.id, req.body);
    res.status(201).json({ trade });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const trade = await updateTrade(req.user.id, req.params.id, req.body);
    if (!trade) throw new ApiError(404, 'Trade not found');
    res.json({ trade });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const trade = await deleteTrade(req.user.id, req.params.id);
    if (!trade) throw new ApiError(404, 'Trade not found');
    res.json({ message: 'Trade deleted' });
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    const data = await listTrades(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
