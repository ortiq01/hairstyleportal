const pino = require('pino');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization'],
});

const httpLogger = pinoHttp({
  logger,
  genReqId: function (req) {
    return req.headers['x-request-id'] || randomUUID();
  },
  customSuccessMessage: function () {
    return 'request completed';
  },
  customErrorMessage: function () {
    return 'request errored';
  },
});

module.exports = { logger, httpLogger };
