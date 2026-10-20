const authService = require("../services/auth.service");
const { COOKIE_NAME, SESSION_DURATION_MS, cookieOptions } = require("../config/auth");
const { signToken } = require("../utils/jwt");

// Starts a session for the user and sends them back to the frontend
const sendSession = (res, status, user) => {
  res.cookie(COOKIE_NAME, signToken(user), {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_MS,
  });
  res.status(status).json({ success: true, data: { user: authService.toPublicUser(user) } });
};

const register = async (req, res) => {
  const user = await authService.register(req.body);
  sendSession(res, 201, user);
};

const login = async (req, res) => {
  const user = await authService.login(req.body);
  sendSession(res, 200, user);
};

// Old tokens stop working, so give this browser a fresh one to stay signed in
const changePassword = async (req, res) => {
  const user = await authService.changePassword(req.user.id, req.body);
  sendSession(res, 200, user);
};

const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ success: true, data: null });
};

const me = (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

module.exports = {
  register,
  login,
  changePassword,
  logout,
  me,
};
