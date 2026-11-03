import { compareDirectoryNames, getDirectoryTree } from './Browse';
import { filterTree } from './DirectoryTree';
import FileBrowser from './FileBrowser';
import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

const directory = (name, options = {}) => ({
  fileCount: 0,
  files: [],
  name,
  ...options,
});

const names = (directories) => directories.map((entry) => entry.name);
const displayNames = (directories) =>
  directories.map((entry) => entry.name.split(/[/\\]/u).pop());

const ownText = (element) =>
  [...element.childNodes]
    .find((node) => node.nodeType === Node.TEXT_NODE)
    ?.textContent.trim();

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

describe('Browse directory sorting', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('sorts root directories alphabetically without mutating the response', () => {
    expect.hasAssertions();
    const directories = [
      directory('Zulu'),
      directory('music'),
      directory('Alpha'),
      directory('beta'),
    ];
    const originalOrder = names(directories);

    const tree = getDirectoryTree({ directories, separator: '\\' });

    expect(names(tree)).toEqual(['Alpha', 'beta', 'music', 'Zulu']);
    expect(names(directories)).toEqual(originalOrder);
  });

  it('sorts roots by their displayed names rather than parent paths', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Zebra\\Alpha'),
        directory('Middle'),
        directory('Alphabet\\Zulu'),
      ],
      separator: '\\',
    });

    expect(tree.map((entry) => entry.name.split('\\').pop())).toEqual([
      'Alpha',
      'Middle',
      'Zulu',
    ]);
  });

  it('sorts nested siblings while preserving the hierarchy and counts', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Music\\Albums\\Rock', {
          files: [{ filename: 'rock.mp3' }],
        }),
        directory('Music\\Archive', { files: [{ filename: 'old.mp3' }] }),
        directory('Music\\Albums\\Jazz', {
          files: [{ filename: 'jazz.mp3' }],
        }),
        directory('Music\\Albums', { files: [{ filename: 'album.mp3' }] }),
        directory('Music', { files: [{ filename: 'root.mp3' }] }),
        directory('Music\\Albums\\Electronic'),
      ],
      separator: '\\',
    });

    expect(names(tree)).toEqual(['Music']);
    expect(displayNames(tree[0].children)).toEqual(['Albums', 'Archive']);
    expect(displayNames(tree[0].children[0].children)).toEqual([
      'Electronic',
      'Jazz',
      'Rock',
    ]);
    expect(tree[0].children[0].children[1].files).toEqual([
      { filename: 'jazz.mp3' },
    ]);
    expect(tree[0].totalDirectoryCount).toBe(5);
    expect(tree[0].totalFileCount).toBe(5);
    expect(tree[0].children[0].totalDirectoryCount).toBe(3);
    expect(tree[0].children[0].totalFileCount).toBe(3);
  });

  it('sorts case-insensitively', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('banana'),
        directory('APPLE'),
        directory('Cherry'),
      ],
      separator: '\\',
    });

    expect(names(tree)).toEqual(['APPLE', 'banana', 'Cherry']);
    expect(compareDirectoryNames(directory('apple'), directory('APPLE'))).toBe(
      0,
    );
  });

  it('sorts numbers naturally', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: ['Folder 10', 'Folder 2', 'Folder 1', 'Folder 20'].map(
        (name) => directory(name),
      ),
      separator: '\\',
    });

    expect(names(tree)).toEqual([
      'Folder 1',
      'Folder 2',
      'Folder 10',
      'Folder 20',
    ]);
  });

  it('handles accented names and symbols sensibly', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Zebra'),
        directory('apple'),
        directory('Éclair'),
        directory('Ámbar'),
        directory('[Compilations]'),
        directory('_private'),
      ],
      separator: '\\',
    });

    expect(names(tree)).toEqual([
      '_private',
      '[Compilations]',
      'Ámbar',
      'apple',
      'Éclair',
      'Zebra',
    ]);
  });

  it('sorts locked directories alongside unlocked siblings', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Music\\Zulu'),
        directory('Music\\Alpha', { locked: true }),
        directory('Music'),
        directory('Zulu'),
        directory('Alpha', { locked: true }),
      ],
      separator: '\\',
    });

    expect(names(tree)).toEqual(['Alpha', 'Music', 'Zulu']);
    expect(tree[0].locked).toBe(true);
    expect(displayNames(tree[1].children)).toEqual(['Alpha', 'Zulu']);
    expect(tree[1].children[0].locked).toBe(true);
    expect(tree[1].children[1].locked).toBeUndefined();
  });

  it('keeps filtered Browse results in sorted sibling order', () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Folder 10\\Sub B'),
        directory('Music\\Folder 2'),
        directory('Music\\Folder 2\\Sub A'),
        directory('Music\\Folder 2\\Sub B'),
        directory('Folder 2\\Sub A'),
        directory('Folder 2\\Sub B'),
        directory('Folder 10'),
        directory('Folder 2'),
        directory('Folder 1'),
        directory('Music'),
      ],
      separator: '\\',
    });

    expect(filterTree(tree, 'FOLDER').map(({ node }) => node.name)).toEqual([
      'Folder 1',
      'Folder 2',
      'Folder 10',
      'Music',
      'Music\\Folder 2',
    ]);
    expect(filterTree(tree, 'sub').map(({ node }) => node.name)).toEqual([
      'Folder 2',
      'Folder 2\\Sub A',
      'Folder 2\\Sub B',
      'Folder 10',
      'Folder 10\\Sub B',
      'Music',
      'Music\\Folder 2',
      'Music\\Folder 2\\Sub A',
      'Music\\Folder 2\\Sub B',
    ]);
  });

  it('builds and filters large hierarchies without a noticeable delay', () => {
    expect.hasAssertions();
    const rootCount = 100;
    const childCount = 200;
    const filesPerDirectory = 5;
    const directories = [];

    // build the input in reverse so every sibling list needs sorting
    for (let rootIndex = rootCount - 1; rootIndex >= 0; rootIndex--) {
      const rootName = `Root ${rootIndex}`;
      directories.push(directory(rootName));

      for (let childIndex = childCount - 1; childIndex >= 0; childIndex--) {
        const files = Array.from(
          { length: filesPerDirectory },
          (_, fileIndex) => ({ filename: `File ${fileIndex}.mp3` }),
        );
        directories.push(
          directory(`${rootName}\\Folder ${childIndex}`, {
            fileCount: files.length,
            files,
          }),
        );
      }
    }

    const buildStartedAt = Date.now();
    const tree = getDirectoryTree({ directories, separator: '\\' });
    const buildTime = Date.now() - buildStartedAt;

    expect(tree).toHaveLength(rootCount);
    expect(names(tree).slice(0, 3)).toEqual(['Root 0', 'Root 1', 'Root 2']);
    expect(displayNames(tree[0].children).slice(0, 3)).toEqual([
      'Folder 0',
      'Folder 1',
      'Folder 2',
    ]);
    expect(displayNames(tree[0].children).slice(-3)).toEqual([
      'Folder 197',
      'Folder 198',
      'Folder 199',
    ]);
    expect(tree[0].totalDirectoryCount).toBe(childCount);
    expect(tree[0].totalFileCount).toBe(childCount * filesPerDirectory);

    const filterStartedAt = Date.now();
    const filtered = filterTree(tree, 'Folder 19');
    const filterTime = Date.now() - filterStartedAt;

    expect(filtered.length).toBeGreaterThan(0);
    expect(buildTime).toBeLessThan(5_000);
    expect(filterTime).toBeLessThan(5_000);
  }, 20_000);
});

describe('FileBrowser directory ordering', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders the directory entries in sorted order', async () => {
    expect.hasAssertions();
    const tree = getDirectoryTree({
      directories: [
        directory('Music\\Zulu'),
        directory('Music\\Albums'),
        directory('Music\\Alpha'),
        directory('Music'),
      ],
      separator: '\\',
    });

    const { container, unmount } = await render(
      <FileBrowser
        disabled={false}
        expandedDirectory={null}
        files={[]}
        locked={false}
        onExpandedDirectoryChange={() => {}}
        onSelectionChange={() => {}}
        rootDirectory={tree[0]}
        separator={'\\'}
      />,
    );

    const renderedNames = [...container.querySelectorAll('tbody tr')].map(
      (row) => ownText(row.querySelector('.filelist-filename')),
    );

    expect(renderedNames).toEqual(['Albums', 'Alpha', 'Zulu']);

    unmount();
  });
});
