import { NextFunction, Request, RequestHandler, Response } from "express";

export const optionalAuth = (authenticate: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // No auth header: continue as guest
    if (!token) return next();

    // Auth header exists: enforce normal auth flow
    return authenticate(req, res, next);
  };
};
