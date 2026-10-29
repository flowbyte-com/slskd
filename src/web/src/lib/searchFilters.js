// Visual (non-textual) filters for search results.
//
// These filters are applied to the results that have been returned by the
// server.  They do not modify the search phrase that is sent to Soulseek.

export const searchPreferencesStorageKey = 'slskd-search-preferences';

export const defaultSearchFilters = {
  encoding: 'any',
  format: 'any',
  freeSlotsOnly: false,
  minBitRate: 0,
};

export const defaultSearchPreferences = {
  ...defaultSearchFilters,
  advancedFilters: '',
};

// the file formats that can be selected.  each format maps to the extensions
// that it matches; extensions are matched exactly, and without regard to case.
export const searchFilterFormats = [
  { extensions: [], key: 'any', text: 'Any' },
  { extensions: ['mp3'], key: 'mp3', text: 'MP3' },
  { extensions: ['flac'], key: 'flac', text: 'FLAC' },
  { extensions: ['aac', 'm4a'], key: 'aac', text: 'AAC / M4A' },
  { extensions: ['ogg', 'oga'], key: 'ogg', text: 'OGG' },
  { extensions: ['opus'], key: 'opus', text: 'Opus' },
  { extensions: ['wav'], key: 'wav', text: 'WAV' },
  { extensions: ['wma'], key: 'wma', text: 'WMA' },
  { extensions: ['alac'], key: 'alac', text: 'ALAC' },
  { extensions: ['ape'], key: 'ape', text: 'APE' },
  { extensions: ['aif', 'aiff'], key: 'aiff', text: 'AIFF' },
];

// formats that carry lossless audio; a CBR/VBR requirement is meaningless
// for these, and is not applied to them.
export const losslessSearchFilterFormats = [
  'flac',
  'wav',
  'alac',
  'ape',
  'aiff',
];

export const searchFilterBitRates = [
  { key: 'any', text: 'Any', value: 0 },
  { key: '128', text: '128 kbps', value: 128 },
  { key: '192', text: '192 kbps', value: 192 },
  { key: '256', text: '256 kbps', value: 256 },
  { key: '320', text: '320 kbps', value: 320 },
];

export const searchFilterEncodings = [
  { key: 'any', text: 'Any', value: 'any' },
  { key: 'cbr', text: 'CBR', value: 'cbr' },
  { key: 'vbr', text: 'VBR', value: 'vbr' },
];

export const getSearchFilterFormat = (key) =>
  searchFilterFormats.find((format) => format.key === key) ??
  searchFilterFormats[0];

export const getSearchFilterExtensions = (key) =>
  getSearchFilterFormat(key).extensions;

export const isLosslessSearchFilterFormat = (key) =>
  losslessSearchFilterFormats.includes(key);

// bitrate and encoding filters don't apply to lossless formats.
export const supportsSearchFilterBitRate = (key) =>
  !isLosslessSearchFilterFormat(key);

const getDefaultStorage = () => {
  try {
    // eslint-disable-next-line no-undef
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

/**
 * Removes any invalid values from the given filters.
 * @param {object} filters the filters to sanitize
 * @returns {object} the sanitized filters.
 */
export const sanitizeSearchFilters = (filters = {}) => ({
  encoding: searchFilterEncodings.some(
    (encoding) => encoding.value === filters.encoding,
  )
    ? filters.encoding
    : defaultSearchFilters.encoding,
  format: searchFilterFormats.some((format) => format.key === filters.format)
    ? filters.format
    : defaultSearchFilters.format,
  freeSlotsOnly: Boolean(filters.freeSlotsOnly),
  minBitRate: searchFilterBitRates.some(
    (bitRate) => bitRate.value === filters.minBitRate,
  )
    ? filters.minBitRate
    : defaultSearchFilters.minBitRate,
});

/**
 * Reads the user's search preferences from local storage.
 *
 * Missing or corrupted data is handled gracefully; invalid values are
 * discarded.
 * @param {Storage} storage the storage to read from
 * @returns {object} the preferences.
 */
export const readSearchPreferences = (storage = getDefaultStorage()) => {
  try {
    const raw = storage?.getItem(searchPreferencesStorageKey);

    if (!raw) {
      return { ...defaultSearchPreferences };
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...defaultSearchPreferences };
    }

    return {
      ...sanitizeSearchFilters(parsed),
      advancedFilters:
        typeof parsed.advancedFilters === 'string'
          ? parsed.advancedFilters
          : defaultSearchPreferences.advancedFilters,
    };
  } catch (error) {
    console.warn(
      'failed to read search preferences; ignoring stored data',
      error,
    );
    return { ...defaultSearchPreferences };
  }
};

/**
 * Writes the user's search preferences to local storage.
 * @param {object} preferences the preferences to write
 * @param {Storage} storage the storage to write to
 * @returns {boolean} true if the preferences were written.
 */
export const writeSearchPreferences = (
  preferences,
  storage = getDefaultStorage(),
) => {
  try {
    storage?.setItem(
      searchPreferencesStorageKey,
      JSON.stringify({
        ...sanitizeSearchFilters(preferences),
        advancedFilters: preferences?.advancedFilters ?? '',
      }),
    );

    return true;
  } catch (error) {
    console.warn('failed to write search preferences', error);
    return false;
  }
};

/**
 * Splits the given preferences into the visual filters and the advanced
 * (textual) filter.
 * @param {object} preferences the preferences
 * @returns {{advancedFilters: string, filters: object}} the split preferences.
 */
export const splitSearchPreferences = (preferences = {}) => ({
  advancedFilters: preferences?.advancedFilters ?? '',
  filters: sanitizeSearchFilters(preferences),
});

/**
 * Combines the advanced (textual) filters with the visual filters.
 *
 * The two sets of filters are applied together; a file must satisfy both.
 * Numeric minimums are combined by taking the strictest of the two, and
 * encoding requirements are combined as a set.  Requirements that cannot be
 * satisfied at the same time are reported as conflicts.
 * @param {object} advancedFilters the filters parsed from the filter string
 * @param {object} visualFilters the visual filters
 * @returns {{conflicts: string[], filters: object}} the combined filters.
 */
export const combineSearchFilters = (
  advancedFilters = {},
  visualFilters = defaultSearchFilters,
) => {
  const conflicts = [];

  const extensions = [
    ...new Set(
      [
        ...(advancedFilters.extensions ?? []),
        ...getSearchFilterExtensions(visualFilters?.format),
      ].map((extension) => extension.toLowerCase()),
    ),
  ];

  // the strictest minimum wins.
  const minBitRate = Math.max(
    advancedFilters.minBitRate ?? 0,
    visualFilters?.minBitRate ?? 0,
  );

  const encodings = new Set();

  if (advancedFilters.isCBR) {
    encodings.add('cbr');
  }

  if (advancedFilters.isVBR) {
    encodings.add('vbr');
  }

  if (visualFilters?.encoding === 'cbr') {
    encodings.add('cbr');
  }

  if (visualFilters?.encoding === 'vbr') {
    encodings.add('vbr');
  }

  if (encodings.has('cbr') && encodings.has('vbr')) {
    conflicts.push(
      'Conflicting encoding filters: a file cannot be both CBR and VBR, so no results can match.',
    );
  }

  return {
    conflicts,
    filters: {
      ...advancedFilters,
      bitRate: advancedFilters.bitRate ?? 0,
      extensions,
      isCBR: encodings.has('cbr'),
      isVBR: encodings.has('vbr'),
      minBitRate,
    },
  };
};
