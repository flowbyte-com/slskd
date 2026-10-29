import * as filters from './searchFilters';

describe('formats', () => {
  it('offers the expected formats', () => {
    const keys = filters.searchFilterFormats.map((format) => format.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'any',
        'mp3',
        'flac',
        'aac',
        'ogg',
        'wav',
        'opus',
        'wma',
        'alac',
        'ape',
        'aiff',
      ]),
    );
  });

  it('maps mp3 to the mp3 extension', () => {
    expect(filters.getSearchFilterExtensions('mp3')).toEqual(['mp3']);
  });

  it('maps flac to the flac extension', () => {
    expect(filters.getSearchFilterExtensions('flac')).toEqual(['flac']);
  });

  it('maps aac to the aac and m4a extensions', () => {
    expect(filters.getSearchFilterExtensions('aac')).toEqual(['aac', 'm4a']);
  });

  it('maps any to no extensions', () => {
    expect(filters.getSearchFilterExtensions('any')).toEqual([]);
  });

  it('falls back to any for unknown formats', () => {
    expect(filters.getSearchFilterExtensions('bogus')).toEqual([]);
  });

  it('identifies lossless formats', () => {
    expect(filters.isLosslessSearchFilterFormat('flac')).toBe(true);
    expect(filters.isLosslessSearchFilterFormat('wav')).toBe(true);
    expect(filters.isLosslessSearchFilterFormat('mp3')).toBe(false);
    expect(filters.isLosslessSearchFilterFormat('aac')).toBe(false);
  });

  it('does not apply bitrate filters to lossless formats', () => {
    expect(filters.supportsSearchFilterBitRate('flac')).toBe(false);
    expect(filters.supportsSearchFilterBitRate('mp3')).toBe(true);
  });
});

describe('combineSearchFilters', () => {
  const visual = {
    encoding: 'any',
    format: 'any',
    freeSlotsOnly: false,
    minBitRate: 0,
  };

  it('combines the extensions of both filter sets', () => {
    const { filters: combined } = filters.combineSearchFilters(
      { extensions: ['wav'] },
      { ...visual, format: 'mp3' },
    );

    expect(combined.extensions).toEqual(['wav', 'mp3']);
  });

  it('uses the strictest minimum bitrate', () => {
    const { filters: combined } = filters.combineSearchFilters(
      { minBitRate: 320 },
      { ...visual, minBitRate: 128 },
    );

    expect(combined.minBitRate).toBe(320);
  });

  it('uses the strictest minimum bitrate when the visual filter is stricter', () => {
    const { filters: combined } = filters.combineSearchFilters(
      { minBitRate: 128 },
      { ...visual, minBitRate: 320 },
    );

    expect(combined.minBitRate).toBe(320);
  });

  it('applies the encoding filter from the visual filters', () => {
    const { filters: combined } = filters.combineSearchFilters(
      {},
      {
        ...visual,
        encoding: 'cbr',
      },
    );

    expect(combined.isCBR).toBe(true);
    expect(combined.isVBR).toBe(false);
    expect(
      filters.combineSearchFilters({}, { ...visual, encoding: 'cbr' })
        .conflicts,
    ).toHaveLength(0);
  });

  it('applies the encoding filter from the advanced filters', () => {
    const { filters: combined } = filters.combineSearchFilters(
      { isVBR: true },
      visual,
    );

    expect(combined.isVBR).toBe(true);
    expect(combined.isCBR).toBe(false);
  });

  it('reports a conflict when CBR and VBR are both required', () => {
    const { conflicts, filters: combined } = filters.combineSearchFilters(
      { isCBR: true },
      { ...visual, encoding: 'vbr' },
    );

    expect(conflicts).toHaveLength(1);
    expect(combined.isCBR).toBe(true);
    expect(combined.isVBR).toBe(true);
  });

  it('reports a conflict when the advanced filters require both CBR and VBR', () => {
    const { conflicts } = filters.combineSearchFilters(
      { isCBR: true, isVBR: true },
      visual,
    );

    expect(conflicts).toHaveLength(1);
  });

  it('preserves the other advanced filters', () => {
    const { filters: combined } = filters.combineSearchFilters(
      { include: ['foo'], isLossless: true, minBitDepth: 24 },
      visual,
    );

    expect(combined.include).toEqual(['foo']);
    expect(combined.isLossless).toBe(true);
    expect(combined.minBitDepth).toBe(24);
  });
});

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default preferences when nothing is stored', () => {
    expect(filters.readSearchPreferences(localStorage)).toEqual(
      filters.defaultSearchPreferences,
    );
  });

  it('persists the preferences', () => {
    const preferences = {
      advancedFilters: 'minbr:320',
      encoding: 'cbr',
      format: 'mp3',
      freeSlotsOnly: true,
      minBitRate: 320,
    };

    filters.writeSearchPreferences(preferences, localStorage);

    expect(filters.readSearchPreferences(localStorage)).toEqual(preferences);
  });

  it('survives a reload', () => {
    filters.writeSearchPreferences(
      { ...filters.defaultSearchPreferences, format: 'flac' },
      localStorage,
    );

    const reloaded = filters.readSearchPreferences(localStorage);

    expect(reloaded.format).toBe('flac');
  });

  it('handles corrupted data', () => {
    localStorage.setItem(filters.searchPreferencesStorageKey, '{not json');

    expect(filters.readSearchPreferences(localStorage)).toEqual(
      filters.defaultSearchPreferences,
    );
  });

  it('handles data that is not an object', () => {
    localStorage.setItem(
      filters.searchPreferencesStorageKey,
      JSON.stringify(['nope']),
    );

    expect(filters.readSearchPreferences(localStorage)).toEqual(
      filters.defaultSearchPreferences,
    );
  });

  it('discards invalid values', () => {
    localStorage.setItem(
      filters.searchPreferencesStorageKey,
      JSON.stringify({
        encoding: 'bogus',
        format: 'bogus',
        freeSlotsOnly: 'yes',
        minBitRate: 999,
      }),
    );

    expect(filters.readSearchPreferences(localStorage)).toEqual({
      advancedFilters: '',
      encoding: 'any',
      format: 'any',
      freeSlotsOnly: true,
      minBitRate: 0,
    });
  });

  it('splits the preferences into visual and advanced filters', () => {
    const { advancedFilters, filters: visual } = filters.splitSearchPreferences(
      {
        advancedFilters: 'minbr:320',
        encoding: 'cbr',
        format: 'mp3',
        freeSlotsOnly: true,
        minBitRate: 320,
      },
    );

    expect(advancedFilters).toBe('minbr:320');
    expect(visual).toEqual({
      encoding: 'cbr',
      format: 'mp3',
      freeSlotsOnly: true,
      minBitRate: 320,
    });
  });

  it('handles a storage implementation that throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('nope');
      },
    };

    expect(filters.readSearchPreferences(storage)).toEqual(
      filters.defaultSearchPreferences,
    );
  });

  it('handles a storage implementation that throws when writing', () => {
    const storage = {
      setItem: () => {
        throw new Error('nope');
      },
    };

    expect(
      filters.writeSearchPreferences(filters.defaultSearchPreferences, storage),
    ).toBe(false);
  });
});
