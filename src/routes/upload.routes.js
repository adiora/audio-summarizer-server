import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, bucketName } from '../config/r2.js';
import { query } from '../config/db.js';

const router = Router();

router.post('/presign', async (req, res, next) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!contentType || !contentType.startsWith('audio/')) {
      return res.status(400).json({ error: 'Invalid contentType, must be audio/*' });
    }

    const id = uuidv4();
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
    const { rows } = await query('SELECT * FROM uploads WHERE id = $1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
