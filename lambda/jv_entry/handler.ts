import 'source-map-support/register';
import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import * as app from './app';

const logger = new Logger({
  logLevel: 'INFO',
  serviceName: 'notify_horse_infos',
});

app.setLogger(logger);
// eslint-disable-next-line import/prefer-default-export
export const handler = middy(app.entryPoint).use(injectLambdaContext(logger));
