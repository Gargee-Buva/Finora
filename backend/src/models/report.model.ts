import mongoose from "mongoose";

/** Declare enum first */
export enum ReportStatusEnum {
  SENT = "SENT",
  PENDING = "PENDING",
  FAILED = "FAILED",
  NO_ACTIVITY = "NO_ACTIVITY",
}

/** Now you can safely reference it */
export interface ReportDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  period: string; // e.g., "2023-08"
  sentDate: Date;
  status: ReportStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema<ReportDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    period: {
      type: String,
      required: true,
    },
    sentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatusEnum),
      default: ReportStatusEnum.PENDING,
    },
  },
  { timestamps: true }
);

const ReportModel = mongoose.model<ReportDocument>("Report", reportSchema);

export default ReportModel;
