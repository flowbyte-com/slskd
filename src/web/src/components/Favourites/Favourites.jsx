import './Favourites.css';
import { urlBase } from '../../config';
import { buildBrowseLocation, isValidUsername } from '../../lib/favourites';
import * as users from '../../lib/users';
import PlaceholderSegment from '../Shared/PlaceholderSegment';
import { useFavourites } from './FavouritesContext';
import FavouriteToggle from './FavouriteToggle';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Button,
  Icon,
  Input,
  Label,
  Message,
  Segment,
  Table,
} from 'semantic-ui-react';

const presenceColors = {
  Away: 'yellow',
  Online: 'green',
  Offline: 'grey',
};

const Presence = ({ presence }) => (
  <>
    <Icon
      color={presenceColors[presence] ?? 'grey'}
      name="circle"
    />
    {presence ?? 'Unknown'}
  </>
);

const Favourites = () => {
  const { add, favourites, isFavourite, remove } = useFavourites();

  const [username, setUsername] = useState('');
  const [error, setError] = useState(undefined);
  const [statuses, setStatuses] = useState({});
  const [checking, setChecking] = useState(false);

  // tracks whether the component is still mounted so that in-flight requests
  // don't attempt to update state after the component has been unmounted.
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // fetch the presence of each favourite.  this is performed once per change
  // to the list of favourites, and on demand; it is never polled.
  const checkStatuses = useCallback(async () => {
    if (!favourites.length) {
      setStatuses({});
      return;
    }

    setChecking(true);

    const results = await Promise.all(
      favourites.map(async (favourite) => {
        try {
          const { data } = await users.getStatus({ username: favourite });
          return [favourite.toLowerCase(), data?.presence ?? 'Unknown'];
        } catch (statusError) {
          console.debug(`failed to retrieve status for ${favourite}`);
          return [
            favourite.toLowerCase(),
            statusError?.response?.status === 404 ? 'Offline' : 'Unknown',
          ];
        }
      }),
    );

    if (!mounted.current) {
      return;
    }

    setStatuses(Object.fromEntries(results));
    setChecking(false);
  }, [favourites]);

  useEffect(() => {
    checkStatuses();
  }, [checkStatuses]);

  const addFavourite = () => {
    const trimmed = username.trim();

    if (!isValidUsername(trimmed)) {
      setError('Enter a valid username.');
      return;
    }

    if (isFavourite(trimmed)) {
      setError(`${trimmed} is already a favourite.`);
      return;
    }

    add(trimmed);
    setUsername('');
    setError(undefined);
    toast.success(`Added ${trimmed} to favourites`);
  };

  const removeFavourite = (favourite) => {
    remove(favourite);
    toast.success(`Removed ${favourite} from favourites`);
  };

  return (
    <div className="favourites-container">
      <Segment
        className="favourites-segment"
        raised
      >
        <div className="favourites-segment-icon">
          <Icon
            name="star"
            size="big"
          />
        </div>
        <Input
          action={
            <Button
              disabled={!username.trim()}
              icon="plus"
              onClick={addFavourite}
            />
          }
          className="favourites-input"
          input={
            <input
              data-lpignore="true"
              placeholder="Username"
              type="search"
            />
          }
          onChange={(event) => {
            setUsername(event.target.value);
            setError(undefined);
          }}
          onKeyUp={(event) =>
            event.key === 'Enter' ? addFavourite() : undefined
          }
          placeholder="Username"
          size="big"
        />
      </Segment>
      {error && (
        <Message
          content={error}
          negative
          onDismiss={() => setError(undefined)}
        />
      )}
      {favourites.length === 0 ? (
        <PlaceholderSegment
          caption="No favourite users. Favourite a user to browse their shares quickly."
          icon="star"
        />
      ) : (
        <>
          <div className="favourites-toolbar">
            <Button
              content="Refresh Status"
              disabled={checking}
              icon="refresh"
              onClick={checkStatuses}
              size="small"
            />
            <span className="favourites-count">
              <Label size="small">{favourites.length}</Label> favourite
              {favourites.length === 1 ? '' : 's'}
            </span>
          </div>
          <Table
            celled
            className="favourites-table"
            striped
          >
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="favourites-header-username">
                  Username
                </Table.HeaderCell>
                <Table.HeaderCell className="favourites-header-status">
                  Status
                </Table.HeaderCell>
                <Table.HeaderCell className="favourites-header-actions">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {favourites.map((favourite) => (
                <Table.Row key={favourite.toLowerCase()}>
                  <Table.Cell>
                    <FavouriteToggle username={favourite} />
                    <Link
                      className="favourites-username"
                      to={buildBrowseLocation(favourite, urlBase)}
                    >
                      {favourite}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Presence presence={statuses[favourite.toLowerCase()]} />
                  </Table.Cell>
                  <Table.Cell className="favourites-actions">
                    <Button
                      as={Link}
                      content="Browse"
                      icon="folder open"
                      size="small"
                      to={buildBrowseLocation(favourite, urlBase)}
                    />
                    <Button
                      content="Remove"
                      icon="trash"
                      negative
                      onClick={() => removeFavourite(favourite)}
                      size="small"
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
    </div>
  );
};

export default Favourites;
