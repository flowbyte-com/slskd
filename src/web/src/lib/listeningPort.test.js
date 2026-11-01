import {
  applyListeningPort,
  BACKEND_MIN_LISTEN_PORT,
  buildPortOverlay,
  buildResetOverlay,
  DEFAULT_LISTEN_PORT,
  getConfiguredListenPort,
  getEffectiveListenPort,
  isPortOverridden,
  MAX_LISTEN_PORT,
  MIN_LISTEN_PORT,
  parsePortInput,
  resolveResetTarget,
} from './listeningPort';

const setupApplyTest = ({
  currentAfterApply,
  startupPort = 50_300,
  effectivePort = 50_300,
} = {}) => {
  const applied = [];
  const applyOverlayFn = jest.fn(async (overlay) => {
    applied.push(overlay);
    return {};
  });
  const getCurrentFn = jest.fn(async () => ({
    soulseek: { listenPort: currentAfterApply },
  }));
  return {
    applied,
    applyOverlayFn,
    effectivePort,
    getCurrentFn,
    startupPort,
  };
};

describe('parsePortInput', () => {
  it('treats empty input as Use Default without a validation error', () => {
    expect(parsePortInput('')).toEqual({
      empty: true,
      error: undefined,
      port: undefined,
      text: '',
    });
    expect(parsePortInput('   ').empty).toBe(true);
    expect(parsePortInput('   ').error).toBeUndefined();
    expect(parsePortInput(undefined).empty).toBe(true);
    expect(parsePortInput(null).empty).toBe(true);
  });

  it('accepts a manual port between 1 and 65535', () => {
    expect(parsePortInput('1').port).toBe(1);
    expect(parsePortInput('50300').port).toBe(50_300);
    expect(parsePortInput('65535').port).toBe(65_535);
    expect(parsePortInput(' 52342 ').port).toBe(52_342);
    expect(parsePortInput('02234').port).toBe(2_234);
  });

  it('rejects invalid inputs', () => {
    for (const input of [
      '0',
      '65536',
      '-1',
      'abc',
      '12.5',
      '50 300',
      'port',
      '0x10',
    ]) {
      const result = parsePortInput(input);
      expect(result.error).toBe('Enter a port between 1 and 65535.');
      expect(result.port).toBeUndefined();
      expect(result.empty).toBe(false);
    }
  });

  it('allows ports below the backend minimum so the API failure can be surfaced', () => {
    expect(BACKEND_MIN_LISTEN_PORT).toBe(1_024);
    expect(parsePortInput('100').port).toBe(100);
    expect(parsePortInput('1023').port).toBe(1_023);
  });

  it('exposes the documented bounds', () => {
    expect(MIN_LISTEN_PORT).toBe(1);
    expect(MAX_LISTEN_PORT).toBe(65_535);
  });
});

describe('port selectors', () => {
  it('reads camelCase and PascalCase shapes', () => {
    expect(getEffectiveListenPort({ soulseek: { listenPort: 50_300 } })).toBe(
      50_300,
    );
    expect(getEffectiveListenPort({ Soulseek: { ListenPort: 52_342 } })).toBe(
      52_342,
    );
    expect(getConfiguredListenPort({ soulseek: { listenPort: 51_999 } })).toBe(
      51_999,
    );
    expect(getEffectiveListenPort({})).toBeUndefined();
    expect(getEffectiveListenPort(undefined)).toBeUndefined();
    expect(getEffectiveListenPort({ soulseek: {} })).toBeUndefined();
  });

  it('resolves the reset target without hard-coding 50300 when a configured default exists', () => {
    expect(resolveResetTarget(51_999)).toBe(51_999);
    expect(resolveResetTarget(1_024)).toBe(1_024);
  });

  it('falls back to the built-in default when no port is configured', () => {
    expect(resolveResetTarget(undefined)).toBe(DEFAULT_LISTEN_PORT);
    expect(resolveResetTarget(null)).toBe(DEFAULT_LISTEN_PORT);
    expect(resolveResetTarget(0)).toBe(DEFAULT_LISTEN_PORT);
    expect(DEFAULT_LISTEN_PORT).toBe(50_300);
  });

  it('distinguishes configured default, effective port and override', () => {
    expect(
      isPortOverridden({ configuredPort: 50_300, effectivePort: 50_300 }),
    ).toBe(false);
    expect(
      isPortOverridden({ configuredPort: 51_999, effectivePort: 52_342 }),
    ).toBe(true);
    expect(
      isPortOverridden({ configuredPort: undefined, effectivePort: 52_342 }),
    ).toBe(false);
    expect(
      isPortOverridden({ configuredPort: 50_300, effectivePort: undefined }),
    ).toBe(false);
  });

  it('builds overlays that only touch soulseek.listenPort', () => {
    expect(buildPortOverlay(52_342)).toEqual({
      soulseek: { listenPort: 52_342 },
    });
    expect(buildResetOverlay(51_999)).toEqual({
      soulseek: { listenPort: 51_999 },
    });
    // fallback when nothing configured
    expect(buildResetOverlay(undefined)).toEqual({
      soulseek: { listenPort: DEFAULT_LISTEN_PORT },
    });
  });
});

describe('applyListeningPort', () => {
  it('applies a valid port and confirms the effective port afterwards', async () => {
    expect.hasAssertions();
    const { applied, applyOverlayFn, getCurrentFn } = setupApplyTest({
      currentAfterApply: 52_342,
    });

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 50_300,
      getCurrentFn,
      rawInput: '52342',
    });

    expect(result.ok).toBe(true);
    expect(result.port).toBe(52_342);
    expect(applied).toEqual([{ soulseek: { listenPort: 52_342 } }]);
    expect(applyOverlayFn).toHaveBeenCalledTimes(1);
    expect(getCurrentFn).toHaveBeenCalledTimes(1);
  });

  it('clears an override by re-applying the configured default', async () => {
    expect.hasAssertions();
    const { applied, applyOverlayFn, getCurrentFn } = setupApplyTest({
      currentAfterApply: 50_300,
      effectivePort: 52_342,
    });

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 52_342,
      getCurrentFn,
      rawInput: '',
    });

    expect(result.ok).toBe(true);
    expect(result.port).toBe(50_300);
    expect(applied).toEqual([{ soulseek: { listenPort: 50_300 } }]);
  });

  it('restores a nonstandard configured default instead of hard-coding 50300', async () => {
    expect.hasAssertions();
    const { applied, applyOverlayFn, getCurrentFn } = setupApplyTest({
      currentAfterApply: 51_999,
      effectivePort: 52_342,
    });

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 51_999,
      effectivePort: 52_342,
      getCurrentFn,
      rawInput: '   ',
    });

    expect(result.ok).toBe(true);
    expect(result.port).toBe(51_999);
    expect(applied).toEqual([{ soulseek: { listenPort: 51_999 } }]);
  });

  it('does not call the API for unchanged values', async () => {
    expect.hasAssertions();
    const applyOverlayFn = jest.fn();
    const getCurrentFn = jest.fn();

    const samePort = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 52_342,
      getCurrentFn,
      rawInput: '52342',
    });
    expect(samePort.ok).toBe(true);
    expect(samePort.unchanged).toBe(true);

    const sameDefault = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 50_300,
      getCurrentFn,
      rawInput: '',
    });
    expect(sameDefault.ok).toBe(true);
    expect(sameDefault.unchanged).toBe(true);

    expect(applyOverlayFn).not.toHaveBeenCalled();
    expect(getCurrentFn).not.toHaveBeenCalled();
  });

  it('rejects invalid inputs without calling the API', async () => {
    expect.hasAssertions();
    const applyOverlayFn = jest.fn();
    const getCurrentFn = jest.fn();

    for (const rawInput of ['0', '65536', 'abc', '-5']) {
      const result = await applyListeningPort({
        applyOverlayFn,
        configuredPort: 50_300,
        effectivePort: 50_300,
        getCurrentFn,
        rawInput,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('validation');
    }

    expect(applyOverlayFn).not.toHaveBeenCalled();
    expect(getCurrentFn).not.toHaveBeenCalled();
  });

  it('surfaces API failures when applying', async () => {
    expect.hasAssertions();
    const applyOverlayFn = jest.fn(async () => {
      const error = new Error('Request failed with status code 400');
      error.response = { data: 'ListenPort must be between 1024 and 65535.' };
      throw error;
    });
    const getCurrentFn = jest.fn();

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 50_300,
      getCurrentFn,
      rawInput: '100',
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('api');
    expect(result.message).toContain('ListenPort');
    expect(getCurrentFn).not.toHaveBeenCalled();
  });

  it('reports a confirmation failure when the server does not report the new port', async () => {
    expect.hasAssertions();
    const applyOverlayFn = jest.fn(async () => ({}));
    const getCurrentFn = jest.fn(async () => ({
      soulseek: { listenPort: 50_300 },
    }));

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort: 50_300,
      effectivePort: 50_300,
      getCurrentFn,
      rawInput: '52342',
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('confirm');
    expect(result.message).toContain('52342');
  });
});
