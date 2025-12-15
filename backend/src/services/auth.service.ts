import mongoose from "mongoose";
import type { LoginSchemaType, RegisterSchemaType } from "../validators/auth.validator.js";
import type { IUserSafe } from "../models/user.model.js";
import UserModel from "../models/user.model.js";
import ReportSettingModel, { ReportFrequencyEnum } from "../models/report-setting-model.js";
import { NotFoundException, UnauthorizedException } from "../utils/app-error.js";
import { calculateNextReportDate } from "../utils/helper.js";
import { signJwt } from "../utils/jwt.js";

// ----------------------
// TYPES                    
// ----------------------
export interface AuthResponse {
  user: IUserSafe;
  accessToken?: string;       // canonical token field
  expiresAt?: number;  
  reportSetting?: {
    _id: string;
    frequency: string;
    isEnabled: boolean;
  } | null;
}

// ----------------------
// REGISTER SERVICE
// ----------------------
export const registerService = async (
  body: RegisterSchemaType
): Promise<AuthResponse> => {
  const { email } = body;
  const session = await mongoose.startSession();

  try {
    let result: AuthResponse | undefined;

    await session.withTransaction(async () => {
      // Check if user exists
      const existingUser = await UserModel.findOne({ email }).session(session);
      if (existingUser) throw new UnauthorizedException("User already exists");

      // Create new user
      const newUser = new UserModel({ ...body });
      await newUser.save({ session });

      // Create report settings
      const reportSetting = new ReportSettingModel({
        userId: newUser._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calculateNextReportDate(newUser.createdAt),
        lastSentDate: null,
      });
      await reportSetting.save({ session });

      result = {
        user: newUser.omitPassword(),
        reportSetting: {
          _id: reportSetting._id.toString(),
          frequency: reportSetting.frequency,
          isEnabled: reportSetting.isEnabled,
        },
      };
    });

    if (!result) throw new UnauthorizedException("Registration failed");
    return result;
  } finally {
    await session.endSession();
  }
};

// ----------------------
// LOGIN SERVICE
// ----------------------
export const loginService = async (
  body: LoginSchemaType
): Promise<AuthResponse> => {
  const { email, password } = body;

  // Find user
  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFoundException("Email / password not found");

  // Validate password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new UnauthorizedException("Email / password not found");

  // Generate JWT — signJwt should return { token, expiresAt? }
  const { token, expiresAt: tokenExpiresAt } = signJwt({ userId: user.id });

  // If signJwt didn't return expiresAt, fallback to computed expiry using env or 1h
  const fallbackExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  const expiresAt = tokenExpiresAt ?? fallbackExpiresAt;

  // Fetch report settings
  const reportSettingDoc = await ReportSettingModel.findOne(
    { userId: user._id },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  // Return — single canonical token field (no accessToken duplication)
  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting: reportSettingDoc
      ? {
          _id: reportSettingDoc._id.toString(),
          frequency: reportSettingDoc.frequency,
          isEnabled: reportSettingDoc.isEnabled,
        }
      : null,
  };
};
