import type { Request, Response } from "express";

// Simple controller example
export const getHello = (req: Request, res: Response) => {
  res.json({
    message: "Hello World",
  });
};
