import passport from "passport";
import { Router } from "express";
import {
  generateReportController,
  getAllReportsController,
  updateReportSettingController,
} from "../controllers/report.controller.js";

const reportRoutes = Router();

// Apply JWT auth to all routes in this router
reportRoutes.use(passport.authenticate("jwt", { session: false }));

reportRoutes.get("/all", getAllReportsController);
reportRoutes.get("/generate", generateReportController);
reportRoutes.put("/update-setting", updateReportSettingController);

export default reportRoutes;
