import type { Request, Response } from "express";
import * as reportService from "../services/report.service";
import type { MyReportsQuery, ReportIdParam } from "../validators/report.validators";

// All routes here use requireAuth, so req.user is always set

export const createReport = async (req: Request, res: Response) => {
  const report = await reportService.createReport(req.user!.id, req.body);
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

export const updateReport = async (req: Request, res: Response) => {
  const { id } = req.params as unknown as ReportIdParam;
  const report = await reportService.updateReport(req.user!.id, id, req.body);
  res.json({
    success: true,
    data: report,
  });
};
