import { FavouritesProvider } from '../Favourites/FavouritesContext';
import Response from './Response';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('../../lib/transfers', () => ({ download: jest.fn() }));
jest.mock('../../lib/users', () => ({
  getDirectoryContents: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const response = {
  fileCount: 1,
  files: [
    {
      bitRate: 320,
      filename: '\\music\\song.mp3',
      isVariableBitRate: false,
      size: 1_000,
    },
  ],
  hasFreeUploadSlot: true,
  lockedFileCount: 0,
  lockedFiles: [],
  queueLength: 0,
  uploadSpeed: 1_000,
  username: 'SomeUser',
};

const render = async (element) => {
  const container = document.createElement('div');
  document.body.append(container);

  await act(async () => {
    ReactDOM.render(element, container);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });

      container.remove();
    },
  };
};

describe('Response', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders the username as a link to Browse', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <MemoryRouter initialEntries={['/searches/test']}>
        <FavouritesProvider>
          <Response
            disabled={false}
            isInitiallyFolded={false}
            onHide={() => {}}
            response={response}
          />
        </FavouritesProvider>
      </MemoryRouter>,
    );

    const link = container.querySelector('.result-username');

    expect(link).not.toBeNull();
    expect(link.textContent.trim()).toBe('SomeUser');
    expect(link.getAttribute('title')).toBe("Browse SomeUser's shared files");

    unmount();
  });

  it('navigates to Browse when the username is clicked', async () => {
    expect.hasAssertions();
    let location;

    const { container, unmount } = await render(
      <MemoryRouter initialEntries={['/searches/test']}>
        <Route
          path="*"
          render={(props) => {
            location = props.location;
            return null;
          }}
        />
        <FavouritesProvider>
          <Response
            disabled={false}
            isInitiallyFolded={false}
            onHide={() => {}}
            response={response}
          />
        </FavouritesProvider>
      </MemoryRouter>,
    );

    const link = container.querySelector('.result-username');

    act(() => {
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(location.pathname).toBe('/browse');
    expect(location.state).toEqual({ user: 'SomeUser' });

    unmount();
  });

  it('handles usernames with unusual characters', async () => {
    expect.hasAssertions();
    const unusual = {
      ...response,
      username: 'user name with spaces & symbols!',
    };

    let location;

    const { container, unmount } = await render(
      <MemoryRouter initialEntries={['/searches/test']}>
        <Route
          path="*"
          render={(props) => {
            location = props.location;
            return null;
          }}
        />
        <FavouritesProvider>
          <Response
            disabled={false}
            isInitiallyFolded={false}
            onHide={() => {}}
            response={unusual}
          />
        </FavouritesProvider>
      </MemoryRouter>,
    );

    const link = container.querySelector('.result-username');

    expect(link.textContent.trim()).toBe('user name with spaces & symbols!');

    act(() => {
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(location.pathname).toBe('/browse');
    expect(location.state).toEqual({
      user: 'user name with spaces & symbols!',
    });

    unmount();
  });

  it('renders the favourite toggle independently of the username link', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <MemoryRouter initialEntries={['/searches/test']}>
        <FavouritesProvider>
          <Response
            disabled={false}
            isInitiallyFolded={false}
            onHide={() => {}}
            response={response}
          />
        </FavouritesProvider>
      </MemoryRouter>,
    );

    expect(container.querySelector('.result-username')).not.toBeNull();
    expect(container.querySelector('.favourite-toggle')).not.toBeNull();

    unmount();
  });

  it('preserves file selection after rendering', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <MemoryRouter initialEntries={['/searches/test']}>
        <FavouritesProvider>
          <Response
            disabled={false}
            isInitiallyFolded={false}
            onHide={() => {}}
            response={response}
          />
        </FavouritesProvider>
      </MemoryRouter>,
    );

    expect(container.textContent).toContain('song.mp3');
    expect(container.querySelector('.filelist-filename')).not.toBeNull();

    unmount();
  });
});
