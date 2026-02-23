import { getEquityCurveSeries, getOvertradingSignals, getOvertradingStatus, getRiskHeatmap } from '../services/analyticsService.js';
import { getDisciplineScore } from '../services/disciplineService.js';
import { getPredictiveRiskIntelligence } from '../services/predictiveRiskEngine.js';

export async function proHeatmap(req, res, next) {
  try {
    const data = await getRiskHeatmap(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function overtrading(req, res, next) {
  try {
    const data = await getOvertradingSignals(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function overtradingStatus(req, res, next) {
  try {
    const data = await getOvertradingStatus(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function equityCurve(req, res, next) {
  try {
    const data = await getEquityCurveSeries(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function disciplineScore(req, res, next) {
  try {
    const data = await getDisciplineScore(req.user.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function predictiveRisk(req, res, next) {
  try {
    const data = await getPredictiveRiskIntelligence(req.user.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (error) {
    next(error);
  }
}
