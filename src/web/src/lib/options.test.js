import api from './api';
import * as options from './options';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

describe('options overlay api', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: {} });
    api.patch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the configured default from /options/startup', async () => {
    expect.hasAssertions();
    api.get.mockResolvedValue({ data: { soulseek: { listenPort: 51_999 } } });

    const result = await options.getStartup();

    expect(api.get).toHaveBeenCalledWith('/options/startup');
    expect(result.soulseek.listenPort).toBe(51_999);
  });

  it('applies a port overlay with PATCH /options without touching yaml', async () => {
    expect.hasAssertions();
    await options.applyOverlay({
      overlay: { soulseek: { listenPort: 52_342 } },
    });

    expect(api.patch).toHaveBeenCalledWith('/options', {
      soulseek: { listenPort: 52_342 },
    });
  });

  it('restores a nonstandard default by patching the configured value', async () => {
    expect.hasAssertions();
    await options.applyOverlay({
      overlay: { soulseek: { listenPort: 51_999 } },
    });

    expect(api.patch.mock.calls[0][1]).toEqual({
      soulseek: { listenPort: 51_999 },
    });
  });
});
