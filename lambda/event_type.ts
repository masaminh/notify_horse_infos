import * as t from 'io-ts'
import * as e from 'fp-ts/Either'
import reporter from 'io-ts-reporters'

const EventValidator = t.type({
  time: t.string,
  urlParameters: t.array(
    t.type({
      Value: t.string,
    })
  ),
  horses: t.array(
    t.type({
      horseName: t.union([t.undefined, t.string]),
      jbis: t.union([
        t.undefined,
        t.type({
          horseId: t.string,
        }),
      ]),
    })
  ),
})

export type EventType = t.TypeOf<typeof EventValidator>

export function isEventType (arg: unknown): arg is EventType {
  const v = EventValidator.decode(arg)

  if (e.isLeft(v)) {
    throw new Error(`event: bad type: ${JSON.stringify(reporter.report(v))}`)
  }

  return true
}
