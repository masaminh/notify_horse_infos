import 'source-map-support/register'
import middy from '@middy/core'
import { Logger } from '@aws-lambda-powertools/logger'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import * as app from './app'

const serviceName = 'notify_horse_infos'

const logger = new Logger({
  logLevel: 'INFO',
  serviceName,
})

const tracer = new Tracer({ serviceName })

app.setLogger(logger)
export const handler = middy()
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .handler(app.entryPoint)
