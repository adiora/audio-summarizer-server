import config from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal Server Error' 
    : err.message;
    
  res.status(statusCode).json({ error: message });
};
