import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { apiError } from "../errors/api-error";
import { formatZodError } from "../errors/zodErrorFormatter";
import { logger } from "../utils/logger";
import { TokenExpiredError } from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let message: any;
  let statusCode: number;

  logger.info({ err }, "error");

  if (err instanceof ZodError) {
    statusCode = 400;
    message = formatZodError(err);
    return res.status(statusCode).json({ success: false, message });
  } else if (err instanceof apiError) {
    statusCode = err.statusCode;
    message = err.message;
    return res.status(statusCode).json({ success: false, message });
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = "Token expired";
    return res.status(statusCode).json({ success: false, message });
  }
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = err.message;
    return res.status(statusCode).json({ success: false, message });
  }
  else if (err instanceof multer.MulterError) {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large. Maximum allowed size is 50 MB."
        : err.message;
    return res.status(statusCode).json({ success: false, message });
  }
  else {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
