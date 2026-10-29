import * as presets from './searchPresets';

const createStorage = (initial = {}) => {
  const data = { ...initial };

  return {
    data,
    getItem: jest.fn((key) => (key in data ? data[key] : null)),
    removeItem: jest.fn((key) => {
      delete data[key];
    }),
    setItem: jest.fn((key, value) => {
      data[key] = value;
    }),
  };
};

describe('built in presets', () => {
  it('includes the expected presets', () => {
    const names = presets.builtInSearchPresets.map((preset) => preset.name);

    expect(names).toEqual(
      expect.arrayContaining([
        '320 MP3',
        '320 MP3 CBR',
        'FLAC Only',
        'Anything Goes',
      ]),
    );
  });

  it('defines 320 MP3', () => {
    const preset = presets.builtInSearchPresets.find(
      (p) => p.name === '320 MP3',
    );

    expect(preset.filters.format).toBe('mp3');
    expect(preset.filters.minBitRate).toBe(320);
    expect(preset.filters.encoding).toBe('any');
  });

  it('defines 320 MP3 CBR', () => {
    const preset = presets.builtInSearchPresets.find(
      (p) => p.name === '320 MP3 CBR',
    );

    expect(preset.filters.format).toBe('mp3');
    expect(preset.filters.minBitRate).toBe(320);
    expect(preset.filters.encoding).toBe('cbr');
  });

  it('defines FLAC Only', () => {
    const preset = presets.builtInSearchPresets.find(
      (p) => p.name === 'FLAC Only',
    );

    expect(preset.filters.format).toBe('flac');
    expect(preset.filters.minBitRate).toBe(0);
    expect(preset.filters.encoding).toBe('any');
  });

  it('defines Anything Goes', () => {
    const preset = presets.builtInSearchPresets.find(
      (p) => p.name === 'Anything Goes',
    );

    expect(preset.filters.format).toBe('any');
    expect(preset.filters.minBitRate).toBe(0);
    expect(preset.filters.encoding).toBe('any');
    expect(preset.filters.freeSlotsOnly).toBe(false);
  });

  it('combines built in presets with custom presets', () => {
    const custom = [
      { builtIn: false, filters: {}, id: 'custom', name: 'Mine' },
    ];

    const all = presets.getSearchPresets(custom);

    expect(all).toHaveLength(presets.builtInSearchPresets.length + 1);
    expect(all[all.length - 1].name).toBe('Mine');
  });
});

describe('custom presets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a preset', () => {
    const created = presets.createSearchPreset([], {
      filters: { format: 'mp3', minBitRate: 320 },
      name: 'Mine',
    });

    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('Mine');
    expect(created[0].filters.format).toBe('mp3');
    expect(created[0].filters.minBitRate).toBe(320);
    expect(created[0].builtIn).toBe(false);
  });

  it('rejects presets with invalid names', () => {
    expect(
      presets.createSearchPreset([], { filters: {}, name: '' }),
    ).toHaveLength(0);

    expect(
      presets.createSearchPreset([], { filters: {}, name: '   ' }),
    ).toHaveLength(0);

    expect(
      presets.createSearchPreset([], { filters: {}, name: undefined }),
    ).toHaveLength(0);
  });

  it('renames a preset', () => {
    const created = presets.createSearchPreset([], {
      filters: {},
      name: 'Mine',
    });

    const renamed = presets.renameSearchPreset(created, created[0].id, 'Yours');

    expect(renamed[0].name).toBe('Yours');
  });

  it('does not rename a preset with an invalid name', () => {
    const created = presets.createSearchPreset([], {
      filters: {},
      name: 'Mine',
    });

    const renamed = presets.renameSearchPreset(created, created[0].id, '');

    expect(renamed[0].name).toBe('Mine');
  });

  it('deletes a preset', () => {
    const created = presets.createSearchPreset([], {
      filters: {},
      name: 'Mine',
    });

    expect(presets.deleteSearchPreset(created, created[0].id)).toHaveLength(0);
  });

  it('persists custom presets', () => {
    const created = presets.createSearchPreset([], {
      filters: { format: 'flac' },
      name: 'Mine',
    });

    presets.writeStoredSearchPresets(created, localStorage);

    const reloaded = presets.readStoredSearchPresets(localStorage);

    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].name).toBe('Mine');
    expect(reloaded[0].filters.format).toBe('flac');
  });

  it('returns an empty list when nothing is stored', () => {
    expect(presets.readStoredSearchPresets(localStorage)).toEqual([]);
  });

  it('handles corrupted data', () => {
    localStorage.setItem(presets.searchPresetsStorageKey, '{not json');

    expect(presets.readStoredSearchPresets(localStorage)).toEqual([]);
  });

  it('handles data that is not an array', () => {
    localStorage.setItem(
      presets.searchPresetsStorageKey,
      JSON.stringify({ nope: true }),
    );

    expect(presets.readStoredSearchPresets(localStorage)).toEqual([]);
  });

  it('discards invalid presets', () => {
    localStorage.setItem(
      presets.searchPresetsStorageKey,
      JSON.stringify([
        { filters: {}, id: 'a', name: 'Valid' },
        { filters: {}, id: 'b', name: '' },
        { filters: {}, id: 'c' },
        null,
      ]),
    );

    const stored = presets.readStoredSearchPresets(localStorage);

    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Valid');
  });

  it('handles a storage implementation that throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('nope');
      },
    };

    expect(presets.readStoredSearchPresets(storage)).toEqual([]);
  });

  it('handles a storage implementation that throws when writing', () => {
    const storage = {
      setItem: () => {
        throw new Error('nope');
      },
    };

    expect(presets.writeStoredSearchPresets([], storage)).toBe(false);
  });

  it('writes the presets to storage', () => {
    const storage = createStorage();

    expect(presets.writeStoredSearchPresets([], storage)).toBe(true);
    expect(storage.data[presets.searchPresetsStorageKey]).toBe('[]');
  });
});
