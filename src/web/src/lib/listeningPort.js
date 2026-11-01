export const DEFAULT_LISTEN_PORT = 50_300;
export const MIN_LISTEN_PORT = 1;
export const MAX_LISTEN_PORT = 65_535;

// The backend overlay validates Range(1024, 65535); the UI intentionally
// allows 1-65535 per requirements and surfaces backend rejections as API errors.
export const BACKEND_MIN_LISTEN_PORT = 1_024;

const readSoulseek = (options) => {
  if (!options || typeof options !== 'object') return undefined;
  return options.soulseek ?? options.Soulseek;
};

const readPort = (soulseek) => {
  if (!soulseek || typeof soulseek !== 'object') return undefined;
  const value = soulseek.listenPort ?? soulseek.ListenPort;
  return typeof value === 'number' ? value : undefined;
};

export const getEffectiveListenPort = (currentOptions) => {
  return readPort(readSoulseek(currentOptions));
};

export const getConfiguredListenPort = (startupOptions) => {
  return readPort(readSoulseek(startupOptions));
};

export const resolveResetTarget = (configuredPort) => {
  if (
    Number.isInteger(configuredPort) &&
    configuredPort >= MIN_LISTEN_PORT &&
    configuredPort <= MAX_LISTEN_PORT
  ) {
    return configuredPort;
  }

  return DEFAULT_LISTEN_PORT;
};

export const isPortOverridden = ({ configuredPort, effectivePort }) => {
  return (
    Number.isInteger(effectivePort) &&
    Number.isInteger(configuredPort) &&
    effectivePort !== configuredPort
  );
};

export const parsePortInput = (rawValue) => {
  const text = (rawValue ?? '').toString().trim();

  if (text === '') {
    return { empty: true, error: undefined, port: undefined, text };
  }

  if (!/^\d+$/u.test(text)) {
    return {
      empty: false,
      error: 'Enter a port between 1 and 65535.',
      port: undefined,
      text,
    };
  }

  const port = Number.parseInt(text, 10);

  if (
    !Number.isInteger(port) ||
    port < MIN_LISTEN_PORT ||
    port > MAX_LISTEN_PORT
  ) {
    return {
      empty: false,
      error: 'Enter a port between 1 and 65535.',
      port: undefined,
      text,
    };
  }

  return { empty: false, error: undefined, port, text };
};

export const buildPortOverlay = (port) => ({
  soulseek: { listenPort: port },
});

export const buildResetOverlay = (configuredPort) => ({
  soulseek: { listenPort: resolveResetTarget(configuredPort) },
});

const getApiMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim() !== '') return data;
  if (data?.message) return data.message;
  if (error?.message) return error.message;
  return 'Request failed.';
};

/*
 * Runtime overlay clearing limitation:
 * VolatileOverlayConfigurationProvider.Apply() replaces CurrentValue but Load()
 * only adds non-null leafs to Data and never removes stale keys. There is no
 * DELETE /options endpoint. PATCH {"soulseek": null} or {"soulseek": {}} therefore
 * leaves the previous listen_port in Data (sticky). The only reliable way to
 * restore the configured port at runtime is to explicitly re-apply it with
 * PATCH {"soulseek": {"listenPort": <configured>}}. The overlay entry remains
 * until restart (volatile), even when its value equals the configured default.
 */
export const applyListeningPort = async ({
  applyOverlayFn,
  configuredPort,
  effectivePort,
  getCurrentFn,
  rawInput,
}) => {
  const parsed = parsePortInput(rawInput);

  if (parsed.error) {
    return { ok: false, reason: 'validation', message: parsed.error, parsed };
  }

  if (parsed.empty) {
    const target = resolveResetTarget(configuredPort);

    if (Number.isInteger(effectivePort) && effectivePort === target) {
      return {
        ok: true,
        unchanged: true,
        message: `Already using the default port ${target}.`,
        parsed,
        port: target,
      };
    }

    try {
      await applyOverlayFn(buildResetOverlay(target));
    } catch (error) {
      return {
        ok: false,
        reason: 'api',
        message: `Failed to restore default port: ${getApiMessage(error)}`,
        parsed,
      };
    }

    try {
      const current = await getCurrentFn();
      const confirmed = getEffectiveListenPort(current);

      if (confirmed !== target) {
        return {
          ok: false,
          reason: 'confirm',
          message: `Port was not confirmed. Expected ${target} but the server reports ${confirmed ?? 'an unknown port'}.`,
          parsed,
          port: confirmed,
        };
      }

      return {
        ok: true,
        unchanged: false,
        message: `Listening port restored to default ${target}.`,
        parsed,
        port: confirmed,
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'confirm',
        message: `Port may have changed but confirmation failed: ${getApiMessage(error)}`,
        parsed,
      };
    }
  }

  const { port } = parsed;

  if (Number.isInteger(effectivePort) && port === effectivePort) {
    return {
      ok: true,
      unchanged: true,
      message: `Port ${port} is already in effect.`,
      parsed,
      port,
    };
  }

  try {
    await applyOverlayFn(buildPortOverlay(port));
  } catch (error) {
    return {
      ok: false,
      reason: 'api',
      message: `Failed to apply port: ${getApiMessage(error)}`,
      parsed,
    };
  }

  try {
    const current = await getCurrentFn();
    const confirmed = getEffectiveListenPort(current);

    if (confirmed !== port) {
      return {
        ok: false,
        reason: 'confirm',
        message: `Port was not confirmed. Expected ${port} but the server reports ${confirmed ?? 'an unknown port'}.`,
        parsed,
        port: confirmed,
      };
    }

    return {
      ok: true,
      unchanged: false,
      message: `Listening port changed to ${confirmed}.`,
      parsed,
      port: confirmed,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'confirm',
      message: `Port may have changed but confirmation failed: ${getApiMessage(error)}`,
      parsed,
    };
  }
};
