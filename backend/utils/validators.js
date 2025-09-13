// utils/validators.js
import validator from "validator";
import Joi from "joi";

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  return validator.isEmail(email || "", { allow_utf8_local_part: false });
};

/**
 * Validate password strength
 * Requirements:
 * - Min 8 characters
 * - At least 1 uppercase, 1 lowercase
 * - At least 1 number
 * - At least 1 special character
 */
export const isStrongPassword = (password) => {
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]).{8,}$/;
  return strongPasswordRegex.test(password || "");
};

/**
 * Validate phone number (supports international format)
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  return validator.isMobilePhone(phone || "", "any");
};

/**
 * Validate Date of Birth (must be at least 13 years old)
 * @param {string|Date} dob
 * @returns {boolean}
 */
export const isValidDOB = (dob) => {
  if (!dob) return false;
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 13; // Minimum age 13
};

/**
 * Validate URL
 * @param {string} url
 * @returns {boolean}
 */
export const isValidURL = (url) => {
  return validator.isURL(url || "", { require_protocol: true });
};

/**
 * Sanitize string input to prevent XSS/NoSQL injection
 * @param {string} str
 * @returns {string}
 */
export const sanitize = (str) => {
  return validator.escape(str || "").trim();
};

/**
 * Joi schemas for reusable route validation
 */
export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(50)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]).{8,}$/)
    .message(
      "Password must be min 8 chars, include uppercase, lowercase, number & special char"
    )
    .required(),
  phoneNumber: Joi.string().custom((value, helpers) => {
    if (!isValidPhone(value)) return helpers.error("any.invalid");
    return value;
  }, "Phone validation"),
  dob: Joi.date().custom((value, helpers) => {
    if (!isValidDOB(value)) return helpers.error("any.invalid");
    return value;
  }, "DOB validation"),
  profilePicture: Joi.string().uri().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
