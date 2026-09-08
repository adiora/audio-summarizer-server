import { Router } from 'express';
import { query } from '../config/db.js';
import { webhookAuth } from '../middleware/webhookAuth.js';

const router = Router();

router.post('/r2-upload', webhookAuth, async (req, res, next) => {
  try {
    const { key, size, action } = req.body;
    
    if (action !== 'PutObject') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { rows } = await query(
      'UPDATE uploads SET status = $1, file_size = $2, uploaded_at = NOW() WHERE r2_key = $3 RETURNING id',
      ['uploaded', size, key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.status(200).json({ message: 'Upload confirmed', uploadId: rows[0].id });
  } catch (error) {
    next(error);
  }
});

export default router;
