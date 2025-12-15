import { Router } from "express";
import {
  chartAnalyticsController,
  expensePieChartBreakdownController,
  summaryAnalyticsController,
} from "../controllers/analytics.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const analyticsRoutes = Router();

analyticsRoutes.get("/summary",auth, summaryAnalyticsController);
analyticsRoutes.get("/chart",auth, chartAnalyticsController);
analyticsRoutes.get("/expense-breakdown",auth, expensePieChartBreakdownController);

export default analyticsRoutes;