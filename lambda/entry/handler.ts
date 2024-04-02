import 'source-map-support/register';
import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import * as app from './app';

const serviceName = 'notify_horse_infos';

const logger = new Logger({
  logLevel: 'INFO',
  serviceName,
});

const tracer = new Tracer({ serviceName });

app.setLogger(logger);
// eslint-disable-next-line import/prefer-default-export
export const handler = middy(app.entryPoint)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer));
