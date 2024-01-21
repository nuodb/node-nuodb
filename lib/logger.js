const pino = require('pino');

const fileTransport = pino.transport({
  target: 'pino/file',
  options: {
    destination: process.env.NUODB_NODEJS_LOG || `${__dirname}/nuodb_nodejs.log`
  },
});

module.exports = pino({
  enabled: process.env.PINO_LOG_ENABLED || false,
  level: process.env.PINO_LOG_LEVEL || 'silent',
  formatters: {
    level: (label) => {
      return {
        level: label.toUpperCase()
      };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
},
fileTransport
);
