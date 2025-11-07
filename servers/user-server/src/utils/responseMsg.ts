import type { Response } from "express";

export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode = 200,
  meta?: object,
) => {
  return res.status(statusCode).json({
    status: "success",
    message,
    ...(data !== null && { data }),
    ...(meta ? { meta } : {}),
  });
};

export const sendError = (
  res: Response,
  message: string | object,
  statusCode = 400,
  errors: any[] | null = null,
) => {
  return res.status(statusCode).json({
    status: "error",
    message,
    ...(errors && { errors }),
  });
};
