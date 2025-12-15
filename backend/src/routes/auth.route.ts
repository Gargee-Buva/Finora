import { Router } from "express";
import { registerController, loginController } from "../controllers/auth.controller.js";

const authRoutes = Router();

// Register route
authRoutes.post("/register", (req, res, next) => {
  console.log("✅ Register route hit");
  next();
}, registerController);

// Login route
authRoutes.post("/login", (req, res, next) => {
  console.log("✅ Login route hit");
  next();
}, loginController);

export default authRoutes;

