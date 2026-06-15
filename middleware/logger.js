const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

const expressLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip, requestId } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 500 ? 'error' : 
                     statusCode >= 400 ? 'warn' : 'info';
    
    const logMessage = requestId 
      ? `[${requestId}] ${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`
      : `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`;
    
    logger.log(logLevel, logMessage);
  });
  
  next();
};

module.exports = { logger, expressLogger };