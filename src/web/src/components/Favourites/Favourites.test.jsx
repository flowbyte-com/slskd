import * as users from '../../lib/users';
import Favourites from './Favourites';
import { FavouritesProvider } from './FavouritesContext';
import FavouriteToggle from './FavouriteToggle';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route } from 'react-router-dom';

jest.mock('../../lib/users', () => ({
  getStatus: jest.fn(() => Promise.resolve({ data: { presence: 'Online' } })),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

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

const click = (element) => {
  act(() => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  });
};

const pressEnter = (element) => {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }),
    );
  });
};

const type = (input, value) => {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    ).set;

    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const findButton = (container, text) =>
  [...container.querySelectorAll('button, a')].find(
    (button) => button.textContent.trim() === text,
  );

const rows = (container) => [...container.querySelectorAll('tbody tr')];

describe('Favourites', () => {
  beforeEach(() => {
    localStorage.clear();
    users.getStatus.mockClear();
  });

  const renderFavourites = async () => {
    let location;

    const { container, unmount } = await render(
      <FavouritesProvider>
        <MemoryRouter initialEntries={['/favourites']}>
          <Route
            path="*"
            render={(props) => {
              location = props.location;
              return null;
            }}
          />
          <Favourites />
        </MemoryRouter>
      </FavouritesProvider>,
    );

    return { container, getLocation: () => location, unmount };
  };

  it('displays an empty state when there are no favourites', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    expect(container.textContent).toContain('No favourite users');
    expect(rows(container)).toHaveLength(0);

    unmount();
  });

  it('adds a username manually', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    expect(rows(container)).toHaveLength(1);
    expect(container.textContent).toContain('alice');
    expect(JSON.parse(localStorage.getItem('slskd-favourites'))).toEqual([
      'alice',
    ]);

    unmount();
  });

  it('does not add the same username twice', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');

    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    type(input, 'ALICE');
    click(container.querySelector('.favourites-input button'));

    expect(rows(container)).toHaveLength(1);
    expect(container.textContent).toContain('already a favourite');

    unmount();
  });

  it('rejects invalid usernames', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');

    type(input, '   ');
    pressEnter(input);

    expect(rows(container)).toHaveLength(0);
    expect(container.textContent).toContain('Enter a valid username');

    unmount();
  });

  it('removes a favourite without leaving the screen', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    expect(rows(container)).toHaveLength(1);

    click(findButton(container, 'Remove'));

    expect(rows(container)).toHaveLength(0);
    expect(container.textContent).toContain('No favourite users');
    expect(JSON.parse(localStorage.getItem('slskd-favourites'))).toEqual([]);

    unmount();
  });

  it('navigates to browse when a username is clicked', async () => {
    expect.hasAssertions();
    const { container, getLocation, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    click(container.querySelector('.favourites-username'));

    expect(getLocation().pathname).toBe('/browse');
    expect(getLocation().state).toEqual({ user: 'alice' });

    unmount();
  });

  it('navigates to browse when the browse action is used', async () => {
    expect.hasAssertions();
    const { container, getLocation, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    click(findButton(container, 'Browse'));

    expect(getLocation().pathname).toBe('/browse');
    expect(getLocation().state).toEqual({ user: 'alice' });

    unmount();
  });

  it('indicates that users are already favourited', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    const icon = container.querySelector(
      '.favourites-table .favourite-toggle i',
    );

    expect(icon.className).toContain('star');
    expect(icon.className).not.toContain('outline');

    unmount();
  });

  it('checks the presence of favourites once, without polling', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderFavourites();

    const input = container.querySelector('input[type="search"]');
    type(input, 'alice');
    click(container.querySelector('.favourites-input button'));

    expect(users.getStatus).toHaveBeenCalledTimes(1);
    expect(users.getStatus).toHaveBeenCalledWith({ username: 'alice' });

    unmount();
  });
});

describe('FavouriteToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderToggle = async (username) => {
    const { container, unmount } = await render(
      <FavouritesProvider>
        <FavouriteToggle username={username} />
      </FavouritesProvider>,
    );

    return { container, unmount };
  };

  it('renders an outlined star for users that are not favourites', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderToggle('alice');

    const icon = container.querySelector('.favourite-toggle i');

    expect(icon.className).toContain('outline');
    expect(container.querySelector('button').getAttribute('aria-pressed')).toBe(
      'false',
    );

    unmount();
  });

  it('renders a filled star for users that are favourites', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <FavouritesProvider>
        <FavouriteToggle username="alice" />
      </FavouritesProvider>,
    );

    click(container.querySelector('.favourite-toggle'));

    const icon = container.querySelector('.favourite-toggle i');

    expect(icon.className).toContain('star');
    expect(icon.className).not.toContain('outline');
    expect(container.querySelector('button').getAttribute('aria-pressed')).toBe(
      'true',
    );

    unmount();
  });

  it('toggles the favourite state when clicked', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderToggle('alice');

    click(container.querySelector('.favourite-toggle'));

    expect(JSON.parse(localStorage.getItem('slskd-favourites'))).toEqual([
      'alice',
    ]);

    click(container.querySelector('.favourite-toggle'));

    expect(JSON.parse(localStorage.getItem('slskd-favourites'))).toEqual([]);

    unmount();
  });

  it('provides an accessible label', async () => {
    expect.hasAssertions();
    const { container, unmount } = await renderToggle('alice');

    const button = container.querySelector('button');

    expect(button.getAttribute('aria-label')).toBe('Add alice to favourites');
    expect(button.getAttribute('title')).toBe('Add alice to favourites');

    unmount();
  });
});
