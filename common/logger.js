const pino = require('pino');

const logger = pino({
    transport: {
        target: 'pino-pretty', // Enables pretty-printing
        options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss"
        }
    },
    level: 'error' // Set log level (trace, debug, info, warn, error, fatal)
});


// // Create a Pino logger instance with stdout/stderr logging
// const logger = pino({
//     // level: 'debug', // Set log level to 'debug' to capture all logs
//     // prettyPrint: {
//     //     translateTime: 'SYS:standard', // Optional: Human-readable timestamps
//     //     ignore: 'pid,hostname' // Optional: omit PID and hostname from logs
//     // }
// });

module.exports = logger;