import { calculatePosition, getEquityCurve, getRiskSnapshot, upsertRiskSetting } from '../services/riskService.js';

export async function positionSize(req, res, next) {
  try {
    const result = await calculatePosition(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function setRiskSettings(req, res, next) {
  try {
    const setting = await upsertRiskSetting(req.user.id, req.body);
    res.json({ setting });
  } catch (error) {
    next(error);
  }
}

export async function snapshot(req, res, next) {
  try {
    const data = await getRiskSnapshot(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function equityCurve(req, res, next) {
  try {
    const points = await getEquityCurve(req.user.id);
    res.json({ points });
  } catch (error) {
    next(error);
  }
}
