import { getResponses } from '../../../lib/searches';
import SearchDetail from './SearchDetail';
import { FavouritesProvider } from '../../Favourites/FavouritesContext';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../lib/searches', () => ({
  ...jest.requireActual('../../../lib/searches'),
  getResponses: jest.fn(),
}));

// the result cards display a favourite toggle, which requires the favourites
// provider.  it isn't relevant to these tests, so it's mocked out.
jest.mock(
  '../../Favourites/FavouriteToggle',
  () => ({ __esModule: true, default: () => null }),
  { virtual: true },
);

const responses = [
  {
    fileCount: 3,
    files: [
      {
        bitRate: 320,
        filename: '\\music\\cbr.mp3',
        isVariableBitRate: false,
        size: 100,
      },
      {
        bitRate: 128,
        filename: '\\music\\low.mp3',
        isVariableBitRate: true,
        size: 100,
      },
      {
        bitDepth: 16,
        filename: '\\music\\lossless.flac',
        sampleRate: 44_100,
        size: 200,
      },
    ],
    hasFreeUploadSlot: true,
    lockedFileCount: 0,
    lockedFiles: [],
    queueLength: 0,
    uploadSpeed: 1_000,
    username: 'alice',
  },
];

const search = {
  fileCount: 3,
  id: 'search-id',
  isComplete: true,
  lockedFileCount: 0,
  responseCount: 1,
  state: 'Completed',
};

const render = async (element) => {
  const container = document.createElement('div');
  document.body.append(container);

  await act(async () => {
    ReactDOM.render(element, container);
  });

  // the component waits half a second before fetching the results
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 600);
    });
  });

  return {
    container,
    rerender: async (next) => {
      await act(async () => {
        ReactDOM.render(next, container);
      });

      // the component waits half a second before fetching the results
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 600);
        });
      });
    },
    unmount: () => {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });

      container.remove();
    },
  };
};

const fileNames = (container) =>
  [...container.querySelectorAll('tbody .filelist-filename')].map((cell) =>
    cell.textContent.trim(),
  );

const renderDetail = async (element) => {
  const rendered = await render(element);
  return rendered;
};

const detail = (props = {}) => (
  <MemoryRouter initialEntries={['/searches/test']}>
    <FavouritesProvider>
      <SearchDetail
        creating={false}
        disabled={false}
        onCreate={() => {}}
        onRemove={() => {}}
        onStop={() => {}}
        removing={false}
        search={search}
        stopping={false}
        {...props}
      />
    </FavouritesProvider>
  </MemoryRouter>
);

describe('SearchDetail', () => {
  beforeEach(() => {
    localStorage.clear();
    getResponses.mockReset();
    getResponses.mockResolvedValue(responses);
  });

  it('displays all of the results when no filters are applied', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual([
      'cbr.mp3',
      'lossless.flac',
      'low.mp3',
    ]);

    unmount();
  });

  it('applies the persisted visual filters to the results', async () => {
    expect.hasAssertions();
    localStorage.setItem(
      'slskd-search-preferences',
      JSON.stringify({
        advancedFilters: '',
        encoding: 'any',
        format: 'mp3',
        freeSlotsOnly: false,
        minBitRate: 0,
      }),
    );

    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual(['cbr.mp3', 'low.mp3']);

    unmount();
  });

  it('combines the visual filters with the advanced filters', async () => {
    expect.hasAssertions();
    localStorage.setItem(
      'slskd-search-preferences',
      JSON.stringify({
        advancedFilters: 'minbr:256',
        encoding: 'any',
        format: 'mp3',
        freeSlotsOnly: false,
        minBitRate: 0,
      }),
    );

    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual(['cbr.mp3']);

    unmount();
  });

  it('applies the minimum bitrate from the visual filters', async () => {
    expect.hasAssertions();
    localStorage.setItem(
      'slskd-search-preferences',
      JSON.stringify({
        advancedFilters: '',
        encoding: 'any',
        format: 'any',
        freeSlotsOnly: false,
        minBitRate: 256,
      }),
    );

    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual(['cbr.mp3']);

    unmount();
  });

  it('applies the encoding filter from the visual filters', async () => {
    expect.hasAssertions();
    localStorage.setItem(
      'slskd-search-preferences',
      JSON.stringify({
        advancedFilters: '',
        encoding: 'cbr',
        format: 'any',
        freeSlotsOnly: false,
        minBitRate: 0,
      }),
    );

    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual(['cbr.mp3']);

    unmount();
  });

  it('does not reset the preferences when the results change', async () => {
    expect.hasAssertions();
    localStorage.setItem(
      'slskd-search-preferences',
      JSON.stringify({
        advancedFilters: '',
        encoding: 'any',
        format: 'mp3',
        freeSlotsOnly: false,
        minBitRate: 0,
      }),
    );

    const { container, rerender, unmount } = await renderDetail(detail());

    expect(
      container.querySelector('#search-filter-format .text').textContent.trim(),
    ).toBe('MP3');

    await rerender(detail({ search: { ...search, id: 'another-search-id' } }));

    expect(
      container.querySelector('#search-filter-format .text').textContent.trim(),
    ).toBe('MP3');

    unmount();
  });

  it('handles empty results', async () => {
    expect.hasAssertions();
    getResponses.mockResolvedValue([]);

    const { container, unmount } = await renderDetail(detail());

    expect(fileNames(container)).toEqual([]);

    unmount();
  });
});
