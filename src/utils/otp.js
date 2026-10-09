const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateOtp = (length = 4) =>
  crypto.randomInt(10 ** (length - 1), 10 ** length).toString();

const hashOtp = (otp) => bcrypt.hash(otp, 8);
const compareOtp = (otp, hash) => bcrypt.compare(otp, hash);

module.exports = { generateOtp, hashOtp, compareOtp };
