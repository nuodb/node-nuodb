const pino = require('pino');

const fileTransport = pino.transport({
  target: 'pino/file',
  options: {
    //destination: process.env.NUODB_NODEJS_LOG || `${__dirname}/nuodb_nodejs.log`
    destination: process.env.NUODB_NODEJS_LOG || ''
  },
});

module.exports = pino({
  enabled: (process.env.PINO_LOG_ENABLED && (process.env.PINO_LOG_ENABLED == 'true' || process.env.PINO_LOG_ENABLED == '1')) || false ,
  //enabled: process.env.PINO_LOG_ENABLED == 'true' || process.env.PINO_LOG_ENABLED == '1',
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
