import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, bucketName } from '../config/r2.js';
import { query } from '../config/db.js';

const presignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many upload requests, try again later' }
});

const router = Router();

router.post('/presign', presignLimiter, async (req, res, next) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!contentType || !contentType.startsWith('audio/')) {
      return res.status(400).json({ error: 'Invalid contentType, must be audio/*' });
    }

    const id = crypto.randomUUID();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `uploads/${id}/${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

    await query(
      'INSERT INTO uploads (id, original_filename, r2_key, content_type) VALUES ($1, $2, $3, $4)',
      [id, filename, r2Key, contentType]
    );

    res.status(201).json({ uploadId: id, uploadUrl, key: r2Key });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'SELECT id, original_filename, content_type, file_size, status, created_at, uploaded_at FROM uploads WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const { uploadId } = req.body;
    
    if (!uploadId || typeof uploadId !== 'string') {
      return res.status(400).json({ error: 'Invalid uploadId' });
    }

    const { rows } = await query('SELECT * FROM uploads WHERE id = $1', [uploadId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    const upload = rows[0];
    if (upload.status !== 'pending') {
      return res.status(400).json({ error: 'Upload is not in pending state' });
    }

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: upload.r2_key
      });
      const headResponse = await r2Client.send(headCommand);
      
      await query(
        'UPDATE uploads SET status = $1, file_size = $2, uploaded_at = NOW() WHERE id = $3',
        ['uploaded', headResponse.ContentLength, uploadId]
      );
      
      res.status(200).json({ message: 'Upload confirmed' });
    } catch (r2Error) {
      if (r2Error.name === 'NotFound' || r2Error.$metadata?.httpStatusCode === 404) {
         return res.status(400).json({ error: 'File not found in R2. Upload must be completed first.' });
      }
      throw r2Error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
