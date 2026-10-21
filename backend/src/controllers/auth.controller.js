const authService = require("../services/auth.service");
const { COOKIE_NAME, SESSION_DURATION_MS, cookieOptions } = require("../config/auth");
const { signToken, verifyToken } = require("../utils/jwt");

// Starts a session for the user and sends them back to the frontend.
// Without "remember me" the cookie has no Max-Age, so the browser deletes it
// when it closes (the token inside still expires after 7 days at most).
const sendSession = (res, status, user, { remember = true } = {}) => {
  res.cookie(COOKIE_NAME, signToken(user, { remember }), {
    ...cookieOptions(),
    ...(remember && { maxAge: SESSION_DURATION_MS }),
  });
  res.status(status).json({ success: true, data: { user: authService.toPublicUser(user) } });
};

const register = async (req, res) => {
  const user = await authService.register(req.body);
  sendSession(res, 201, user);
};

const login = async (req, res) => {
  // loginSchema defaults rememberMe to true
  const { rememberMe, ...credentials } = req.body;
  const user = await authService.login(credentials);
  sendSession(res, 200, user, { remember: rememberMe });
};

// Old tokens stop working, so give this browser a fresh one to stay signed in,
// with the same "remember me" choice as the current one
const changePassword = async (req, res) => {
  const { remember } = verifyToken(req.cookies[COOKIE_NAME]);
  const user = await authService.changePassword(req.user.id, req.body);
  sendSession(res, 200, user, { remember });
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
