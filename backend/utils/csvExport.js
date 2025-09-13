// utils/csvExport.js
import { Parser } from "json2csv";
import fs from "fs";
import path from "path";
import { createLogger, transports, format } from "winston";

// -----------------------------
// Winston Logger
// -----------------------------
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [new transports.Console()],
});

/**
 * Export JSON data to CSV file
 * @param {Array<Object>} data - Array of JSON objects
 * @param {String} fileName - Base file name (default: export)
 * @param {String} folderPath - Folder to save CSV (default: exports)
 * @param {Array<String>} headers - Optional array of headers/columns
 * @returns {String} Full path of saved CSV file
 */
export const exportToCSV = (data, fileName = "export", folderPath = "exports", headers = null) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No data provided for CSV export");
    }

    // Ensure export folder exists
    const exportDir = path.resolve(folderPath);
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    // Flatten nested objects
    const flattenData = data.map(item => {
      const flat = {};
      const flatten = (obj, parent = "") => {
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            flatten(obj[key], parent ? `${parent}_${key}` : key);
          } else {
            flat[parent ? `${parent}_${key}` : key] = obj[key];
          }
        }
      };
      flatten(item);
      return flat;
    });

    // JSON2CSV parser options
    const parser = new Parser({ fields: headers || Object.keys(flattenData[0]), flatten: true });
    const csv = parser.parse(flattenData);

    // Timestamped file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fullFileName = `${fileName}_${timestamp}.csv`;
    const filePath = path.join(exportDir, fullFileName);

    // Write CSV
    fs.writeFileSync(filePath, csv);

    logger.info(`✅ CSV exported successfully: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.error("❌ CSV Export Error: " + err.message);
    throw err;
  }
};

/**
 * Optionally: Return CSV as string (for download via API)
 * @param {Array<Object>} data
 * @param {Array<String>} headers
 * @returns {String} CSV string
 */
export const getCSVString = (data, headers = null) => {
  try {
    const parser = new Parser({ fields: headers || Object.keys(data[0] || {}), flatten: true });
    return parser.parse(data);
  } catch (err) {
    logger.error("❌ CSV String Conversion Error: " + err.message);
    throw err;
  }
};
