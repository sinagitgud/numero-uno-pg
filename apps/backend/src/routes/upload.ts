import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadToR2, r2Available } from '../lib/r2';
import { extractAadhaarData, ocrAvailable } from '../lib/ocr';

export const uploadRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP, PDF allowed'));
  },
});

/**
 * POST /api/upload/aadhaar
 * Upload Aadhaar card image → store in R2 → run OCR via Claude Vision.
 * Returns { url, ocr: { name, fathersName, aadhaarNumberMasked, address, ... } }
 */
uploadRoutes.post('/aadhaar', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const url = await uploadToR2(req.file.buffer, req.file.mimetype, 'aadhaar');

    let ocrData = {};
    if (ocrAvailable && req.file.mimetype !== 'application/pdf') {
      ocrData = await extractAadhaarData(
        req.file.buffer,
        req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp',
      );
    }

    return res.json({
      success: true,
      data: {
        url,
        ocr: ocrData,
        r2Active: r2Available,
        ocrActive: ocrAvailable,
      },
    });
  } catch (err) {
    console.error('[upload/aadhaar]', err);
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * POST /api/upload/qr
 * Upload property UPI QR code image → store in R2 → return URL.
 */
uploadRoutes.post('/qr', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const url = await uploadToR2(req.file.buffer, req.file.mimetype, 'qr');
    return res.json({ success: true, data: { url, r2Active: r2Available } });
  } catch (err) {
    console.error('[upload/qr]', err);
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * POST /api/upload/receipt
 * Upload expense or payment receipt → store in R2 → return URL.
 */
uploadRoutes.post('/receipt', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const url = await uploadToR2(req.file.buffer, req.file.mimetype, 'receipts');
    return res.json({ success: true, data: { url, r2Active: r2Available } });
  } catch (err) {
    console.error('[upload/receipt]', err);
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});
