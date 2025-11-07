import type { Request, Response } from "express";

export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode = 200,
  meta?: object,
) => {
  const req = res.req as Request;
  return res.status(statusCode).json({
    status: "success",
    message,
    ...(data !== null && { data }),
    ...(meta ? { meta } : {}),
    ...(req?.requestId && { requestId: req.requestId }),
  });
};

export const sendError = (
  res: Response,
  message: string | object,
  statusCode = 400,
  errors: any[] | null = null,
) => {
  const req = res.req as Request;
  return res.status(statusCode).json({
    status: "error",
    message,
    ...(errors && { errors }),
    ...(req?.requestId && { requestId: req.requestId }),
  });
};
