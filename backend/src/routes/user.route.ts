import { Router } from "express";
import { getCurrentUserController, updateUserController } from "../controllers/user.controller.js";
import { upload } from "../config/cloudinary.config.js";
import { passportAuthenticateJwt } from "../config/passport.config.js";

const userRoutes = Router();

userRoutes.get("/current-user", passportAuthenticateJwt, getCurrentUserController);

userRoutes.put(
  "/update",
  passportAuthenticateJwt,
  upload.single("profilePicture"),
  updateUserController
);

export default userRoutes;