import { loginUser, registerUser, verifyEmail } from '../services/authService.js';

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ message: 'Registration successful. Verify email to continue.', userId: user.id });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { token, user } = await loginUser(req.body);
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  } catch (error) {
    next(error);
  }
}

export async function verify(req, res, next) {
  try {
    await verifyEmail(req.query.token);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      accountBalance: Number(req.user.accountBalance),
      currentEquity: Number(req.user.currentEquity),
      equityPeak: Number(req.user.equityPeak)
    }
  });
}
