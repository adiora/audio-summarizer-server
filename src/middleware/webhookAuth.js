import crypto from 'crypto';
import config from '../config/index.js';

export const webhookAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(config.webhookSecret);

    if (tokenBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(tokenBuffer, secretBuffer)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
