import type { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";
import {
  chartAnalyticsService,
  expensePieChartBreakdownService,
  summaryAnalyticsService,
} from "../services/analytics.service.js";
import { normalizeDateRangePreset } from "../utils/helper.js";

export const summaryAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    console.log("REQ.USER:", req.user);
    const userId = req.user?._id;

    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: normalizeDateRangePreset(preset),
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };
    const stats = await summaryAnalyticsService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Summary fetched successfully",
      data: stats,
    });
  }
);


export const chartAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: normalizeDateRangePreset(preset),
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };

    const chartData = await chartAnalyticsService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Chart fetched successfully",
      data: chartData,
    });
  }
);

export const expensePieChartBreakdownController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { preset, from, to } = req.query;

    const filter = {
      dateRangePreset: normalizeDateRangePreset(preset),
      customFrom: from ? new Date(from as string) : undefined,
      customTo: to ? new Date(to as string) : undefined,
    };
    const pieChartData = await expensePieChartBreakdownService(
      userId,
      filter.dateRangePreset,
      filter.customFrom,
      filter.customTo
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Expense breakdown fetched successfully",
      data: pieChartData,
    });
  }
);

