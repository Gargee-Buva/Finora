import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import type { Request, Response } from "express";
import { findByIdUserService, updateUserService } from "../services/user.service.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { updateUserSchema } from "../validators/user.validator.js";

function resolveUserIdFromReq(req: Request): string | undefined {
  const payload = (req.user ?? {}) as any;
  return payload._id ?? payload.userId ?? payload.id ?? payload.sub;
}

export const getCurrentUserController = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("AUTH PAYLOAD (getCurrentUser):", req.user);

    const userId = resolveUserIdFromReq(req);

    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized - missing user id in token" });
    }

    const user = await findByIdUserService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User fetched successfully",
      user,
    });
  }
);

export const updateUserController = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("AUTH PAYLOAD (updateUser):", req.user);

    const body = updateUserSchema.parse(req.body);
    const userId = resolveUserIdFromReq(req);

    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized - missing user id in token" });
    }

    const profilePic = req.file;

    const user = await updateUserService(userId, body, profilePic);

    return res.status(HTTPSTATUS.OK).json({
      message: "User profile updated successfully",
      data: user,
    });
  }
);
