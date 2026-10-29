import * as search from './searches';

describe('filterResponse', () => {
  it('removes VBR files if "iscbr" is specified', () => {
    const response = {
      files: [
        { bitRate: 123, isVariableBitRate: true },
        { bitRate: 320, isVariableBitRate: false },
      ],
    };

    const filters = { isCBR: true };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ bitRate: 320, isVariableBitRate: false }],
    });
  });

  it('removes CBR files if "isvbr" is specified', () => {
    const response = {
      files: [
        { bitRate: 123, isVariableBitRate: true },
        { bitRate: 320, isVariableBitRate: false },
      ],
    };

    const filters = { isVBR: true };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ bitRate: 123, isVariableBitRate: true }],
    });
  });

  it('removes all files if "iscbr" and "isvbr" are both specified', () => {
    const response = {
      files: [{ isVariableBitrate: true }, { isVariableBitrate: false }],
    };

    const filters = { isCBR: true, isVBR: true };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [],
    });
  });

  it('removes lossy files if "islossless" is specified', () => {
    const response = {
      files: [
        { bitDepth: 16, sampleRate: 41_000 },
        { bitRate: 320, isVariableBitRate: false },
      ],
    };

    const filters = { isLossless: true };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ bitDepth: 16, sampleRate: 41_000 }],
    });
  });

  it('removes lossless files if "islossy" is specified', () => {
    const response = {
      files: [
        { bitDepth: 16, sampleRate: 41_000 },
        { bitRate: 320, isVariableBitRate: false },
      ],
    };

    const filters = { isLossy: true };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ bitRate: 320, isVariableBitRate: false }],
    });
  });

  it('removes files with bitRate less than minBitRate', () => {
    const response = {
      files: [{ bitRate: 100 }, { bitRate: 99 }],
    };

    const filters = { minBitRate: 100 };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ bitRate: 100 }],
    });
  });

  it('removes files with size less than minFileSize', () => {
    const response = {
      files: [{ size: 100 }, { size: 99 }],
    };

    const filters = { minFileSize: 100 };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ size: 100 }],
    });
  });

  it('removes files with length less than minLength', () => {
    const response = {
      files: [{ length: 100 }, { length: 99 }],
    };

    const filters = { minLength: 100 };

    expect(search.filterResponse({ filters, response })).toMatchObject({
      files: [{ length: 100 }],
    });
  });

  describe('extension filtering', () => {
    const response = {
      files: [
        { filename: '\\music\\song.mp3' },
        { filename: '\\music\\song.MP3' },
        { filename: '\\music\\song.flac' },
        { filename: '\\music\\mp3\\song.wav' },
        { filename: '\\music\\song.mp3.txt' },
        { filename: '\\music\\noextension' },
      ],
    };

    it('matches mp3 files', () => {
      const filters = { extensions: ['mp3'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [
          { filename: '\\music\\song.mp3' },
          { filename: '\\music\\song.MP3' },
        ],
      });
    });

    it('matches extensions without regard to case', () => {
      const filters = { extensions: ['FLAC'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [{ filename: '\\music\\song.flac' }],
      });
    });

    it('does not match paths that merely contain the extension', () => {
      const filters = { extensions: ['mp3'] };

      const filtered = search.filterResponse({ filters, response });

      expect(filtered.files.map((f) => f.filename)).not.toContain(
        '\\music\\mp3\\song.wav',
      );
    });

    it('does not match files whose extension merely ends with the extension', () => {
      const filters = { extensions: ['mp3'] };

      const filtered = search.filterResponse({ filters, response });

      expect(filtered.files.map((f) => f.filename)).not.toContain(
        '\\music\\song.mp3.txt',
      );
    });

    it('matches flac files', () => {
      const filters = { extensions: ['flac'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [{ filename: '\\music\\song.flac' }],
      });
    });

    it('matches multiple extensions', () => {
      const filters = { extensions: ['flac', 'wav'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [
          { filename: '\\music\\song.flac' },
          { filename: '\\music\\mp3\\song.wav' },
        ],
      });
    });

    it('matches everything when no extensions are specified', () => {
      const filters = { extensions: [] };

      expect(search.filterResponse({ filters, response }).files).toHaveLength(
        response.files.length,
      );
    });

    it('filters locked files as well', () => {
      const lockedResponse = {
        files: [{ filename: '\\music\\song.mp3' }],
        lockedFiles: [{ filename: '\\music\\song.flac' }],
      };

      const filters = { extensions: ['mp3'] };

      expect(
        search.filterResponse({ filters, response: lockedResponse }),
      ).toMatchObject({
        files: [{ filename: '\\music\\song.mp3' }],
        lockedFiles: [],
      });
    });
  });

  describe('minimum bitrate filtering', () => {
    const response = {
      files: [
        { bitRate: 320, filename: '\\music\\a.mp3' },
        { bitRate: 256, filename: '\\music\\b.mp3' },
        { bitRate: 128, filename: '\\music\\c.mp3' },
        { filename: '\\music\\d.mp3' },
      ],
    };

    it('keeps files that meet the minimum', () => {
      const filters = { minBitRate: 320 };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [{ filename: '\\music\\a.mp3' }],
      });
    });

    it('removes files with a lower bitrate', () => {
      const filters = { minBitRate: 192 };

      expect(
        search
          .filterResponse({ filters, response })
          .files.map((f) => f.filename),
      ).toEqual(['\\music\\a.mp3', '\\music\\b.mp3']);
    });

    it('removes files with no bitrate metadata', () => {
      const filters = { minBitRate: 1 };

      expect(
        search
          .filterResponse({ filters, response })
          .files.map((f) => f.filename),
      ).not.toContain('\\music\\d.mp3');
    });

    it('keeps files with no bitrate metadata when no minimum is specified', () => {
      const filters = { minBitRate: 0 };

      expect(search.filterResponse({ filters, response }).files).toHaveLength(
        4,
      );
    });
  });

  describe('exact bitrate filtering', () => {
    const response = {
      files: [
        { bitRate: 320, filename: '\\music\\a.mp3' },
        { bitRate: 256, filename: '\\music\\b.mp3' },
        { filename: '\\music\\c.mp3' },
      ],
    };

    it('keeps only files with the exact bitrate', () => {
      const filters = { bitRate: 320 };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [{ filename: '\\music\\a.mp3' }],
      });
    });

    it('removes files with no bitrate metadata', () => {
      const filters = { bitRate: 320 };

      expect(
        search
          .filterResponse({ filters, response })
          .files.map((f) => f.filename),
      ).not.toContain('\\music\\c.mp3');
    });
  });

  describe('encoding filtering', () => {
    const response = {
      files: [
        {
          bitRate: 320,
          filename: '\\music\\cbr.mp3',
          isVariableBitRate: false,
        },
        { bitRate: 320, filename: '\\music\\vbr.mp3', isVariableBitRate: true },
        { bitRate: 320, filename: '\\music\\unknown.mp3' },
        {
          bitRate: 320,
          filename: '\\music\\null.mp3',
          isVariableBitRate: null,
        },
      ],
    };

    it('keeps only CBR files when CBR is specified', () => {
      const filters = { isCBR: true };

      expect(
        search
          .filterResponse({ filters, response })
          .files.map((f) => f.filename),
      ).toEqual(['\\music\\cbr.mp3']);
    });

    it('keeps only VBR files when VBR is specified', () => {
      const filters = { isVBR: true };

      expect(
        search
          .filterResponse({ filters, response })
          .files.map((f) => f.filename),
      ).toEqual(['\\music\\vbr.mp3']);
    });

    it('removes files with unknown encoding', () => {
      const filters = { isCBR: true, isVBR: true };

      expect(search.filterResponse({ filters, response }).files).toHaveLength(
        0,
      );
    });
  });

  describe('term filtering', () => {
    const response = {
      files: [
        { filename: '/path/to/foo.mp3' },
        { filename: '/path/to/bar.mp3' },
        { filename: '/path/to/baz.mp3' },
        { filename: '/path/to/qux.mp3' },
        { filename: '/path/to/info.nfo' },
        { filename: '/path/to/folder.jpg' },
      ],
    };

    it('removes files with filenames not containing included phrases', () => {
      const filters = { include: ['path', 'to', '.nfo'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [{ filename: '/path/to/info.nfo' }],
      });
    });

    it('removes files with filenames containing excluded phrases', () => {
      const filters = { exclude: ['bar', 'jpg', 'qux'] };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [
          { filename: '/path/to/foo.mp3' },
          { filename: '/path/to/baz.mp3' },
          { filename: '/path/to/info.nfo' },
        ],
      });
    });

    it('removes a mix of includes and excludes', () => {
      const filters = {
        exclude: ['foo', 'bar'],
        include: ['path', '.mp3'],
      };

      expect(search.filterResponse({ filters, response })).toMatchObject({
        files: [
          { filename: '/path/to/baz.mp3' },
          { filename: '/path/to/qux.mp3' },
        ],
      });
    });
  });

  describe('empty results', () => {
    it('handles a response with no files', () => {
      const filters = { extensions: ['mp3'], minBitRate: 320 };

      const filtered = search.filterResponse({
        filters,
        response: { files: [], lockedFiles: [] },
      });

      expect(filtered.files).toEqual([]);
      expect(filtered.fileCount).toBe(0);
    });

    it('handles a response with no files and no metadata', () => {
      const filtered = search.filterResponse({
        filters: {},
        response: {},
      });

      expect(filtered.files).toEqual([]);
    });
  });
});

describe('parseFiltersFromString', () => {
  it('returns correct minBitrate', () => {
    expect(search.parseFiltersFromString('foo minbr:42 bar')).toMatchObject({
      minBitRate: 42,
    });

    expect(
      search.parseFiltersFromString('foo minbitrate:123 bar'),
    ).toMatchObject({
      minBitRate: 123,
    });
  });

  it('returns an exact bitrate', () => {
    expect(search.parseFiltersFromString('foo br:42 bar')).toMatchObject({
      bitRate: 42,
    });

    expect(search.parseFiltersFromString('foo bitrate:123 bar')).toMatchObject({
      bitRate: 123,
    });
  });

  it('does not confuse an exact bitrate with a minimum bitrate', () => {
    expect(search.parseFiltersFromString('foo minbr:42 bar')).toMatchObject({
      bitRate: 0,
      minBitRate: 42,
    });

    expect(
      search.parseFiltersFromString('foo minbitrate:42 bar'),
    ).toMatchObject({
      bitRate: 0,
      minBitRate: 42,
    });
  });

  it('returns correct minFileSize', () => {
    expect(search.parseFiltersFromString('foo minfs:42 bar')).toMatchObject({
      minFileSize: 42,
    });

    expect(
      search.parseFiltersFromString('foo minfilesize:123 bar'),
    ).toMatchObject({
      minFileSize: 123,
    });
  });

  it('returns correct minLength', () => {
    expect(search.parseFiltersFromString('foo minlen:42 bar')).toMatchObject({
      minLength: 42,
    });

    expect(
      search.parseFiltersFromString('foo minlength:123 bar'),
    ).toMatchObject({
      minLength: 123,
    });
  });

  it('returns correct minFilesInFolder', () => {
    expect(search.parseFiltersFromString('foo minfif:42 bar')).toMatchObject({
      minFilesInFolder: 42,
    });

    expect(
      search.parseFiltersFromString('foo minfilesinfolder:123 bar'),
    ).toMatchObject({
      minFilesInFolder: 123,
    });
  });

  it('returns correct list of terms', () => {
    expect(search.parseFiltersFromString('foo minbr:42 bar')).toMatchObject({
      include: ['foo', 'bar'],
    });

    expect(search.parseFiltersFromString('foo iscbr isvbr bar')).toMatchObject({
      include: ['foo', 'bar'],
    });

    expect(search.parseFiltersFromString('foo some:thing bar')).toMatchObject({
      include: ['foo', 'bar'],
    });

    expect(search.parseFiltersFromString('foo -bar')).toMatchObject({
      exclude: ['bar'],
      include: ['foo'],
    });

    expect(search.parseFiltersFromString('-foo -bar -baz qux')).toMatchObject({
      exclude: ['foo', 'bar', 'baz'],
      include: ['qux'],
    });

    expect(search.parseFiltersFromString('foo bar baz -qux')).toMatchObject({
      exclude: ['qux'],
      include: ['foo', 'bar', 'baz'],
    });
  });

  it('returns isVBR and isCBR if terms are present', () => {
    expect(search.parseFiltersFromString('isvbr')).toMatchObject({
      isVBR: true,
    });

    expect(search.parseFiltersFromString('iscbr')).toMatchObject({
      isCBR: true,
    });
  });

  it('returns expected filters given a bit of everything', () => {
    expect(
      search.parseFiltersFromString(
        'big -mix of:everything isvbr iscbr minbr:42',
      ),
    ).toMatchObject({
      exclude: ['mix'],
      include: ['big'],
      isCBR: true,
      isVBR: true,
      minBitRate: 42,
    });
  });
});
