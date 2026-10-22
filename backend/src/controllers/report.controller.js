const reportService = require("../services/report.service");

const createReport = async (req, res) => {
  const report = await reportService.createReport(req.user.id, req.body);
  res.status(201).json({
    success: true,
    data: report,
  });
};

module.exports = {
  createReport,
};
