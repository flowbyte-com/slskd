import {
  filterResponse,
  getResponses,
  parseFiltersFromString,
} from '../../../lib/searches';
import {
  combineSearchFilters,
  defaultSearchPreferences,
  readSearchPreferences,
  splitSearchPreferences,
  writeSearchPreferences,
} from '../../../lib/searchFilters';
import { sleep } from '../../../lib/util';
import ErrorSegment from '../../Shared/ErrorSegment';
import LoaderSegment from '../../Shared/LoaderSegment';
import Switch from '../../Shared/Switch';
import Response from '../Response';
import SearchFilterPanel from '../SearchFilterPanel';
import SearchDetailHeader from './SearchDetailHeader';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Dropdown, Input, Segment } from 'semantic-ui-react';

const sortDropdownOptions = [
  {
    key: 'uploadSpeed',
    text: 'Upload Speed (Fastest to Slowest)',
    value: 'uploadSpeed',
  },
  {
    key: 'queueLength',
    text: 'Queue Depth (Least to Most)',
    value: 'queueLength',
  },
];

const SearchDetail = ({
  creating,
  disabled,
  onCreate,
  onRemove,
  onStop,
  removing,
  search,
  stopping,
}) => {
  const { fileCount, id, isComplete, lockedFileCount, responseCount, state } =
    search;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);

  const [results, setResults] = useState([]);

  // filters and sorting options
  const [hiddenResults, setHiddenResults] = useState([]);
  const [resultSort, setResultSort] = useState('uploadSpeed');
  const [hideLocked, setHideLocked] = useState(true);
  const [foldResults, setFoldResults] = useState(false);
  const [preferences, setPreferences] = useState(() => readSearchPreferences());
  const [displayCount, setDisplayCount] = useState(5);

  // the visual filters, and the advanced (textual) filter
  const { advancedFilters: resultFilters, filters: visualFilters } = useMemo(
    () => splitSearchPreferences(preferences),
    [preferences],
  );

  // the user's filter preferences are persisted, and are not reset when the
  // user moves between searches.
  useEffect(() => {
    writeSearchPreferences(preferences);
  }, [preferences]);

  const updateFilters = (filters) => {
    setPreferences((current) => ({ ...current, ...filters }));
  };

  const setAdvancedFilters = (advancedFilters) => {
    setPreferences((current) => ({ ...current, advancedFilters }));
  };

  const resetFilters = () => {
    setPreferences({ ...defaultSearchPreferences });
  };

  // when the search transitions from !isComplete -> isComplete,
  // fetch the results from the server
  useEffect(() => {
    const get = async () => {
      try {
        setLoading(true);

        // the results may not be ready yet.  this is very rare, but
        // if it happens the search will complete with no results.
        await sleep(500);

        const responses = await getResponses({ id });
        setResults(responses);
        setLoading(false);
      } catch (getError) {
        setError(getError);
        setLoading(false);
      }
    };

    if (isComplete) {
      get();
    }
  }, [id, isComplete]);

  // the visual filters and the advanced filter are applied together; a file
  // must satisfy both.
  const { conflicts, filters: combinedFilters } = useMemo(
    () =>
      combineSearchFilters(
        parseFiltersFromString(resultFilters),
        visualFilters,
      ),
    [resultFilters, visualFilters],
  );

  // apply sorting and filters.  this can take a while for larger result
  // sets, so memoize it.
  const sortedAndFilteredResults = useMemo(() => {
    const sortOptions = {
      queueLength: { field: 'queueLength', order: 'asc' },
      uploadSpeed: { field: 'uploadSpeed', order: 'desc' },
    };

    const { field, order } = sortOptions[resultSort];

    return results
      .filter((r) => !hiddenResults.includes(r.username))
      .map((r) => {
        if (hideLocked) {
          return { ...r, lockedFileCount: 0, lockedFiles: [] };
        }

        return r;
      })
      .map((response) => filterResponse({ filters: combinedFilters, response }))
      .filter((r) => r.fileCount + r.lockedFileCount > 0)
      .filter((r) => !(visualFilters.freeSlotsOnly && !r.hasFreeUploadSlot))
      .sort((a, b) => {
        if (order === 'asc') {
          return a[field] - b[field];
        }

        return b[field] - a[field];
      });
  }, [
    combinedFilters,
    hiddenResults,
    hideLocked,
    resultSort,
    results,
    visualFilters.freeSlotsOnly,
  ]);

  // when a user uses the action buttons, we will *probably* re-use this component,
  // but with a new search ID.  clear everything to prepare for the transition
  const reset = () => {
    setLoading(false);
    setError(undefined);
    setResults([]);
    setHiddenResults([]);
    setDisplayCount(5);
  };

  const create = async ({ navigate, search: searchForCreate }) => {
    reset();
    onCreate({ navigate, search: searchForCreate });
  };

  const remove = async () => {
    reset();
    onRemove(search);
  };

  const filteredCount = results?.length - sortedAndFilteredResults.length;
  const remainingCount = sortedAndFilteredResults.length - displayCount;
  const loaded = !removing && !creating && !loading && results;

  if (error) {
    return <ErrorSegment caption={error?.message ?? error} />;
  }

  return (
    <>
      <SearchDetailHeader
        creating={creating}
        disabled={disabled}
        loaded={loaded}
        loading={loading}
        onCreate={create}
        onRemove={remove}
        onStop={onStop}
        removing={removing}
        search={search}
        stopping={stopping}
      />
      <Switch
        loading={loading && <LoaderSegment />}
        searching={
          !isComplete && (
            <LoaderSegment>
              {state === 'InProgress'
                ? `Found ${fileCount} files ${
                    lockedFileCount > 0
                      ? `(plus ${lockedFileCount} locked) `
                      : ''
                  }from ${responseCount} users`
                : 'Loading results...'}
            </LoaderSegment>
          )
        }
      >
        {loaded && (
          <>
            <SearchFilterPanel
              conflicts={conflicts}
              filters={visualFilters}
              onChange={updateFilters}
              onReset={resetFilters}
            />
            <Segment
              className="search-options"
              raised
            >
              <Dropdown
                button
                className="search-options-sort icon"
                floating
                icon="sort"
                labeled
                onChange={(_event, { value }) => setResultSort(value)}
                options={sortDropdownOptions}
                text={
                  sortDropdownOptions.find((o) => o.value === resultSort).text
                }
              />
              <div className="search-option-toggles">
                <Checkbox
                  checked={hideLocked}
                  className="search-options-hide-locked"
                  label="Hide Locked Results"
                  onChange={() => setHideLocked(!hideLocked)}
                  toggle
                />
                <Checkbox
                  checked={foldResults}
                  className="search-options-fold-results"
                  label="Fold Results"
                  onChange={() => setFoldResults(!foldResults)}
                  toggle
                />
              </div>
              <Input
                action={
                  Boolean(resultFilters) && {
                    color: 'red',
                    icon: 'x',
                    onClick: () => setAdvancedFilters(''),
                  }
                }
                className="search-filter"
                label={{ content: 'Advanced Filter', icon: 'filter' }}
                onChange={(_event, data) => setAdvancedFilters(data.value)}
                placeholder="
                  lackluster container -bothersome iscbr|isvbr islossless|islossy
                  minbitrate:320 bitrate:320 minbitdepth:24 minfilesize:10 minfilesinfolder:8 minlength:5000
                "
                value={resultFilters}
              />
            </Segment>
          </>
        )}
        {loaded &&
          sortedAndFilteredResults.slice(0, displayCount).map((r) => (
            <Response
              disabled={disabled}
              isInitiallyFolded={foldResults}
              key={r.username}
              onHide={() => setHiddenResults([...hiddenResults, r.username])}
              response={r}
            />
          ))}
        {loaded &&
          (remainingCount > 0 ? (
            <Button
              className="showmore-button"
              fluid
              onClick={() => setDisplayCount(displayCount + 5)}
              primary
              size="large"
            >
              Show {remainingCount > 5 ? 5 : remainingCount} More Results{' '}
              {`(${remainingCount} remaining, ${filteredCount} hidden by filter(s))`}
            </Button>
          ) : filteredCount > 0 ? (
            <Button
              className="showmore-button"
              disabled
              fluid
              size="large"
            >{`All results shown. ${filteredCount} results hidden by filter(s)`}</Button>
          ) : (
            ''
          ))}
      </Switch>
    </>
  );
};

export default SearchDetail;
