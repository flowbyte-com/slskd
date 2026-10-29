// Search filter presets.
//
// A small set of built-in presets is always available.  Users can create,
// rename, and delete their own presets, which are stored in the browser's
// local storage.

import { defaultSearchFilters, sanitizeSearchFilters } from './searchFilters';

export const searchPresetsStorageKey = 'slskd-search-presets';

export const maxPresetNameLength = 64;

export const builtInSearchPresets = [
  {
    builtIn: true,
    filters: {
      encoding: 'any',
      format: 'mp3',
      freeSlotsOnly: false,
      minBitRate: 320,
    },
    id: 'builtin-320-mp3',
    name: '320 MP3',
  },
  {
    builtIn: true,
    filters: {
      encoding: 'cbr',
      format: 'mp3',
      freeSlotsOnly: false,
      minBitRate: 320,
    },
    id: 'builtin-320-mp3-cbr',
    name: '320 MP3 CBR',
  },
  {
    builtIn: true,
    filters: {
      encoding: 'any',
      format: 'flac',
      freeSlotsOnly: false,
      minBitRate: 0,
    },
    id: 'builtin-flac-only',
    name: 'FLAC Only',
  },
  {
    builtIn: true,
    filters: {
      ...defaultSearchFilters,
    },
    id: 'builtin-anything-goes',
    name: 'Anything Goes',
  },
];

let presetIdCounter = 0;

export const generateSearchPresetId = () => {
  presetIdCounter += 1;
  return `preset-${Date.now().toString(36)}-${presetIdCounter.toString(36)}`;
};

const getDefaultStorage = () => {
  try {
    // eslint-disable-next-line no-undef
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

/**
 * Determines whether the given preset name is valid.
 * @param {string} name the name to check
 * @returns {boolean} true if the name is valid.
 */
export const isValidSearchPresetName = (name) => {
  if (typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  return trimmed.length > 0 && trimmed.length <= maxPresetNameLength;
};

/**
 * Reads the user's custom presets from local storage.
 *
 * Missing or corrupted data is handled gracefully; invalid presets are
 * discarded.
 * @param {Storage} storage the storage to read from
 * @returns {object[]} the custom presets.
 */
export const readStoredSearchPresets = (storage = getDefaultStorage()) => {
  try {
    const raw = storage?.getItem(searchPresetsStorageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.warn('ignoring invalid search presets; expected an array');
      return [];
    }

    const presets = [];

    for (const preset of parsed) {
      if (!preset || typeof preset !== 'object') {
        continue;
      }

      if (!isValidSearchPresetName(preset.name)) {
        continue;
      }

      presets.push({
        builtIn: false,
        filters: sanitizeSearchFilters(preset.filters),
        id:
          typeof preset.id === 'string' && preset.id
            ? preset.id
            : generateSearchPresetId(),
        name: preset.name.trim(),
      });
    }

    return presets;
  } catch (error) {
    console.warn('failed to read search presets; ignoring stored data', error);
    return [];
  }
};

/**
 * Writes the user's custom presets to local storage.
 * @param {object[]} presets the presets to write
 * @param {Storage} storage the storage to write to
 * @returns {boolean} true if the presets were written.
 */
export const writeStoredSearchPresets = (
  presets,
  storage = getDefaultStorage(),
) => {
  try {
    storage?.setItem(
      searchPresetsStorageKey,
      JSON.stringify(
        (presets ?? []).map((preset) => ({
          filters: sanitizeSearchFilters(preset.filters),
          id: preset.id,
          name: preset.name,
        })),
      ),
    );

    return true;
  } catch (error) {
    console.warn('failed to write search presets', error);
    return false;
  }
};

/**
 * Combines the built-in presets with the user's custom presets.
 * @param {object[]} customPresets the user's custom presets
 * @returns {object[]} all available presets.
 */
export const getSearchPresets = (customPresets = []) => [
  ...builtInSearchPresets,
  ...customPresets,
];

/**
 * Creates a new custom preset.
 * @param {object[]} presets the existing custom presets
 * @param {{filters: object, name: string}} preset the preset to create
 * @returns {object[]} the new list of custom presets.
 */
export const createSearchPreset = (presets, { filters, name }) => {
  if (!isValidSearchPresetName(name)) {
    return presets ?? [];
  }

  return [
    ...(presets ?? []),
    {
      builtIn: false,
      filters: sanitizeSearchFilters(filters),
      id: generateSearchPresetId(),
      name: name.trim(),
    },
  ];
};

/**
 * Renames a custom preset.
 * @param {object[]} presets the existing custom presets
 * @param {string} id the id of the preset to rename
 * @param {string} name the new name
 * @returns {object[]} the new list of custom presets.
 */
export const renameSearchPreset = (presets, id, name) => {
  if (!isValidSearchPresetName(name)) {
    return presets ?? [];
  }

  return (presets ?? []).map((preset) =>
    preset.id === id ? { ...preset, name: name.trim() } : preset,
  );
};

/**
 * Deletes a custom preset.
 * @param {object[]} presets the existing custom presets
 * @param {string} id the id of the preset to delete
 * @returns {object[]} the new list of custom presets.
 */
export const deleteSearchPreset = (presets, id) =>
  (presets ?? []).filter((preset) => preset.id !== id);
