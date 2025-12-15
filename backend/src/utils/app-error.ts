import { ErrorCodeEnum, type ErrorCodeENUMType } from '../enums/error-code.enum.js';
import { HTTPSTATUS, type HttpStatusCodeType } from '../config/http.config.js';


export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: HttpStatusCodeType = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    public errorcode?: ErrorCodeENUMType
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class HttpException extends AppError {
  constructor(
    statusCode: HttpStatusCodeType,
    message: string = "HTTP Exception Error",
    errorcode?: ErrorCodeENUMType
  ) {
    super(message, statusCode, errorcode);
  }
}

export class NotFoundException extends AppError {
  constructor(message = "Resource not found", errorcode?: ErrorCodeENUMType) {
    super(
      message,
      HTTPSTATUS.NOT_FOUND,
      errorcode || ErrorCodeEnum.RESOURCE_NOT_FOUND
    );
  }
}

export class BadRequestException extends AppError {
  constructor(message = "Bad Request", errorcode?: ErrorCodeENUMType) {
    super(
      message,
      HTTPSTATUS.BAD_REQUEST,
      errorcode || ErrorCodeEnum.VALIDATION_ERROR
    );
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized Access", errorcode?: ErrorCodeENUMType) {
    super(
      message,
      HTTPSTATUS.UNAUTHORIZED,
      errorcode || ErrorCodeEnum.ACCESS_UNAUTHORIZED
    );
  }
}

export class InternalServerException extends AppError {
  constructor(message = "Internal Server Error", errorcode?: ErrorCodeENUMType) {
    super(
      message,
      HTTPSTATUS.INTERNAL_SERVER_ERROR,
      errorcode || ErrorCodeEnum.INTERNAL_SERVER_ERROR
    );
  }
}

