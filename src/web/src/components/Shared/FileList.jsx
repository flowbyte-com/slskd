import {
  formatBitrate,
  formatBytes,
  formatSeconds,
  getFileExtension,
  getFileName,
} from '../../lib/util';
import React, { useState } from 'react';
import { Button, Checkbox, Header, Icon, List, Table } from 'semantic-ui-react';

const FileList = ({
  directoryName,
  disabled,
  files,
  footer,
  locked,
  onClose,
  onSelectionChange,
}) => {
  const [folded, setFolded] = useState(false);

  const fileList = files ?? [];
  const selectedCount = fileList.filter((f) => f.selected).length;

  return (
    <div style={{ opacity: locked ? 0.5 : 1 }}>
      <Header
        className="filelist-header"
        size="small"
      >
        <div>
          <Icon
            link={!locked}
            name={locked ? 'lock' : folded ? 'folder' : 'folder open'}
            onClick={() => !locked && setFolded(!folded)}
            size="large"
          />
          {directoryName}

          {Boolean(onClose) && (
            <Icon
              className="close-button"
              color="red"
              link
              name="close"
              onClick={() => onClose()}
            />
          )}
        </div>
      </Header>
      {!folded && fileList.length > 0 && (
        <List>
          <List.Item>
            <div className="filelist-table-wrapper">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell className="filelist-selector">
                      <Checkbox
                        checked={selectedCount === fileList.length}
                        disabled={disabled}
                        fitted
                        onChange={(event, data) =>
                          fileList.map((f) =>
                            onSelectionChange(f, data.checked),
                          )
                        }
                        title="Select all files in this folder"
                      />
                    </Table.HeaderCell>
                    <Table.HeaderCell className="filelist-filename">
                      File
                    </Table.HeaderCell>
                    <Table.HeaderCell className="filelist-format">
                      Format
                    </Table.HeaderCell>
                    <Table.HeaderCell className="filelist-size">
                      Size
                    </Table.HeaderCell>
                    <Table.HeaderCell className="filelist-bitrate">
                      Bitrate
                    </Table.HeaderCell>
                    <Table.HeaderCell className="filelist-length">
                      Length
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {fileList
                    .sort((a, b) => (a.filename > b.filename ? 1 : -1))
                    .map((f) => (
                      <Table.Row key={f.filename}>
                        <Table.Cell className="filelist-selector">
                          <Checkbox
                            checked={f.selected}
                            disabled={disabled}
                            fitted
                            onChange={(event, data) =>
                              onSelectionChange(f, data.checked)
                            }
                          />
                        </Table.Cell>
                        <Table.Cell className="filelist-filename">
                          {locked ? <Icon name="lock" /> : ''}
                          {getFileName(f.filename)}
                        </Table.Cell>
                        <Table.Cell className="filelist-format">
                          {getFileExtension(f.filename).toUpperCase()}
                        </Table.Cell>
                        <Table.Cell className="filelist-size">
                          {formatBytes(f.size)}
                        </Table.Cell>
                        <Table.Cell className="filelist-bitrate">
                          {formatBitrate(f)}
                        </Table.Cell>
                        <Table.Cell className="filelist-length">
                          {formatSeconds(f.length)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
                {footer && (
                  <Table.Footer fullWidth>
                    <Table.Row>
                      <Table.HeaderCell colSpan="6">{footer}</Table.HeaderCell>
                    </Table.Row>
                  </Table.Footer>
                )}
              </Table>
            </div>
            <div className="filelist-selection">
              <span className="filelist-selection-count">
                {selectedCount} of {fileList.length} file
                {fileList.length === 1 ? '' : 's'} selected
              </span>
              <Button
                compact
                content="Select All"
                disabled={disabled}
                onClick={() => fileList.map((f) => onSelectionChange(f, true))}
                size="mini"
              />
              <Button
                compact
                content="Clear Selection"
                disabled={disabled || selectedCount === 0}
                onClick={() => fileList.map((f) => onSelectionChange(f, false))}
                size="mini"
              />
            </div>
          </List.Item>
        </List>
      )}
    </div>
  );
};

export default FileList;
