import axios from 'axios';
import * as app from './app';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

axiosMock.get.mockImplementation((url, config) => {
  let data: object | undefined;

  if (url === 'https://example.com/races') {
    if (config?.params.date === '2023-01-05') {
      data = [{
        id: '2023010510601', date: '2023-01-05', courseid: '106', coursename: '中山', racenumber: 1, racename: 'サラ系３歳　未勝利',
      }];
    } else if (config?.params.date === '1980-01-01') {
      data = { message: 'BadDate' };
    } else if (config?.params.date === '1981-01-01') {
      data = [{
        id: '1981010110601', date: '1981-01-01', courseid: '106', coursename: '中山', racenumber: 1, racename: 'サラ系３歳　未勝利',
      }];
    } else {
      data = [];
    }
  } else if (url === 'https://example.com/races/2023010510601/detail') {
    data = {
      raceinfo: {
        id: '2023010510601', date: '2023-01-05', courseid: '106', coursename: '中山', racenumber: 1, racename: 'サラ系３歳　未勝利',
      },
      horses: [
        {
          bracketnumber: 1, horsenumber: 1, horseid: '0123456789', horsename: '馬名1',
        },
      ],
    };
  } else if (url === 'https://example.com/races/1981010110601/detail') {
    data = { message: 'BadDate' };
  }

  return Promise.resolve({ data, config: { url } });
});

const logger = { error: jest.fn() };

describe('lambda/jbis_entry/app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('entryPoint', async () => {
    const event = {
      time: '2023-01-04T21:00:00Z',
      keibaApiUrl: 'https://example.com',
      horses: [
        {
          jbis: {
            horseId: '0123456789',
          },
        },
      ],
    };

    app.setLogger(logger);
    const result = await app.entryPoint(event);
    expect(result).toEqual({ message: '出走予定\n 2023-01-05 中山1R サラ系３歳　未勝利\n  馬名1' });
    expect(logger.error).not.toBeCalled();
  });

  it('entryPoint: event.horsesにjbis用情報がない', async () => {
    const event = {
      time: '2023-01-04T21:00:00Z',
      keibaApiUrl: 'https://example.com',
      horses: [{}],
    };

    app.setLogger(logger);
    const result = await app.entryPoint(event);
    expect(result).toEqual({ message: null });
    expect(logger.error).not.toBeCalled();
  });

  it('entryPoint: bad event type', async () => {
    app.setLogger(logger);
    await expect(app.entryPoint({})).rejects.toThrow();
    expect(logger.error).toBeCalled();
  });

  it('entryPoint: bad event time', async () => {
    const event = {
      time: '2023-01-04T21:00:00Y',
      keibaApiUrl: 'https://example.com',
      horses: [
        {
          jbis: {
            horseId: '0123456789',
          },
        },
      ],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toBeCalled();
  });

  it('entryPoint: bad races api response', async () => {
    const event = {
      time: '1980-01-01T00:00:00Z',
      keibaApiUrl: 'https://example.com',
      horses: [
        {
          jbis: {
            horseId: '0123456789',
          },
        },
      ],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toBeCalled();
  });

  it('entryPoint: bad racedetail api response', async () => {
    const event = {
      time: '1981-01-01T00:00:00Z',
      keibaApiUrl: 'https://example.com',
      horses: [
        {
          jbis: {
            horseId: '0123456789',
          },
        },
      ],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toBeCalled();
  });
});
