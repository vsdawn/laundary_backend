const ApiError = require("../utils/ApiError");

module.exports = (err, req, res, next) => {
  if (err.name === "CastError") err = ApiError.badRequest("Invalid ID");
  if (err.code === 11000) err = ApiError.conflict("Duplicate value");

  const status = err.statusCode || 500;
  if (status === 500) console.error(err);

  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : err.message,
    ...(err.details && { details: err.details }),
  });
};
