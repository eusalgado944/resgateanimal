import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../config.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_UPLOAD_MB = 15;
const MAX_SIDE = 1280;

// O servidor tem pouca memória (1 GB): uma imagem por vez.
sharp.concurrency(1);

fs.mkdirSync(config.uploadDir, { recursive: true });
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'resgate-upload-'));

// O original vai para uma pasta temporária; só a versão reduzida chega ao diretório público.
export const upload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (req, file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
});

export class InvalidImageError extends Error {}

// Corrige a orientação, reduz para no máximo 1280 px e grava como JPEG.
// A conversão também descarta os metadados EXIF, que podem conter a localização GPS da foto.
export async function processPhotos(files) {
  const saved = [];
  try {
    for (const file of files) {
      const filename = `${randomUUID()}.jpg`;
      try {
        await sharp(file.path)
          .rotate()
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(path.join(config.uploadDir, filename));
      } catch {
        throw new InvalidImageError(`O arquivo "${file.originalname}" não é uma imagem válida`);
      }
      saved.push(filename);
    }
    return saved;
  } catch (err) {
    saved.forEach(removeUpload);
    throw err;
  } finally {
    discardTemp(files);
  }
}

export function discardTemp(files) {
  for (const f of files) fs.promises.unlink(f.path).catch(() => {});
}

export function removeUpload(filename) {
  fs.promises.unlink(path.join(config.uploadDir, path.basename(filename))).catch(() => {});
}
