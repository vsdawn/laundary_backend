const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { jwt: jwtConfig } = require("../config/env");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized());

  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { authenticate, authorize };
