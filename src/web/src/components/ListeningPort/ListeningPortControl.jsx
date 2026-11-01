import {
  getConfiguredListenPort,
  getEffectiveListenPort,
  isPortOverridden,
} from '../../lib/listeningPort';
import { getStartup } from '../../lib/options';
import ListeningPortModal from './ListeningPortModal';
import React, { useEffect, useState } from 'react';
import { Icon, Menu } from 'semantic-ui-react';

const ListeningPortControl = ({ onPortChanged, options = {} }) => {
  const [open, setOpen] = useState(false);
  const [startupOptions, setStartupOptions] = useState(undefined);
  const [startupError, setStartupError] = useState(undefined);
  const [localEffective, setLocalEffective] = useState(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadStartup = async () => {
      try {
        const startup = await getStartup();
        if (!cancelled) {
          setStartupOptions(startup);
          setStartupError(undefined);
        }
      } catch (error) {
        if (!cancelled) {
          setStartupError(error?.message ?? 'Failed to load configured port.');
        }
      }
    };

    loadStartup();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // clear the local confirmation once the hub broadcasts the new options
    const fromHub = getEffectiveListenPort(options);
    if (
      Number.isInteger(fromHub) &&
      Number.isInteger(localEffective) &&
      fromHub === localEffective
    ) {
      setLocalEffective(undefined);
    }
  }, [localEffective, options]);

  const effectivePort = Number.isInteger(localEffective)
    ? localEffective
    : getEffectiveListenPort(options);
  const configuredPort = getConfiguredListenPort(startupOptions);
  const overridden = isPortOverridden({ configuredPort, effectivePort });

  const label = Number.isInteger(effectivePort)
    ? `Port ${effectivePort}`
    : 'Port …';

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleApplied = (port) => {
    setLocalEffective(port);
    if (onPortChanged) onPortChanged(port);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <>
      <Menu.Item
        aria-haspopup="dialog"
        aria-label={
          Number.isInteger(effectivePort)
            ? `Soulseek listening port ${effectivePort}${
                overridden ? ', temporary override active' : ''
              }. Activate to change.`
            : 'Soulseek listening port. Activate to change.'
        }
        data-testid="listening-port-control"
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        title={
          Number.isInteger(configuredPort)
            ? `Effective ${effectivePort ?? 'unknown'}, default ${configuredPort}`
            : `Effective ${effectivePort ?? 'unknown'}`
        }
      >
        <Icon
          color={overridden ? 'yellow' : 'green'}
          name="server"
        />
        {label}
      </Menu.Item>
      <ListeningPortModal
        configuredError={startupError}
        configuredPort={configuredPort}
        effectivePort={effectivePort}
        onApplied={handleApplied}
        onClose={handleClose}
        open={open}
      />
    </>
  );
};

export default ListeningPortControl;
