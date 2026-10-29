import './Favourites.css';
import { useFavourites } from './FavouritesContext';
import React from 'react';
import { Icon } from 'semantic-ui-react';

/**
 * Renders a star that toggles the favourite state of the given user.
 *
 * A filled star indicates that the user is a favourite; an outlined star
 * indicates that they are not.
 */
const FavouriteToggle = ({ className, size = 'small', username }) => {
  const { isFavourite, toggle } = useFavourites();

  if (!username) {
    return null;
  }

  const favourite = isFavourite(username);
  const label = favourite
    ? `Remove ${username} from favourites`
    : `Add ${username} to favourites`;

  return (
    <button
      aria-label={label}
      aria-pressed={favourite}
      className={[
        'ui',
        size,
        'icon',
        'basic',
        'button',
        'favourite-toggle',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => toggle(username)}
      title={label}
      type="button"
    >
      <Icon
        color={favourite ? 'yellow' : undefined}
        name={favourite ? 'star' : 'star outline'}
      />
    </button>
  );
};

export default FavouriteToggle;
