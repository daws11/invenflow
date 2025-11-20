import type { NextFunction, Request, Response } from "express";

export const queryMonitor = (thresholdMs = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (duration > thresholdMs) {
        console.warn(
          `[SlowQuery] ${req.method} ${req.originalUrl} took ${duration}ms (threshold ${thresholdMs}ms)`,
        );
      }
    });

    next();
  };
};

