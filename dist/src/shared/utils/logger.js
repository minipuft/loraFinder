import winston from 'winston';
const isBrowser = typeof window !== 'undefined';
let logger;
if (isBrowser) {
    // Browser-specific logger
    logger = {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
        log: console.log,
    };
}
else {
    // Node.js-specific logger using Winston
    logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'error.log', level: 'error' }),
            new winston.transports.File({ filename: 'combined.log' }),
        ],
    });
}
export default logger;
//# sourceMappingURL=logger.js.map