// import { format } from "path";
import type { Response, ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import { HTTPSTATUS } from "../config/http.config.js";
import { AppError } from "../utils/app-error.js";
import { ErrorCodeEnum } from "../enums/error-code.enum.js";
import { MulterError } from "multer";

const formatZodError = (error: z.ZodError, res: Response) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors: errors,
    errorcode: ErrorCodeEnum.VALIDATION_ERROR,
  });
};

const handleMulterError = (error: MulterError) => {
  const messages = {
    LIMIT_UNEXPECTED_FILE: "Invalid file field name. Please use 'file'",
    LIMIT_FILE_SIZE: "File size exceeds the limit",
    LIMIT_FILE_COUNT: "Too many files uploaded",
    default: "File upload error",
  };

  return {
    status: HTTPSTATUS.BAD_REQUEST,
    message: messages[error.code as keyof typeof messages] || messages.default,
    error: error.message,
  };
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next): any => {
  console.error("Error occurred on PATH", req.path, "Error:", err);

  if (err instanceof ZodError) {
    return formatZodError(err, res);
  }

  if (err instanceof MulterError) {
    const { status, message, error } = handleMulterError(err);
    return res.status(status).json({
      message,
      error: error,
      errorCode: ErrorCodeEnum.FILE_UPLOAD_ERROR,
    });
  }
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errorcode: err.errorcode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: err?.message || "Unknown error occurred",
  });
};


// import type { Response, ErrorRequestHandler } from "express";
// import { z, ZodError } from "zod";
// import { HTTPSTATUS } from "../config/http.config.js";
// import { AppError } from "../utils/app-error.js";
// import { ErrorCodeEnum } from "../enums/error-code.enum.js";
// import { MulterError } from "multer";

// const formatZodError = (error: z.ZodError, res: Response) => {
//   const errors = error?.issues?.map((err) => ({
//     field: err.path.join("."),
//     message: err.message,
//   }));

//   return res.status(HTTPSTATUS.BAD_REQUEST).json({
//     message: "Validation failed",
//     errors: errors,
//     errorCode: ErrorCodeEnum.VALIDATION_ERROR,
//   });
// };

// const handleMulterError = (error: MulterError) => {
//   const messages: Record<string, (field?: string) => string> = {
//     LIMIT_UNEXPECTED_FILE: (field?: string) =>
//       `Invalid file field name${field ? ` ('${field}')` : ""}. Expected the field name the route accepts (e.g. 'profilePicture').`,
//     LIMIT_FILE_SIZE: () => "File size exceeds the limit.",
//     LIMIT_FILE_COUNT: () => "Too many files uploaded.",
//     default: () => "File upload error.",
//   };

//   const messageFn = messages[error.code] ?? messages["default"];
//   const message = typeof messageFn === "function" ? messageFn(error.field) : (messageFn as any);

//   return {
//     status: HTTPSTATUS.BAD_REQUEST,
//     message,
//     error: error.message,
//     field: error.field,
//     code: error.code,
//   };
// };

// export const errorHandler: ErrorRequestHandler = (err, req, res, next): any => {
//   console.error("Error occurred on PATH", req.path, "Error:", err);

//   // In dev show stack for easier debugging
//   if (process.env.NODE_ENV === "development") {
//     console.error(err?.stack ?? err);
//   }

//   if (err instanceof ZodError) {
//     return formatZodError(err, res);
//   }

//   if (err instanceof MulterError) {
//     const { status, message, error, field, code } = handleMulterError(err);
//     return res.status(status).json({
//       message,
//       error,
//       errorCode: ErrorCodeEnum.FILE_UPLOAD_ERROR,
//       field,
//       code,
//     });
//   }

//   if (err instanceof AppError) {
//     // AppError may expose either errorcode or errorCode; normalize
//     const normalizedErrorCode =
//       (err as any).errorCode ?? (err as any).errorcode ?? ErrorCodeEnum.INTERNAL_SERVER_ERROR;
//     return res.status(err.statusCode).json({
//       message: err.message,
//       errorCode: normalizedErrorCode,
//     });
//   }

//   return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
//     message: "Internal Server Error",
//     error: err?.message || "Unknown error occurred",
//     errorCode: ErrorCodeEnum.INTERNAL_SERVER_ERROR,
//   });
// };

