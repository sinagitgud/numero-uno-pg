import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';

export const uploadRoutes = Router();

// Use memory storage — files are uploaded directly to Cloudflare R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WebP, PDF allowed.'));
    }
  },
});

/**
 * POST /api/upload/aadhaar
 * Upload Aadhaar card image to R2.
 * Returns the URL and triggers OCR extraction.
 */
uploadRoutes.post('/aadhaar', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    // TODO: Phase 2 — upload to Cloudflare R2 and call Claude Vision API for OCR
    // Placeholder response for Phase 1 scaffolding
    return res.json({
      success: true,
      data: {
        url: 'https://placeholder-r2-url.example.com/aadhaar.jpg',
        message: 'File upload and OCR will be implemented in Phase 2',
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * POST /api/upload/receipt
 * Upload expense receipt image.
 */
uploadRoutes.post('/receipt', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    // TODO: Phase 2 — upload to Cloudflare R2
    return res.json({
      success: true,
      data: { url: 'https://placeholder-r2-url.example.com/receipt.jpg' },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});
