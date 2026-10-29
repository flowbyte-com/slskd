import api from './api';
import { getFileExtension } from './util';

export const getAll = async () => {
  return (await api.get('/searches')).data;
};

export const stop = ({ id }) => {
  return api.put(`/searches/${encodeURIComponent(id)}`);
};

export const remove = ({ id }) => {
  return api.delete(`/searches/${encodeURIComponent(id)}`);
};

export const create = ({ id, searchText }) => {
  return api.post('/searches', { id, searchText });
};

export const getStatus = async ({ id, includeResponses = false }) => {
  return (
    await api.get(
      `/searches/${encodeURIComponent(id)}?includeResponses=${includeResponses}`,
    )
  ).data;
};

export const getResponses = async ({ id }) => {
  const response = (
    await api.get(`/searches/${encodeURIComponent(id)}/responses`)
  ).data;

  if (!Array.isArray(response)) {
    console.warn('got non-array response from searches API', response);
    return undefined;
  }

  return response;
};

const getNthMatch = (string, regex, n) => {
  const match = string.match(regex);

  if (match) {
    return Number.parseInt(match[n], 10);
  }

  return undefined;
};

export const parseFiltersFromString = (string) => {
  const filters = {
    bitRate: 0,
    exclude: [],
    extensions: [],
    include: [],
    isCBR: false,
    isLossless: false,
    isLossy: false,
    isVBR: false,
    minBitDepth: 0,
    minBitRate: 0,
    minFilesInFolder: 0,
    minFileSize: 0,
    minLength: 0,
  };

  filters.minBitRate =
    getNthMatch(string, /(minbr|minbitrate):(\d+)/iu, 2) || filters.minBitRate;

  // an exact bitrate; the token must be preceded by whitespace so that it
  // can't be confused with the 'minbr' and 'minbitrate' tokens.
  filters.bitRate =
    getNthMatch(string, /(^|\s)(br|bitrate):(\d+)/iu, 3) || filters.bitRate;

  filters.minBitDepth =
    getNthMatch(string, /(minbd|minbitdepth):(\d+)/iu, 2) ||
    filters.minBitDepth;
  filters.minFileSize =
    getNthMatch(string, /(minfs|minfilesize):(\d+)/iu, 2) ||
    filters.minFileSize;
  filters.minLength =
    getNthMatch(string, /(minlen|minlength):(\d+)/iu, 2) || filters.minLength;
  filters.minFilesInFolder =
    getNthMatch(string, /(minfif|minfilesinfolder):(\d+)/iu, 2) ||
    filters.minFilesInFolder;

  filters.isVBR = Boolean(/isvbr/iu.test(string));
  filters.isCBR = Boolean(/iscbr/iu.test(string));
  filters.isLossless = Boolean(/islossless/iu.test(string));
  filters.isLossy = Boolean(/islossy/iu.test(string));

  const terms = string
    .toLowerCase()
    .split(' ')
    .filter(
      (term) =>
        !term.includes(':') &&
        term !== 'isvbr' &&
        term !== 'iscbr' &&
        term !== 'islossless' &&
        term !== 'islossy',
    );

  filters.include = terms.filter((term) => !term.startsWith('-'));
  filters.exclude = terms
    .filter((term) => term.startsWith('-'))
    .map((term) => term.slice(1));

  return filters;
};

const isNumber = (value) => typeof value === 'number' && !Number.isNaN(value);

// a file's encoding is only known if its metadata says so; a file with unknown
// encoding can never satisfy a CBR or VBR requirement.
const matchesEncoding = ({ isVariableBitRate }, { isCBR, isVBR }) => {
  const encodingKnown = typeof isVariableBitRate === 'boolean';

  if (isCBR && (!encodingKnown || isVariableBitRate)) {
    return false;
  }

  if (isVBR && (!encodingKnown || !isVariableBitRate)) {
    return false;
  }

  return true;
};

const matchesLossiness = (
  { bitDepth, sampleRate },
  { isLossless, isLossy },
) => {
  if (isLossless && (!sampleRate || !bitDepth)) {
    return false;
  }

  if (isLossy && (sampleRate || bitDepth)) {
    return false;
  }

  return true;
};

// a file with unknown metadata can never satisfy a bitrate requirement.
const matchesBitRate = ({ bitRate }, { exactBitRate, minBitRate }) => {
  if (minBitRate > 0 && (!isNumber(bitRate) || bitRate < minBitRate)) {
    return false;
  }

  if (exactBitRate > 0 && (!isNumber(bitRate) || bitRate !== exactBitRate)) {
    return false;
  }

  return true;
};

const matchesMetadata = (
  { bitDepth, length, size },
  { minBitDepth, minFileSize, minLength },
) => {
  if (minBitDepth > 0 && (!isNumber(bitDepth) || bitDepth < minBitDepth)) {
    return false;
  }

  if (minFileSize > 0 && (!isNumber(size) || size < minFileSize)) {
    return false;
  }

  if (minLength > 0 && (!isNumber(length) || length < minLength)) {
    return false;
  }

  return true;
};

// extensions are matched exactly, and without regard to case.
const matchesExtension = ({ filename }, extensionSet) => {
  if (!extensionSet) {
    return true;
  }

  return extensionSet.has(getFileExtension(filename));
};

const matchesTerms = ({ filename }, { exclude, include }) => {
  if (include.length === 0 && exclude.length === 0) {
    return true;
  }

  const lowerCaseFilename = (filename ?? '').toLowerCase();

  if (
    include.length > 0 &&
    !include.every((term) => lowerCaseFilename.includes(term))
  ) {
    return false;
  }

  if (exclude.some((term) => lowerCaseFilename.includes(term))) {
    return false;
  }

  return true;
};

export const filterResponse = ({
  filters = {
    bitRate: 0,
    exclude: [],
    extensions: [],
    include: [],
    isCBR: false,
    isLossless: false,
    isLossy: false,
    isVBR: false,
    minBitDepth: 0,
    minBitRate: 0,
    minFileSize: 0,
    minLength: 0,
  },
  response = {
    files: [],
    lockedFiles: [],
  },
}) => {
  const { files = [], lockedFiles = [] } = response;

  // the filters are normalized so that the individual checks don't have to
  // deal with missing values.
  const {
    bitRate: exactBitRate = 0,
    exclude = [],
    extensions = [],
    include = [],
    isCBR = false,
    isLossless = false,
    isLossy = false,
    isVBR = false,
    minBitDepth = 0,
    minBitRate = 0,
    minFileSize = 0,
    minFilesInFolder = 0,
    minLength = 0,
  } = filters;

  const normalizedFilters = {
    exactBitRate,
    exclude,
    extensions,
    include,
    isCBR,
    isLossless,
    isLossy,
    isVBR,
    minBitDepth,
    minBitRate,
    minFileSize,
    minLength,
  };

  if (
    (response.fileCount ?? 0) + (response.lockedFileCount ?? 0) <
    minFilesInFolder
  ) {
    return { ...response, files: [] };
  }

  // the set of extensions to match is compiled once per response rather than
  // once per file.
  const extensionSet =
    extensions.length > 0
      ? new Set(extensions.map((extension) => extension.toLowerCase()))
      : undefined;

  const filterFiles = (filesToFilter) =>
    filesToFilter.filter(
      (file) =>
        matchesEncoding(file, normalizedFilters) &&
        matchesLossiness(file, normalizedFilters) &&
        matchesBitRate(file, normalizedFilters) &&
        matchesMetadata(file, normalizedFilters) &&
        matchesExtension(file, extensionSet) &&
        matchesTerms(file, normalizedFilters),
    );

  const filteredFiles = filterFiles(files);
  const filteredLockedFiles = filterFiles(lockedFiles);

  return {
    ...response,
    fileCount: filteredFiles.length,
    files: filteredFiles,
    lockedFileCount: filteredLockedFiles.length,
    lockedFiles: filteredLockedFiles,
  };
};
