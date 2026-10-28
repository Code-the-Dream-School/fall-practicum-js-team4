import type { PublicUser } from "../services/auth.service";

// requireAuth sets req.user to the signed-in user (undefined on public routes)
declare module "express-serve-static-core" {
  interface Request {
    user?: PublicUser;
  }
}
