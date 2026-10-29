import * as utils from './util';

describe('formatBytesAsUnit', () => {
  it('converts bytes to specified unit', () => {
    expect(utils.formatBytesAsUnit(1_234_567, 'MB', 2)).toBe(1.18);
  });
});

describe('formatBytes', () => {
  it('returns 0 B for values under one byte', () => {
    expect(utils.formatBytes(0.5)).toBe('0 B');
  });

  it('formats byte values for one and above', () => {
    expect(utils.formatBytes(1)).toBe('1 B');
    expect(utils.formatBytes(1_024)).toBe('1 KB');
  });
});

describe('formatSeconds', () => {
  it('formats durations of less than an hour', () => {
    expect(utils.formatSeconds(30)).toBe('00:30');
    expect(utils.formatSeconds(210)).toBe('03:30');
    expect(utils.formatSeconds(3_599)).toBe('59:59');
  });

  it('formats durations of an hour or more', () => {
    expect(utils.formatSeconds(3_600)).toBe('01:00:00');
    expect(utils.formatSeconds(3_661)).toBe('01:01:01');
  });

  it('returns an empty string for undefined durations', () => {
    expect(utils.formatSeconds(undefined)).toBe('');
  });

  it('is not affected by a time zone name that contains a colon', () => {
    // browsers can render the time zone as 'GMT+01:00', which contains a ':'
    const spy = jest
      .spyOn(Date.prototype, 'toTimeString')
      .mockImplementation(() => '00:03:30 GMT+0100 (GMT+01:00)');

    try {
      expect(utils.formatSeconds(210)).toBe('03:30');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('getFileExtension', () => {
  it('returns the lower case extension of the file', () => {
    expect(utils.getFileExtension('\\music\\song.mp3')).toBe('mp3');
    expect(utils.getFileExtension('\\music\\song.MP3')).toBe('mp3');
    expect(utils.getFileExtension('/music/song.FLAC')).toBe('flac');
  });

  it('returns an empty string when there is no extension', () => {
    expect(utils.getFileExtension('\\music\\song')).toBe('');
    expect(utils.getFileExtension('\\music\\.hidden')).toBe('');
    expect(utils.getFileExtension('\\music\\song.')).toBe('');
    expect(utils.getFileExtension('')).toBe('');
    expect(utils.getFileExtension(undefined)).toBe('');
  });

  it('uses the last extension in the file name', () => {
    expect(utils.getFileExtension('\\music\\song.mp3.txt')).toBe('txt');
  });
});

describe('formatBitrate', () => {
  it('formats lossy files with their bitrate', () => {
    expect(utils.formatBitrate({ bitRate: 320 })).toBe('320 kbps');
  });

  it('includes the encoding when it is known', () => {
    expect(
      utils.formatBitrate({ bitRate: 320, isVariableBitRate: false }),
    ).toBe('320 kbps CBR');
    expect(utils.formatBitrate({ bitRate: 320, isVariableBitRate: true })).toBe(
      '320 kbps VBR',
    );
  });

  it('describes lossless files with their bit depth and sample rate', () => {
    expect(utils.formatBitrate({ bitDepth: 16, sampleRate: 44_100 })).toBe(
      '16 bit / 44.1 kHz',
    );
  });

  it('returns an empty string when there is no bitrate', () => {
    expect(utils.formatBitrate({})).toBe('');
  });
});
