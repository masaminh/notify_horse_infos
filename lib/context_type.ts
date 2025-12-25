import * as t from 'io-ts'
import * as e from 'fp-ts/Either'
import reporter from 'io-ts-reporters'

const ContextValidator = t.type({
  stackName: t.string,
  horsesJsonBucket: t.string,
  horsesJsonKey: t.string,
  webhookName: t.string,
  queueArn: t.string,
  apiUrlParameters: t.array(t.string),
})

export type ContextType = t.TypeOf<typeof ContextValidator>

export function isContextType (arg: unknown): arg is ContextType {
  const v = ContextValidator.decode(arg)

  if (e.isLeft(v)) {
    throw new Error(`context: bad type: ${JSON.stringify(reporter.report(v))}`)
  }

  return true
}
