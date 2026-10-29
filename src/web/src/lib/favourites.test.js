import * as favourites from './favourites';

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

describe('normalizeUsername', () => {
  it('trims the username', () => {
    expect(favourites.normalizeUsername('  alice  ')).toBe('alice');
  });

  it('rejects empty and whitespace-only usernames', () => {
    expect(favourites.normalizeUsername('')).toBeUndefined();
    expect(favourites.normalizeUsername('   ')).toBeUndefined();
    expect(favourites.normalizeUsername('\t\n')).toBeUndefined();
  });

  it('rejects non-string usernames', () => {
    expect(favourites.normalizeUsername(undefined)).toBeUndefined();
    expect(favourites.normalizeUsername(null)).toBeUndefined();
    expect(favourites.normalizeUsername(42)).toBeUndefined();
    expect(favourites.normalizeUsername({})).toBeUndefined();
  });

  it('rejects usernames containing control characters', () => {
    expect(favourites.normalizeUsername('ali\u0000ce')).toBeUndefined();
    expect(favourites.normalizeUsername('ali\nce')).toBeUndefined();
    expect(favourites.normalizeUsername('ali\u007Fce')).toBeUndefined();
  });

  it('rejects usernames that are too long', () => {
    expect(
      favourites.normalizeUsername('a'.repeat(favourites.maxUsernameLength)),
    ).toBe('a'.repeat(favourites.maxUsernameLength));

    expect(
      favourites.normalizeUsername(
        'a'.repeat(favourites.maxUsernameLength + 1),
      ),
    ).toBeUndefined();
  });

  it('accepts ordinary usernames', () => {
    expect(favourites.normalizeUsername('some user_1')).toBe('some user_1');
  });
});

describe('isValidUsername', () => {
  it('returns true for valid usernames', () => {
    expect(favourites.isValidUsername('alice')).toBe(true);
  });

  it('returns false for invalid usernames', () => {
    expect(favourites.isValidUsername('')).toBe(false);
    expect(favourites.isValidUsername('  ')).toBe(false);
  });
});

describe('addFavourite', () => {
  it('adds a favourite', () => {
    expect(favourites.addFavourite([], 'alice')).toEqual(['alice']);
  });

  it('preserves the display casing of the username', () => {
    expect(favourites.addFavourite([], 'AlIcE')).toEqual(['AlIcE']);
  });

  it('does not add duplicates', () => {
    const list = favourites.addFavourite([], 'alice');

    expect(favourites.addFavourite(list, 'alice')).toEqual(['alice']);
    expect(favourites.addFavourite(list, 'alice')).toHaveLength(1);
  });

  it('does not add duplicates that differ only by case', () => {
    const list = favourites.addFavourite([], 'Alice');

    expect(favourites.addFavourite(list, 'alice')).toEqual(['Alice']);
    expect(favourites.addFavourite(list, 'ALICE')).toEqual(['Alice']);
  });

  it('ignores invalid usernames', () => {
    expect(favourites.addFavourite([], '')).toEqual([]);
    expect(favourites.addFavourite([], '   ')).toEqual([]);
    expect(favourites.addFavourite([], undefined)).toEqual([]);
  });

  it('trims the username', () => {
    expect(favourites.addFavourite([], '  alice  ')).toEqual(['alice']);
  });
});

describe('removeFavourite', () => {
  it('removes a favourite', () => {
    expect(favourites.removeFavourite(['alice', 'bob'], 'alice')).toEqual([
      'bob',
    ]);
  });

  it('removes a favourite that differs only by case', () => {
    expect(favourites.removeFavourite(['Alice', 'bob'], 'aLiCe')).toEqual([
      'bob',
    ]);
  });

  it('leaves the list alone when the username is not present', () => {
    const list = ['alice'];

    expect(favourites.removeFavourite(list, 'bob')).toEqual(['alice']);
  });

  it('ignores invalid usernames', () => {
    expect(favourites.removeFavourite(['alice'], '')).toEqual(['alice']);
  });
});

describe('isFavourite', () => {
  it('finds favourites regardless of case', () => {
    expect(favourites.isFavourite(['Alice'], 'alice')).toBe(true);
    expect(favourites.isFavourite(['alice'], 'ALICE')).toBe(true);
  });

  it('does not find users that are not favourites', () => {
    expect(favourites.isFavourite(['alice'], 'bob')).toBe(false);
    expect(favourites.isFavourite([], 'bob')).toBe(false);
  });

  it('handles an empty list', () => {
    expect(favourites.isFavourite([], 'alice')).toBe(false);
  });
});

describe('readStoredFavourites', () => {
  it('returns an empty list when nothing is stored', () => {
    const storage = createStorage();

    expect(favourites.readStoredFavourites(storage)).toEqual([]);
  });

  it('reads stored favourites', () => {
    const storage = createStorage({
      [favourites.favouritesStorageKey]: JSON.stringify(['alice', 'bob']),
    });

    expect(favourites.readStoredFavourites(storage)).toEqual(['alice', 'bob']);
  });

  it('handles corrupted data', () => {
    const storage = createStorage({
      [favourites.favouritesStorageKey]: '{not json',
    });

    expect(favourites.readStoredFavourites(storage)).toEqual([]);
  });

  it('handles data that is not an array', () => {
    const storage = createStorage({
      [favourites.favouritesStorageKey]: JSON.stringify({ alice: true }),
    });

    expect(favourites.readStoredFavourites(storage)).toEqual([]);
  });

  it('discards invalid entries', () => {
    const storage = createStorage({
      [favourites.favouritesStorageKey]: JSON.stringify([
        'alice',
        '',
        '   ',
        null,
        42,
        'bob',
      ]),
    });

    expect(favourites.readStoredFavourites(storage)).toEqual(['alice', 'bob']);
  });

  it('removes duplicates, ignoring case', () => {
    const storage = createStorage({
      [favourites.favouritesStorageKey]: JSON.stringify([
        'Alice',
        'alice',
        'ALICE',
        'bob',
      ]),
    });

    expect(favourites.readStoredFavourites(storage)).toEqual(['Alice', 'bob']);
  });

  it('handles a storage implementation that throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('nope');
      },
    };

    expect(favourites.readStoredFavourites(storage)).toEqual([]);
  });
});

describe('writeStoredFavourites', () => {
  it('writes the list to storage', () => {
    const storage = createStorage();

    expect(favourites.writeStoredFavourites(['alice'], storage)).toBe(true);
    expect(storage.data[favourites.favouritesStorageKey]).toBe(
      JSON.stringify(['alice']),
    );
  });

  it('handles a storage implementation that throws', () => {
    const storage = {
      setItem: () => {
        throw new Error('nope');
      },
    };

    expect(favourites.writeStoredFavourites(['alice'], storage)).toBe(false);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('survives a reload', () => {
    favourites.writeStoredFavourites(['alice', 'bob']);

    // simulate a reload by reading the list back from storage
    const reloaded = favourites.readStoredFavourites(localStorage);

    expect(reloaded).toEqual(['alice', 'bob']);
  });

  it('persists additions and removals', () => {
    let list = favourites.readStoredFavourites(localStorage);

    list = favourites.addFavourite(list, 'alice');
    favourites.writeStoredFavourites(list);

    expect(favourites.readStoredFavourites(localStorage)).toEqual(['alice']);

    list = favourites.removeFavourite(
      favourites.readStoredFavourites(localStorage),
      'alice',
    );
    favourites.writeStoredFavourites(list);

    expect(favourites.readStoredFavourites(localStorage)).toEqual([]);
  });
});

describe('buildBrowseLocation', () => {
  it('produces a location that carries the username', () => {
    expect(favourites.buildBrowseLocation('alice', '/slskd')).toEqual({
      pathname: '/slskd/browse',
      state: { user: 'alice' },
    });
  });

  it('produces a location without a base path', () => {
    expect(favourites.buildBrowseLocation('alice')).toEqual({
      pathname: '/browse',
      state: { user: 'alice' },
    });
  });
});
