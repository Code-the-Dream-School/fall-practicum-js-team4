import type { Request, Response } from "express";
import type { User } from "@prisma/client";
import * as authService from "../services/auth.service";
import { COOKIE_NAME, SESSION_DURATION_MS, cookieOptions } from "../config/auth";
import { signToken, verifyToken } from "../utils/jwt";

// Starts a session for the user and sends them back to the frontend.
// Without "remember me" the cookie has no Max-Age, so the browser deletes it
// when it closes (the token inside still expires after 7 days at most).
const sendSession = (
  res: Response,
  status: number,
  user: User,
  { remember = true }: { remember?: boolean } = {},
) => {
  res.cookie(COOKIE_NAME, signToken(user, { remember }), {
    ...cookieOptions(),
    ...(remember && { maxAge: SESSION_DURATION_MS }),
  });
  res.status(status).json({ success: true, data: { user: authService.toPublicUser(user) } });
};

export const register = async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  sendSession(res, 201, user);
};

export const login = async (req: Request, res: Response) => {
  // loginSchema defaults rememberMe to true
  const { rememberMe, ...credentials } = req.body;
  const user = await authService.login(credentials);
  sendSession(res, 200, user, { remember: rememberMe });
};

// Old tokens stop working, so give this browser a fresh one to stay signed in,
// with the same "remember me" choice as the current one.
// requireAuth runs first, so the cookie is valid and req.user is set.
export const changePassword = async (req: Request, res: Response) => {
  const { remember } = verifyToken(req.cookies[COOKIE_NAME])!;
  const user = await authService.changePassword(req.user!.id, req.body);
  sendSession(res, 200, user, { remember });
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ success: true, data: null });
};

export const me = (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
};
