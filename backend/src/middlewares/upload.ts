import multer from "multer";

const MAX_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB) || 10;

const ALLOWED_MIMES = [
  // Imágenes
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Comprimidos
  "application/zip",
  "application/x-rar-compressed",
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});
