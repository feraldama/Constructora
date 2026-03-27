import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================================================
// INTERFAZ DEL STORAGE
// ============================================================================

export interface UploadResult {
  fileUrl: string;
  filePath: string; // clave interna (key de S3 o path relativo local)
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface StorageDriver {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
  getSignedUrl?(filePath: string, expiresIn?: number): Promise<string>;
}

// ============================================================================
// LOCAL DRIVER (MVP)
// ============================================================================

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

const localDriver: StorageDriver = {
  async upload(file, folder) {
    const dir = path.join(UPLOAD_DIR, folder);
    ensureDir(dir);

    const safeName = generateFileName(file.originalname);
    const filePath = path.join(folder, safeName);
    const fullPath = path.join(UPLOAD_DIR, filePath);

    fs.writeFileSync(fullPath, file.buffer);

    return {
      fileUrl: `/uploads/${filePath.replace(/\\/g, "/")}`,
      filePath,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  },

  async delete(filePath) {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  },
};

// ============================================================================
// S3 DRIVER
// ============================================================================

function createS3Driver(): StorageDriver {
  const client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  const bucket = process.env.S3_BUCKET || "buildcontrol-uploads";

  return {
    async upload(file, folder) {
      const safeName = generateFileName(file.originalname);
      const key = `${folder}/${safeName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: `inline; filename="${file.originalname}"`,
        })
      );

      return {
        fileUrl: `https://${bucket}.s3.amazonaws.com/${key}`,
        filePath: key,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    },

    async delete(filePath) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: filePath })
      );
    },

    async getSignedUrl(filePath, expiresIn = 3600) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: filePath });
      return getSignedUrl(client, command, { expiresIn });
    },
  };
}

// ============================================================================
// EXPORT — selección por env var
// ============================================================================

const driver = process.env.STORAGE_DRIVER === "s3" ? createS3Driver() : localDriver;

export const storage = driver;
