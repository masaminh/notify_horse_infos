import axios from 'axios';
import * as t from 'io-ts';
import * as e from 'fp-ts/Either';
import reporter from 'io-ts-reporters';
import { isEventType } from '../event_type';
import { ResultType } from '../result_type';
import * as Utilities from '../utilities';

interface Logger {
  error: (message: string) => void,
}

let logger: Logger | undefined;

export function setLogger(logger_: Logger): void {
  logger = logger_;
}

const RaceidsApiResponseValidator = t.type({
  date: t.string,
  raceids: t.array(t.string),
});

type RaceidsApiResponseType = t.TypeOf<typeof RaceidsApiResponseValidator>;

function isRaceidsApiResponseType(arg: unknown): arg is RaceidsApiResponseType {
  const v = RaceidsApiResponseValidator.decode(arg);

  if (e.isLeft(v)) {
    throw new Error(`RacesApiResponse: bad type: ${JSON.stringify(reporter.report(v))}`);
  }

  return true;
}

const RacesApiResponseValidator = t.type({
  date: t.string,
  place: t.string,
  raceNumber: t.number,
  raceName: t.string,
  horses: t.array(t.type({
    horseName: t.string,
  })),
});

type RacesApiResponseType = t.TypeOf<typeof RacesApiResponseValidator>;

function isRacesApiResponseType(
  arg: unknown,
  errorDetail: object,
): arg is RacesApiResponseType {
  const v = RacesApiResponseValidator.decode(arg);

  if (e.isLeft(v)) {
    const report = JSON.stringify(reporter.report(v));
    const detail = JSON.stringify(errorDetail);
    throw new Error(`RacesApiResponse: bad type: ${report}, ${detail}`);
  }

  return true;
}

function getRange(start: number, end: number): number[] {
  return [...Array(end - start)].map((_, i) => (i + start));
}

function getEntries(raceDetails: RacesApiResponseType[], horseNameSet: Set<string>) {
  return raceDetails.flatMap((r) => {
    const horseNames = r.horses.flatMap(
      (h) => (horseNameSet.has(h.horseName) ? [h.horseName] : []),
    );

    if (horseNames.length === 0) {
      return [];
    }

    return {
      date: r.date,
      courseName: r.place,
      raceNumber: r.raceNumber,
      raceName: r.raceName,
      horseNames,
    };
  });
}

function toHalfWidth(str: string): string {
  return str
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replaceAll('　', ' ');
}

export async function entryPoint(event: unknown): Promise<ResultType> {
  try {
    if (!isEventType(event)) {
      /* istanbul ignore next */
      throw new Error();
    }

    const horseNameSet = new Set(event.horses.flatMap((h) => {
      if (h.jv == null) {
        return [];
      }
      return [h.jv.horseName];
    }));

    const eventDateTime = Utilities.getDateTime(event.time).setZone('Asia/Tokyo');
    const raceidsApiPromises = getRange(0, 7).map((i) => {
      const dateString = eventDateTime.plus({ days: i }).toISODate();
      const apiUrl = new URL('raceids', event.jvApiUrl);
      return axios.get(apiUrl.toString(), { params: { date: dateString } });
    });

    const raceidsResponses = await Promise.all(raceidsApiPromises);

    const raceIds = raceidsResponses.flatMap((r) => {
      const raceInfos = r.data;
      if (isRaceidsApiResponseType(raceInfos)) {
        return raceInfos.raceids;
      }

      /* istanbul ignore next */
      return [];
    });

    const racesApiPromises = raceIds.map((raceid) => {
      const apiUrl = new URL(`races/${raceid}`, event.jvApiUrl);
      return axios.get(apiUrl.toString());
    });

    const racesResponses = await Promise.all(racesApiPromises);

    const raceDetails = racesResponses.flatMap((r) => {
      const raceDetail = r.data;
      if (isRacesApiResponseType(raceDetail, { url: r.config.url })) {
        return [raceDetail];
      }

      /* istanbul ignore next */
      return [];
    });

    const entries = getEntries(raceDetails, horseNameSet);

    if (entries.length === 0) {
      return { message: null };
    }

    const raceEntryStrings = entries.map((x) => {
      const horseNamesStr = x.horseNames.map((n) => (`  ${n}`));
      return ` ${x.date} ${x.courseName}${x.raceNumber}R ${x.raceName}\n${horseNamesStr.join('\n')}`;
    });
    const message = toHalfWidth(`出走予定\n${raceEntryStrings.join('\n')}`);

    return {
      message,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger?.error(err.message);
    }

    throw err;
  }
}
