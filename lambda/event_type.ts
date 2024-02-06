import * as t from 'io-ts';
import * as e from 'fp-ts/Either';
import reporter from 'io-ts-reporters';

const EventValidator = t.type({
  time: t.string,
  jvApiUrl: t.string,
  horses: t.array(
    t.type({
      jbis: t.union([
        t.undefined,
        t.type({
          horseId: t.string,
        }),
      ]),
      jv: t.union([
        t.undefined,
        t.type({
          horseName: t.string,
        }),
      ]),
    }),
  ),
});

export type EventType = t.TypeOf<typeof EventValidator>;

export function isEventType(arg: unknown): arg is EventType {
  const v = EventValidator.decode(arg);

  if (e.isLeft(v)) {
    throw new Error(`event: bad type: ${JSON.stringify(reporter.report(v))}`);
  }

  return true;
}
