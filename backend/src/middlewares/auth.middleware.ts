// src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayloadShape = {
  userId?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
  [k: string]: any;
};

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;

    // 1) Guard: header must exist and start with "Bearer "
    if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized - missing token" });
    }

    // 2) extract token (now guaranteed to be a string)
    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - token missing" });
    }

    // 3) JWT secret must exist
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    // 4) verify token
    // jwt.verify has broad return types; narrow it safely:
    const verified = jwt.verify(token, secret);
    // TS-safe cast: first to unknown, then to our shape
    const payload = (verified as unknown) as JwtPayloadShape;

    if (!payload || !payload.userId) {
      return res.status(401).json({ message: "Unauthorized - invalid token payload" });
    }

    // 5) attach minimal user to request (use 'any' here to avoid global type conflicts)
    (req as any).user = { _id: String(payload.userId), ...payload };

    // debug log (optional)
    console.debug("AUTH OK userId:", payload.userId);

    return next();
  } catch (err: any) {
    console.error("Auth verify error:", err?.message ?? err);
    return res.status(401).json({ message: "Unauthorized - invalid token" });
  }
};
