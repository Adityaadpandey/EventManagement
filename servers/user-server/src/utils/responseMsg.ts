import { Response } from "express";

export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode: number = 200,
) => {
  return res.status(statusCode).json({
    status: "success",
    message,
    ...(data !== null && { data }),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors: any[] | null = null,
) => {
  return res.status(statusCode).json({
    status: "error",
    message,
    ...(errors && { errors }),
  });
};
