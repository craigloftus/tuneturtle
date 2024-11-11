import { Express, Request, Response, NextFunction } from "express";

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url } = req;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - Started`);

  // Log response after completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

// CORS middleware for audio streaming
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Disposition');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
};

export function registerRoutes(app: Express) {
  app.use('/api', requestLogger);
  app.use('/api', corsMiddleware);
}