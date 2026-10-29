import {
  addFavourite,
  findFavourite,
  readStoredFavourites,
  removeFavourite,
  writeStoredFavourites,
} from '../../lib/favourites';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const FavouritesContext = createContext(undefined);

/**
 * Provides the list of favourite users to the application.
 *
 * The list is read from, and written to, the browser's local storage; it is
 * shared by every component that consumes the context, and updates are applied
 * immediately.
 */
export const FavouritesProvider = ({ children }) => {
  const [favourites, setFavourites] = useState(() => readStoredFavourites());

  // persist the list whenever it changes.  this also normalizes any invalid
  // or duplicated data that was read from storage.
  useEffect(() => {
    writeStoredFavourites(favourites);
  }, [favourites]);

  const add = useCallback((username) => {
    setFavourites((current) => addFavourite(current, username));
  }, []);

  const remove = useCallback((username) => {
    setFavourites((current) => removeFavourite(current, username));
  }, []);

  const toggle = useCallback((username) => {
    setFavourites((current) =>
      findFavourite(current, username) === undefined
        ? addFavourite(current, username)
        : removeFavourite(current, username),
    );
  }, []);

  const isFavourite = useCallback(
    (username) => findFavourite(favourites, username) !== undefined,
    [favourites],
  );

  const value = useMemo(
    () => ({ add, favourites, isFavourite, remove, toggle }),
    [add, favourites, isFavourite, remove, toggle],
  );

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
};

/**
 * Provides access to the list of favourite users.
 * @returns {{add: Function, favourites: string[], isFavourite: Function,
 * remove: Function, toggle: Function}} the favourites.
 */
export const useFavourites = () => {
  const context = useContext(FavouritesContext);

  if (!context) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }

  return context;
};

export default FavouritesContext;
