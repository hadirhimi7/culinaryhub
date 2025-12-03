import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const securityLogPath = path.join(logsDir, 'security.log');

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: securityLogPath })],
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    securityLogger.info('http_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
    });
  });
  next();
}


