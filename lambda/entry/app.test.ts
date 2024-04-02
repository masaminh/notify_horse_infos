import axios from 'axios';
import * as app from './app';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

axiosMock.get.mockImplementation((url, config) => {
  let data: object | undefined;

  if (url === 'https://example.com/raceids') {
    if (config?.params.date === '2023-01-05') {
      data = { date: '2023-01-05', raceids: ['2023010510601'] };
    } else if (config?.params.date === '1980-01-01') {
      data = { message: 'BadDate' };
    } else if (config?.params.date === '1981-01-01') {
      data = { date: '1981-01-01', raceids: ['1981010110601'] };
    } else {
      data = { date: config?.params.date ?? '', raceids: [] };
    }
  } else if (url === 'https://example.com/races/2023010510601') {
    data = {
      raceId: '2023010510601',
      date: '2023-01-05',
      place: '中山',
      raceNumber: 1,
      raceName: 'サラ系３歳　未勝利',
      horses: [
        {
          horseNumber: 1, horseId: '0123456789', horseName: '馬名1',
        },
      ],
    };
  } else if (url === 'https://example.com/races/1981010110601') {
    data = { message: 'BadDate' };
  }

  return Promise.resolve({ data, config: { url } });
});

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() };

describe('lambda/entry/app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('entryPoint', async () => {
    const event = {
      time: '2023-01-04T21:00:00Z',
      urlParameters: [{ Value: 'https://example.com' }],
      horses: [{ horseName: '馬名1' }],
    };

    app.setLogger(logger);
    const result = await app.entryPoint(event);
    expect(result).toEqual({ message: '出走予定\n 2023-01-05 中山1R サラ系3歳 未勝利\n  馬名1' });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('entryPoint: event.horsesに馬名がない', async () => {
    const event = {
      time: '2023-01-04T21:00:00Z',
      urlParameters: [{ Value: 'https://example.com' }],
      horses: [{}],
    };

    app.setLogger(logger);
    const result = await app.entryPoint(event);
    expect(result).toEqual({ message: null });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('entryPoint: bad event type', async () => {
    app.setLogger(logger);
    await expect(app.entryPoint({})).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  it('entryPoint: bad event time', async () => {
    const event = {
      time: '2023-01-04T21:00:00Y',
      urlParameters: [{ Value: 'https://example.com' }],
      horses: [{ horseName: '馬名1' }],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  it('entryPoint: bad races api response', async () => {
    const event = {
      time: '1980-01-01T00:00:00Z',
      urlParameters: [{ Value: 'https://example.com' }],
      horses: [{ horseName: '馬名1' }],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  it('entryPoint: bad racedetail api response', async () => {
    const event = {
      time: '1981-01-01T00:00:00Z',
      urlParameters: [{ Value: 'https://example.com' }],
      horses: [{ horseName: '馬名1' }],
    };
    app.setLogger(logger);
    await expect(app.entryPoint(event)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });
});
