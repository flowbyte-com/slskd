// Favourites are stored in the browser's local storage.  They are local to the
// browser and the origin that served the application; they are not
// synchronized between browsers, devices, or users.

export const favouritesStorageKey = 'slskd-favourites';

export const maxUsernameLength = 64;

// control characters are not valid in Soulseek usernames
const hasControlCharacters = (value) => {
  for (let index = 0; index < value.length; index++) {
    const code = value.codePointAt(index);

    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
};

const getDefaultStorage = () => {
  try {
    // eslint-disable-next-line no-undef
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    // accessing localStorage can throw in some privacy modes
    return undefined;
  }
};

/**
 * Trims and validates the given username.
 * @param {string} username the username to normalize
 * @returns {string|undefined} the normalized username, or undefined if the
 * username is not valid.
 */
export const normalizeUsername = (username) => {
  if (typeof username !== 'string') {
    return undefined;
  }

  const trimmed = username.trim();

  if (trimmed.length === 0 || trimmed.length > maxUsernameLength) {
    return undefined;
  }

  if (hasControlCharacters(trimmed)) {
    return undefined;
  }

  return trimmed;
};

/**
 * Determines whether the given username is a valid Soulseek username.
 * @param {string} username the username to check
 * @returns {boolean} true if the username is valid.
 */
export const isValidUsername = (username) =>
  normalizeUsername(username) !== undefined;

/**
 * Produces the case-insensitive key used to compare usernames.
 * @param {string} username the username to key
 * @returns {string|undefined} the comparison key, or undefined if the username
 * is not valid.
 */
export const usernameKey = (username) =>
  normalizeUsername(username)?.toLowerCase();

/**
 * Finds the favourite matching the given username, ignoring case.
 * @param {string[]} favourites the list of favourites
 * @param {string} username the username to find
 * @returns {string|undefined} the matching favourite, or undefined.
 */
export const findFavourite = (favourites, username) => {
  const key = usernameKey(username);

  if (!key) {
    return undefined;
  }

  return (favourites ?? []).find((favourite) => usernameKey(favourite) === key);
};

/**
 * Determines whether the given username has been favourited, ignoring case.
 * @param {string[]} favourites the list of favourites
 * @param {string} username the username to check
 * @returns {boolean} true if the username is a favourite.
 */
export const isFavourite = (favourites, username) =>
  findFavourite(favourites, username) !== undefined;

/**
 * Adds a username to the list of favourites.
 *
 * Duplicate usernames (ignoring case) are not added, and the display casing of
 * the existing favourite is preserved.  Invalid usernames are ignored.
 * @param {string[]} favourites the list of favourites
 * @param {string} username the username to add
 * @returns {string[]} the list of favourites.
 */
export const addFavourite = (favourites, username) => {
  const current = favourites ?? [];
  const normalized = normalizeUsername(username);

  if (!normalized || isFavourite(current, normalized)) {
    return current;
  }

  return [...current, normalized];
};

/**
 * Removes a username from the list of favourites, ignoring case.
 * @param {string[]} favourites the list of favourites
 * @param {string} username the username to remove
 * @returns {string[]} the list of favourites.
 */
export const removeFavourite = (favourites, username) => {
  const current = favourites ?? [];
  const key = usernameKey(username);

  if (!key) {
    return current;
  }

  const next = current.filter((favourite) => usernameKey(favourite) !== key);

  return next.length === current.length ? current : next;
};

/**
 * Reads the list of favourites from local storage.
 *
 * Missing or corrupted data is handled gracefully; invalid entries are
 * discarded and duplicates are removed.
 * @param {Storage} storage the storage to read from
 * @returns {string[]} the list of favourites.
 */
export const readStoredFavourites = (storage = getDefaultStorage()) => {
  try {
    const raw = storage?.getItem(favouritesStorageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.warn('ignoring invalid favourites data; expected an array');
      return [];
    }

    const favourites = [];
    const seen = new Set();

    for (const entry of parsed) {
      const normalized = normalizeUsername(entry);

      if (!normalized) {
        continue;
      }

      const key = normalized.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      favourites.push(normalized);
    }

    return favourites;
  } catch (error) {
    console.warn('failed to read favourites; ignoring stored data', error);
    return [];
  }
};

/**
 * Writes the list of favourites to local storage.
 * @param {string[]} favourites the list of favourites
 * @param {Storage} storage the storage to write to
 * @returns {boolean} true if the list was written.
 */
export const writeStoredFavourites = (
  favourites,
  storage = getDefaultStorage(),
) => {
  try {
    storage?.setItem(favouritesStorageKey, JSON.stringify(favourites ?? []));
    return true;
  } catch (error) {
    console.warn('failed to write favourites', error);
    return false;
  }
};

/**
 * Produces the location used to browse the given user.
 * @param {string} username the user to browse
 * @returns {{pathname: string, state: {user: string}}} the location.
 */
export const buildBrowseLocation = (username, urlBase = '') => ({
  pathname: `${urlBase}/browse`,
  state: { user: username },
});
