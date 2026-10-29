import {
  searchFilterBitRates,
  searchFilterEncodings,
  searchFilterFormats,
  supportsSearchFilterBitRate,
} from '../../lib/searchFilters';
import {
  createSearchPreset,
  deleteSearchPreset,
  getSearchPresets,
  readStoredSearchPresets,
  renameSearchPreset,
  writeStoredSearchPresets,
} from '../../lib/searchPresets';
import SearchPresets from './SearchPresets';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dropdown,
  Form,
  Header,
  Icon,
  Message,
  Segment,
} from 'semantic-ui-react';

const availabilityOptions = [
  {
    key: 'free',
    text: 'Only show users with free upload slots',
    value: 'free',
  },
  {
    key: 'all',
    text: 'Include users without free slots',
    value: 'all',
  },
];

const SearchFilterPanel = ({ conflicts = [], filters, onChange, onReset }) => {
  const [customPresets, setCustomPresets] = useState(() =>
    readStoredSearchPresets(),
  );

  useEffect(() => {
    writeStoredSearchPresets(customPresets);
  }, [customPresets]);

  const presets = useMemo(
    () => getSearchPresets(customPresets),
    [customPresets],
  );

  // bitrate and encoding filters don't apply to lossless formats.
  const bitRateSupported = supportsSearchFilterBitRate(filters?.format);

  const changeFormat = (format) => {
    const next = { ...filters, format };

    if (!supportsSearchFilterBitRate(format)) {
      // the bitrate and encoding filters are cleared, rather than silently
      // ignored, when a lossless format is selected.
      next.encoding = 'any';
      next.minBitRate = 0;
    }

    onChange(next);
  };

  const applyPreset = (preset) => {
    onChange({ ...filters, ...preset.filters });
  };

  return (
    <Segment
      className="search-filter-panel"
      raised
    >
      <Header className="search-filter-panel-header">
        <Icon name="filter" />
        <span>Result Filters</span>
        <Button
          className="search-filter-panel-reset"
          content="Reset Filters"
          icon="undo"
          onClick={onReset}
          size="small"
        />
      </Header>
      <Form className="search-filter-panel-form">
        <Form.Group widths="equal">
          <Form.Field>
            <label htmlFor="search-filter-format">File Format</label>
            <Dropdown
              aria-label="File Format"
              id="search-filter-format"
              onChange={(_event, data) => changeFormat(data.value)}
              options={searchFilterFormats.map((format) => ({
                key: format.key,
                text: format.text,
                value: format.key,
              }))}
              selection
              value={filters?.format ?? 'any'}
            />
          </Form.Field>
          <Form.Field>
            <label htmlFor="search-filter-min-bit-rate">Minimum Bitrate</label>
            <Dropdown
              aria-label="Minimum Bitrate"
              disabled={!bitRateSupported}
              id="search-filter-min-bit-rate"
              onChange={(_event, data) =>
                onChange({ ...filters, minBitRate: data.value })
              }
              options={searchFilterBitRates}
              selection
              value={filters?.minBitRate ?? 0}
            />
          </Form.Field>
          <Form.Field>
            <label htmlFor="search-filter-encoding">Encoding</label>
            <Dropdown
              aria-label="Encoding"
              disabled={!bitRateSupported}
              id="search-filter-encoding"
              onChange={(_event, data) =>
                onChange({ ...filters, encoding: data.value })
              }
              options={searchFilterEncodings}
              selection
              value={filters?.encoding ?? 'any'}
            />
          </Form.Field>
          <Form.Field>
            <label htmlFor="search-filter-availability">Availability</label>
            <Dropdown
              aria-label="Availability"
              id="search-filter-availability"
              onChange={(_event, data) =>
                onChange({ ...filters, freeSlotsOnly: data.value === 'free' })
              }
              options={availabilityOptions}
              selection
              value={filters?.freeSlotsOnly ? 'free' : 'all'}
            />
          </Form.Field>
        </Form.Group>
        {!bitRateSupported && (
          <Message
            className="search-filter-panel-note"
            content="Bitrate and encoding filters do not apply to lossless formats, and have been cleared."
            info
            size="small"
          />
        )}
        {conflicts.map((conflict) => (
          <Message
            className="search-filter-panel-note"
            content={conflict}
            key={conflict}
            negative
          />
        ))}
      </Form>
      <SearchPresets
        onApply={applyPreset}
        onCreate={(name) =>
          setCustomPresets((current) =>
            createSearchPreset(current, { filters, name }),
          )
        }
        onDelete={(id) =>
          setCustomPresets((current) => deleteSearchPreset(current, id))
        }
        onRename={(id, name) =>
          setCustomPresets((current) => renameSearchPreset(current, id, name))
        }
        presets={presets}
      />
    </Segment>
  );
};

export default SearchFilterPanel;
