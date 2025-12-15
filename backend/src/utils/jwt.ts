//import * as jwt from "jsonwebtoken";
import jwt , { type SignOptions, type JwtPayload } from "jsonwebtoken";
import Env from "../config/env.config.js";


type TimeUnit = "s" | "m" | "h" | "d" | "w" | "y";
type TimeString = `${number}${TimeUnit}`;

export type AccessTokenPayload = {
  userId: string;
};

type SignOptionsAndSecret = {
  secret: string;
  expiresIn?: TimeString | number;
};

const defaults: SignOptions = {
  audience: Env.JWT_AUDIENCE,     // ✅ use env value instead of hardcoded "user"
  issuer: Env.JWT_ISSUER,         // ✅ include issuer if you validate it
  algorithm: "HS256",             // ✅ explicit algo
};

const accessTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: Env.JWT_EXPIRES_IN as TimeString,
  secret: Env.JWT_SECRET,
};

export const signJwt = (
  payload: AccessTokenPayload,
  options: SignOptionsAndSecret = accessTokenSignOptions
) => {
  const { secret, ...opts } = options ;

  const token = jwt.sign(payload, secret, {
    ...defaults,
    ...opts,
  });

  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresAt = decoded?.exp ? decoded.exp * 1000 : undefined;

  return { token, expiresAt };
};

