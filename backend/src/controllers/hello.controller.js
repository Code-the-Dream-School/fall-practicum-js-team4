// Simple controller example
const getHello = (req, res) => {
  res.json({
    message: "Hello World",
  });
};

module.exports = { getHello };
