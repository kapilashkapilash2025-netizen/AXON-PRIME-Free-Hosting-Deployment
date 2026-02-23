import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const signJwt = (payload) => jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyJwt = (token) => jwt.verify(token, env.jwtSecret);

export const randomToken = () => crypto.randomBytes(32).toString('hex');
