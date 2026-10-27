import type { Request, Response } from "express";
import * as reportService from "../services/report.service";
import type { MyReportsQuery } from "../validators/report.validators";

// Both routes use requireAuth, so req.user is always set here

export const createReport = async (req: Request, res: Response) => {
  // req.files: photos from multer ([] or undefined for JSON requests)
  const report = await reportService.createReport(
    req.user!.id,
    req.body,
    (req.files as Express.Multer.File[] | undefined) ?? [],
  );
  res.status(201).json({
    success: true,
    data: report,
  });
};

export const getMyReports = async (req: Request, res: Response) => {
  // validate(myReportsQuerySchema, "query") has already checked and cleaned it
  const reports = await reportService.getUserReports(req.user!.id, req.query as MyReportsQuery);
  // total counts the reports returned, so with a search it's the number of matches
  res.json({ success: true, data: { total: reports.length, reports } });
};
