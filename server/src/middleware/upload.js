import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../utils/httpError.js';

const ALLOWED = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/octet-stream', // some browsers send this for .xls/.csv
  'text/plain',
]);

// Keep the file in memory so the storage driver decides where it lands
// (local disk now, cloud bucket later) without a temp-file dance.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    return cb(badRequest(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOC, DOCX, XLSX, XLS, CSV, TXT.`));
  },
});

export default upload;
