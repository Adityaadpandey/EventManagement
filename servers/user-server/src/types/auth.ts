import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    name?: string;
    role: string;
    phone?: string;
    phoneVerified?: boolean;
    emailVerified?: boolean;
  };
}

export interface JwtPayload {
  userId: string;
}
