// src/controllers/auth.controller.ts
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import { registerService, loginService } from "../services/auth.service.js";

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await registerService(body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "User registered successfully",
    data: result,
  });
});

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await loginService(body);

  // unify token extraction (supports both 'token' and legacy 'accessToken')
  const returnedToken = (result as any)?.token ?? (result as any)?.accessToken;

  if (!returnedToken) {
    return res.status(HTTPSTATUS.UNAUTHORIZED).json({
      message: "Invalid credentials",
    });
  }

  // convenience: set Authorization header so clients can read it easily
  res.setHeader("Authorization", `Bearer ${returnedToken}`);

  return res.status(HTTPSTATUS.OK).json({
    message: "User logged in successfully",
    data: result, // contains { user, token, accessToken?, expiresAt?, reportSetting? }
  });
});
