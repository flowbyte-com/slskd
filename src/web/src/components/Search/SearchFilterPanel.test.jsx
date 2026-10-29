import { defaultSearchFilters } from '../../lib/searchFilters';
import SearchFilterPanel from './SearchFilterPanel';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

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

const findByText = (selector, text) =>
  [...document.querySelectorAll(selector)].find(
    (element) => element.textContent.trim() === text,
  );

const dropdownText = (container, id) =>
  container.querySelector(`#${id} .text`)?.textContent.trim();

const Harness = ({ onChange, onReset }) => {
  const [filters, setFilters] = useState({ ...defaultSearchFilters });

  return (
    <SearchFilterPanel
      conflicts={[]}
      filters={filters}
      onChange={(next) => {
        onChange?.(next);
        setFilters(next);
      }}
      onReset={() => {
        onReset?.();
        setFilters({ ...defaultSearchFilters });
      }}
    />
  );
};

describe('SearchFilterPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('displays the current filters', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(dropdownText(container, 'search-filter-format')).toBe('Any');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe('Any');
    expect(dropdownText(container, 'search-filter-encoding')).toBe('Any');
    expect(dropdownText(container, 'search-filter-availability')).toBe(
      'Include users without free slots',
    );

    unmount();
  });

  it('applies a built in preset and updates the controls', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(findByText('.search-filter-presets-list button', '320 MP3'));

    expect(dropdownText(container, 'search-filter-format')).toBe('MP3');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe(
      '320 kbps',
    );
    expect(dropdownText(container, 'search-filter-encoding')).toBe('Any');

    unmount();
  });

  it('applies the 320 MP3 CBR preset', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(findByText('.search-filter-presets-list button', '320 MP3 CBR'));

    expect(dropdownText(container, 'search-filter-format')).toBe('MP3');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe(
      '320 kbps',
    );
    expect(dropdownText(container, 'search-filter-encoding')).toBe('CBR');

    unmount();
  });

  it('applies the FLAC Only preset', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(findByText('.search-filter-presets-list button', 'FLAC Only'));

    expect(dropdownText(container, 'search-filter-format')).toBe('FLAC');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe('Any');

    unmount();
  });

  it('applies the Anything Goes preset', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(findByText('.search-filter-presets-list button', '320 MP3'));
    click(findByText('.search-filter-presets-list button', 'Anything Goes'));

    expect(dropdownText(container, 'search-filter-format')).toBe('Any');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe('Any');
    expect(dropdownText(container, 'search-filter-encoding')).toBe('Any');

    unmount();
  });

  it('resets the filters', async () => {
    expect.hasAssertions();
    const onReset = jest.fn();

    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={onReset}
      />,
    );

    click(findByText('.search-filter-presets-list button', '320 MP3'));

    expect(dropdownText(container, 'search-filter-format')).toBe('MP3');

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent.trim() === 'Reset Filters',
      ),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(dropdownText(container, 'search-filter-format')).toBe('Any');
    expect(dropdownText(container, 'search-filter-min-bit-rate')).toBe('Any');

    unmount();
  });

  it('creates a custom preset from the current filters', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(findByText('.search-filter-presets-list button', '320 MP3'));

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent.trim() === 'Save Current Filters',
      ),
    );

    const input = container.querySelector('.search-filter-preset-edit input');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;

      setter.call(input, 'Mine');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent.trim() === 'Save',
      ),
    );

    expect(
      findByText('.search-filter-presets-list button', 'Mine'),
    ).toBeDefined();

    const stored = JSON.parse(localStorage.getItem('slskd-search-presets'));

    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Mine');
    expect(stored[0].filters.format).toBe('mp3');
    expect(stored[0].filters.minBitRate).toBe(320);

    unmount();
  });

  it('deletes a custom preset', async () => {
    expect.hasAssertions();
    const { container, unmount } = await render(
      <Harness
        onChange={() => {}}
        onReset={() => {}}
      />,
    );

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent.trim() === 'Save Current Filters',
      ),
    );

    const input = container.querySelector('.search-filter-preset-edit input');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;

      setter.call(input, 'Mine');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.textContent.trim() === 'Save',
      ),
    );

    expect(
      findByText('.search-filter-presets-list button', 'Mine'),
    ).toBeDefined();

    click(
      [...container.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Delete preset Mine',
      ),
    );

    expect(
      findByText('.search-filter-presets-list button', 'Mine'),
    ).toBeUndefined();

    unmount();
  });
});
