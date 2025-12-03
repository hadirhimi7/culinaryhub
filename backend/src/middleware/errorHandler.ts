import { Request, Response, NextFunction } from 'express';
import { securityLogger } from './logging';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  securityLogger.error('server_error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const status = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(status).json({
    error: 'Internal server error',
  });
}


