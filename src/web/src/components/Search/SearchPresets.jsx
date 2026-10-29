import { isValidSearchPresetName } from '../../lib/searchPresets';
import React, { useState } from 'react';
import { Button, Input, Message } from 'semantic-ui-react';

const SearchPresets = ({ onApply, onCreate, onDelete, onRename, presets }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState(undefined);
  const [renamingName, setRenamingName] = useState('');

  const startRenaming = (preset) => {
    setRenamingId(preset.id);
    setRenamingName(preset.name);
    setCreating(false);
  };

  const cancelRenaming = () => {
    setRenamingId(undefined);
    setRenamingName('');
  };

  const saveRenaming = () => {
    if (!isValidSearchPresetName(renamingName)) {
      return;
    }

    onRename(renamingId, renamingName);
    cancelRenaming();
  };

  const startCreating = () => {
    setCreating(true);
    setName('');
    cancelRenaming();
  };

  const cancelCreating = () => {
    setCreating(false);
    setName('');
  };

  const saveCreating = () => {
    if (!isValidSearchPresetName(name)) {
      return;
    }

    onCreate(name);
    cancelCreating();
  };

  return (
    <div className="search-filter-presets">
      <div className="search-filter-presets-label">Presets</div>
      <div className="search-filter-presets-list">
        {presets.map((preset) =>
          preset.builtIn ? (
            <Button
              key={preset.id}
              onClick={() => onApply(preset)}
              size="small"
            >
              {preset.name}
            </Button>
          ) : renamingId === preset.id ? (
            <span
              className="search-filter-preset-edit"
              key={preset.id}
            >
              <Input
                onChange={(event) => setRenamingName(event.target.value)}
                onKeyUp={(event) =>
                  event.key === 'Enter' ? saveRenaming() : undefined
                }
                size="small"
                value={renamingName}
              />
              <Button
                content="Save"
                onClick={saveRenaming}
                size="small"
              />
              <Button
                content="Cancel"
                onClick={cancelRenaming}
                size="small"
              />
            </span>
          ) : (
            <span
              className="search-filter-preset"
              key={preset.id}
            >
              <Button
                onClick={() => onApply(preset)}
                size="small"
              >
                {preset.name}
              </Button>
              <Button
                aria-label={`Rename preset ${preset.name}`}
                icon="edit"
                onClick={() => startRenaming(preset)}
                size="small"
                title={`Rename preset ${preset.name}`}
              />
              <Button
                aria-label={`Delete preset ${preset.name}`}
                icon="trash"
                onClick={() => onDelete(preset.id)}
                size="small"
                title={`Delete preset ${preset.name}`}
              />
            </span>
          ),
        )}
        {creating ? (
          <span className="search-filter-preset-edit">
            <Input
              onChange={(event) => setName(event.target.value)}
              onKeyUp={(event) =>
                event.key === 'Enter' ? saveCreating() : undefined
              }
              placeholder="Preset name"
              size="small"
              value={name}
            />
            <Button
              content="Save"
              onClick={saveCreating}
              size="small"
            />
            <Button
              content="Cancel"
              onClick={cancelCreating}
              size="small"
            />
          </span>
        ) : (
          <Button
            content="Save Current Filters"
            icon="plus"
            onClick={startCreating}
            size="small"
            title="Save the current filters as a new preset"
          />
        )}
      </div>
      {creating && !isValidSearchPresetName(name) && name.length > 0 && (
        <Message
          content="Enter a name for the preset."
          negative
        />
      )}
      {renamingId && !isValidSearchPresetName(renamingName) && (
        <Message
          content="Enter a name for the preset."
          negative
        />
      )}
    </div>
  );
};

export default SearchPresets;
