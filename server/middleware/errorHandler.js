// Error-handling middleware — place after all routes in server.js
const errorHandler = (err, req, res, next) => {
  const status = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({ message: err.message });
};

export default errorHandler;
