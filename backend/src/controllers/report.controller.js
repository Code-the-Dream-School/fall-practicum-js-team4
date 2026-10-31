const reportService = require("../services/report.service");

const createReport = async (req, res) => {
  const report = await reportService.createReport(req.user.id, req.body);
  res.status(201).json({
    success: true,
    data: report,
  });
};

const getMyReports = async (req, res) => {
  const reports = await reportService.getMyReports(req.user.id);
  res.status(200).json({
    success: true,
    data: reports,
  });
};

module.exports = {
  createReport,
  getMyReports,
};
