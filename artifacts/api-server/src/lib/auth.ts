import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "30d";

export interface AuthClaims {
  userId: string;
  condominiumId: string;
  email: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthClaims;
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthClaims;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const token = header.slice(7).trim();
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
    return;
  }
  req.auth = claims;
  next();
}
