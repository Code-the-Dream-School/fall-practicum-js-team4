const reportService = require("../services/report.service");

const createReport = async (req, res) => {
  const report = await reportService.createReport(req.user.id, req.body);
  res.status(201).json({
    success: true,
    data: report,
  });
};

const getMyReports = async (req, res) => {
  const reports = await reportService.getUserReports(req.user.id, req.query);
  // total counts the reports returned, so with a search it's the number of matches
  res.json({ success: true, data: { total: reports.length, reports } });
};

module.exports = {
  createReport,
  getMyReports,
};
