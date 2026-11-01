import './ListeningPort.css';
import {
  applyListeningPort,
  DEFAULT_LISTEN_PORT,
  parsePortInput,
} from '../../lib/listeningPort';
import { applyOverlay as patchOptions, getCurrent } from '../../lib/options';
import React, { useEffect, useState } from 'react';
import { Button, Form, Icon, Message, Modal } from 'semantic-ui-react';

const describePort = (port) =>
  Number.isInteger(port) ? String(port) : 'unknown';

const ListeningPortModal = ({
  applyOverlayFn = async (overlay) => patchOptions({ overlay }),
  configuredError,
  configuredPort,
  effectivePort,
  getCurrentFn = getCurrent,
  onApplied,
  onClose,
  open,
}) => {
  const [inputValue, setInputValue] = useState(
    Number.isInteger(effectivePort) ? String(effectivePort) : '',
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(undefined);

  useEffect(() => {
    if (open) {
      setInputValue(
        Number.isInteger(effectivePort) ? String(effectivePort) : '',
      );
      setTouched(false);
      setSaving(false);
      setFeedback(undefined);
    }
  }, [effectivePort, open]);

  const parsed = parsePortInput(inputValue);
  const showValidationError = touched && !parsed.empty && parsed.error;
  const isEmpty = parsed.empty;
  const actionLabel = isEmpty ? 'Use Default' : 'Apply Port';

  const fallbackConfigured = Number.isInteger(configuredPort)
    ? configuredPort
    : DEFAULT_LISTEN_PORT;
  const hasOverride =
    Number.isInteger(effectivePort) &&
    Number.isInteger(configuredPort) &&
    effectivePort !== configuredPort;

  const handleChange = (_event, { value }) => {
    setInputValue(value ?? '');
    setTouched(true);
    setFeedback(undefined);
  };

  const handleSubmit = async () => {
    setTouched(true);

    if (parsed.error) {
      return;
    }

    setSaving(true);
    setFeedback(undefined);

    const result = await applyListeningPort({
      applyOverlayFn,
      configuredPort,
      effectivePort,
      getCurrentFn,
      rawInput: inputValue,
    });

    setSaving(false);
    setFeedback(result);

    if (result.ok && onApplied && Number.isInteger(result.port)) {
      onApplied(result.port);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      centered
      className="listening-port-modal"
      onClose={onClose}
      open={open}
      size="mini"
    >
      <Modal.Header>
        <Icon name="server" />
        Listening Port
      </Modal.Header>
      <Modal.Content>
        <div
          className="listening-port-meta"
          data-testid="listening-port-meta"
        >
          <div>
            <span className="listening-port-label">Configured default: </span>
            <strong data-testid="listening-port-configured">
              {describePort(configuredPort ?? DEFAULT_LISTEN_PORT)}
            </strong>
            {configuredError && (
              <span className="listening-port-hint">
                {' '}
                (built-in {DEFAULT_LISTEN_PORT}; configured value unavailable)
              </span>
            )}
          </div>
          <div>
            <span className="listening-port-label">Effective port: </span>
            <strong data-testid="listening-port-effective">
              {describePort(effectivePort)}
            </strong>
          </div>
          <div data-testid="listening-port-override">
            {hasOverride ? (
              <Message
                info
                size="tiny"
              >
                Temporary override active: {effectivePort} (default{' '}
                {configuredPort}). Lost on restart.
              </Message>
            ) : (
              <span className="listening-port-hint">
                No temporary override. Effective matches the configured default.
              </span>
            )}
          </div>
        </div>
        <Form onSubmit={handleSubmit}>
          <Form.Field error={Boolean(showValidationError)}>
            <label htmlFor="listening-port-input">
              Soulseek listening port
            </label>
            <Form.Input
              action={false}
              aria-describedby="listening-port-help listening-port-error"
              aria-invalid={Boolean(showValidationError)}
              aria-label="Soulseek listening port. Empty means use default."
              autoFocus
              data-testid="listening-port-input"
              disabled={saving}
              id="listening-port-input"
              inputMode="numeric"
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={`e.g. ${fallbackConfigured} — empty for default`}
              value={inputValue}
            />
            <div
              className="listening-port-hint"
              id="listening-port-help"
            >
              Empty input means Use Default. Temporary only — lost on restart,
              never writes slskd.yml or changes web ports, firewall, VPN or
              authentication.
            </div>
            {showValidationError && (
              <div
                className="listening-port-error"
                id="listening-port-error"
                role="alert"
              >
                {parsed.error}
              </div>
            )}
          </Form.Field>
        </Form>
        {feedback && (
          <Message
            data-testid="listening-port-feedback"
            negative={!feedback.ok}
            positive={feedback.ok}
            role={feedback.ok ? 'status' : 'alert'}
            size="tiny"
          >
            {feedback.message}
            {!feedback.ok && feedback.reason === 'confirm'
              ? ' Check System > Info/Options to verify.'
              : null}
          </Message>
        )}
        <div className="listening-port-hint">
          Reset re-applies the configured default ({fallbackConfigured}). The
          runtime API has no delete; the temporary entry remains until restart.
        </div>
      </Modal.Content>
      <Modal.Actions>
        <Button
          disabled={saving}
          onClick={onClose}
        >
          <Icon name="close" />
          Cancel
        </Button>
        <Button
          data-testid="listening-port-apply"
          disabled={saving || Boolean(parsed.error)}
          loading={saving}
          onClick={handleSubmit}
          primary
        >
          <Icon name="checkmark" />
          {saving ? 'Applying…' : actionLabel}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default ListeningPortModal;
