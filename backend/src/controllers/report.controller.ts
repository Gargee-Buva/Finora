import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";
import {
  generateReportService,
  getAllReportsService,
  updateReportSettingService,
} from "../services/report.service.js";
import { updateReportSettingSchema } from "../validators/report.validator.js";

export const getAllReportsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const pagination = {
      pageSize: parseInt(req.query.pageSize as string) || 20,
      pageNumber: parseInt(req.query.pageNumber as string) || 1,
    };

    const result = await getAllReportsService(userId, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports history fetched successfully",
      ...result,
    });
  }
);

export const updateReportSettingController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = updateReportSettingSchema.parse(req.body);

    await updateReportSettingService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports setting updated successfully",
    });
  }
);


export const generateReportController = asyncHandler(
  async (req: Request, res: Response) => {
    // prefer authenticated user id; keep existing behavior
    const userId = req.user?._id;

    // Read and decode raw query params (defensive: handles %0A or other encoded chars)
    const rawFromRaw = req.query.from ? String(req.query.from) : "";
    const rawToRaw = req.query.to ? String(req.query.to) : "";

    // decodeURIComponent is defensive against encoded newlines/whitespace
    const rawFrom = rawFromRaw ? decodeURIComponent(rawFromRaw).trim() : "";
    const rawTo = rawToRaw ? decodeURIComponent(rawToRaw).trim() : "";

    if (!rawFrom || !rawTo) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ message: "Missing 'from' or 'to' query parameter." });
    }

    // Parse into Date objects and validate
    const fromDate = new Date(rawFrom);
    const toDate = new Date(rawTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ message: "Invalid 'from' or 'to' date format. Use ISO format like 2025-08-01T00:00:00.000Z" });
    }

    // Defensive: ensure from <= to
    if (fromDate.getTime() > toDate.getTime()) {
      return res
        .status(HTTPSTATUS.BAD_REQUEST)
        .json({ message: "'from' must be earlier than or equal to 'to'." });
    }

    // Debug log so you can compare what was received vs what will be used
    console.log(
      "REPORT REQUEST - authUser:",
      req.user?._id,
      "from (raw):",
      rawFrom,
      "to (raw):",
      rawTo,
      "from (UTC):",
      fromDate.toISOString(),
      "to (UTC):",
      toDate.toISOString()
    );

    const result = await generateReportService(userId, fromDate, toDate);
   
    console.log("REPORT RESPONSE — period:", result?.period);
    console.log("REPORT RESPONSE — summary:", JSON.stringify(result?.summary));
    console.log("REPORT RESPONSE — insights (count):", Array.isArray(result?.insights) ? result.insights.length : "no insights");
    console.log("REPORT RESPONSE — insights:", JSON.stringify(result?.insights, null, 2));


    if (result === null) {
      return res
        .status(HTTPSTATUS.NOT_FOUND)
        .json({ message: "No report generated (invalid user or no data)." });
    }

    return res.status(HTTPSTATUS.OK).json({
      message: "Report generated successfully",
      ...result,
    });
  }
);


