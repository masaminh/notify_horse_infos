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

const RaceInfoValidator = t.type({
  id: t.string,
  date: t.string,
  courseid: t.string,
  coursename: t.string,
  racenumber: t.number,
  racename: t.string,
});

const RacesApiResponseValidator = t.array(
  RaceInfoValidator,
);

type RacesApiResponseType = t.TypeOf<typeof RacesApiResponseValidator>;

function isRacesApiResponseType(arg: unknown): arg is RacesApiResponseType {
  const v = RacesApiResponseValidator.decode(arg);

  if (e.isLeft(v)) {
    throw new Error(`RacesApiResponse: bad type: ${JSON.stringify(reporter.report(v))}`);
  }

  return true;
}

const RaceDetailApiResponseValidator = t.type({
  raceinfo: RaceInfoValidator,
  horses: t.array(t.type({
    bracketnumber: t.union([t.number, t.undefined]),
    horsenumber: t.union([t.number, t.undefined]),
    horseid: t.string,
    horsename: t.string,
  })),
});

type RaceDetailApiResponseType = t.TypeOf<typeof RaceDetailApiResponseValidator>;

function isRaceDetailApiResponseType(
  arg: unknown,
  errorDetail: object,
): arg is RaceDetailApiResponseType {
  const v = RaceDetailApiResponseValidator.decode(arg);

  if (e.isLeft(v)) {
    const report = JSON.stringify(reporter.report(v));
    const detail = JSON.stringify(errorDetail);
    throw new Error(`RaceDetailApiResponse: bad type: ${report}, ${detail}`);
  }

  return true;
}

function getRange(start: number, end: number): number[] {
  return [...Array(end - start)].map((_, i) => (i + start));
}

export async function entryPoint(event: unknown): Promise<ResultType> {
  try {
    if (!isEventType(event)) {
      /* istanbul ignore next */
      throw new Error();
    }

    const horseIdSet = new Set(event.horses.flatMap((h) => {
      if (h.jbis == null) {
        return [];
      }
      return [h.jbis.horseId];
    }));

    const eventDateTime = Utilities.getDateTime(event.time).setZone('Asia/Tokyo');
    const raceApiPromises = getRange(0, 7).map((i) => {
      const dateString = eventDateTime.plus({ days: i }).toISODate();
      const apiUrl = new URL('races', event.keibaApiUrl);
      return axios.get(apiUrl.toString(), { params: { date: dateString } });
    });

    const racesResponses = await Promise.all(raceApiPromises);

    const raceIds = racesResponses.flatMap((r) => {
      const raceInfos = r.data;
      if (isRacesApiResponseType(raceInfos)) {
        return raceInfos.map((race) => (race.id));
      }

      /* istanbul ignore next */
      return [];
    });

    const detailApiPromises = raceIds.map((raceid) => {
      const apiUrl = new URL(`races/${raceid}/detail`, event.keibaApiUrl);
      return axios.get(apiUrl.toString());
    });

    const detailResponses = await Promise.all(detailApiPromises);

    const raceDetails = detailResponses.flatMap((r) => {
      const raceDetail = r.data;
      if (isRaceDetailApiResponseType(raceDetail, { url: r.config.url })) {
        return [raceDetail];
      }

      /* istanbul ignore next */
      return [];
    });

    const entries = raceDetails.flatMap((r) => {
      const horseNames = r.horses.flatMap((h) => (horseIdSet.has(h.horseid) ? [h.horsename] : []));

      if (horseNames.length === 0) {
        return [];
      }

      return {
        date: r.raceinfo.date,
        courseName: r.raceinfo.coursename,
        raceNumber: r.raceinfo.racenumber,
        raceName: r.raceinfo.racename,
        horseNames,
      };
    });

    if (entries.length === 0) {
      return { message: null };
    }

    const raceEntryStrings = entries.map((x) => {
      const horseNamesStr = x.horseNames.map((n) => (`  ${n}`));
      return ` ${x.date} ${x.courseName}${x.raceNumber}R ${x.raceName}\n${horseNamesStr.join('\n')}`;
    });
    const message = `出走予定\n${raceEntryStrings.join('\n')}`;

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
