export const formatSeconds = (seconds) => {
  if (seconds === undefined) return '';
  const date = new Date(1_970, 0, 1);
  date.setSeconds(seconds);
  if (seconds >= 3_600) {
    return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/u, '$1');
  }

  return date.toTimeString().replace(/.*(\d{2}:\d{2}).*/u, '$1');
};

export const formatBytesAsUnit = (bytes, unit, decimals = 2) => {
  if (unit === 'B') return bytes + ' ' + unit;

  const k = 1_024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = { EB: 6, GB: 3, KB: 1, MB: 2, PB: 5, TB: 4, YB: 8, ZB: 7 };

  return Number.parseFloat((bytes / k ** sizes[unit]).toFixed(dm));
};

export const formatBytes = (
  bytes,
  decimals = 2,
  padding = 0,
  paddingCharacter = ' ',
) => {
  if (bytes === 0 || bytes < 1) return '0 B';

  const k = 1_024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const index = Math.floor(Math.log(bytes) / Math.log(k));

  const number = Number.parseFloat((bytes / k ** index).toFixed(dm));
  const padded = number.toString().padStart(padding, paddingCharacter);

  return padded + ' ' + sizes[index];
};

export const formatSpeed = (bytesPerSecond, decimals = 1) => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond, decimals)}/s`;
};

export const formatWait = (seconds) => {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

export const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const getFileName = (fullPath) => {
  return fullPath.split('\\').pop().split('/').pop();
};

/**
 * Extracts the lower-case extension of the given path.
 *
 * The extension is the text between the last '.' of the file name and the end
 * of the file name.  Paths without an extension, and dot files such as
 * '.bashrc', have no extension.
 * @param {string} fullPath the path to inspect
 * @returns {string} the lower-case extension, or an empty string.
 */
export const getFileExtension = (fullPath) => {
  if (!fullPath) {
    return '';
  }

  const fileName = getFileName(fullPath);
  const index = fileName.lastIndexOf('.');

  if (index <= 0 || index === fileName.length - 1) {
    return '';
  }

  return fileName.slice(index + 1).toLowerCase();
};

export const getDirectoryName = (fullPath) => {
  let path = fullPath;

  if (path.lastIndexOf('\\') > 0) {
    path = path.slice(0, Math.max(0, path.lastIndexOf('\\')));
  }

  if (path.lastIndexOf('/') > 0) {
    path = path.slice(0, Math.max(0, path.lastIndexOf('/')));
  }

  return path;
};

export const formatAttributes = ({
  bitRate,
  isVariableBitRate,
  bitDepth,
  sampleRate,
}) => {
  const isLossless = Boolean(sampleRate) && Boolean(bitDepth);

  if (isLossless) {
    return `${bitDepth}/${sampleRate / 1_000}kHz`;
  }

  if (isVariableBitRate) {
    return `${bitRate} Kbps, VBR`;
  }

  return bitRate ? `${bitRate} Kbps` : '';
};

/**
 * Formats the bitrate of the given file.
 *
 * Lossless files are described by their bit depth and sample rate, lossy
 * files by their bitrate.  The encoding (CBR or VBR) is only included when
 * the file's metadata reports it.
 * @param {object} file the file to format
 * @param {number} file.bitRate the bitrate of the file, in kbps
 * @param {number} file.bitDepth the bit depth of the file
 * @param {boolean} file.isVariableBitRate true if the file is variable bitrate
 * @param {number} file.sampleRate the sample rate of the file, in Hz
 * @returns {string} the formatted bitrate, or an empty string.
 */
export const formatBitrate = ({
  bitRate,
  bitDepth,
  isVariableBitRate,
  sampleRate,
}) => {
  if (sampleRate && bitDepth) {
    return `${bitDepth} bit / ${(sampleRate / 1_000).toFixed(1)} kHz`;
  }

  if (!bitRate) {
    return '';
  }

  const encoding =
    // eslint-disable-next-line no-nested-ternary
    isVariableBitRate === true
      ? 'VBR'
      : isVariableBitRate === false
        ? 'CBR'
        : '';

  return `${bitRate} kbps${encoding ? ` ${encoding}` : ''}`;
};

export const sleep = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/* https://www.npmjs.com/package/js-file-download
 *
 * Copyright 2017 Kenneth Jiang
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE
 */
export const downloadFile = (data, filename, mime) => {
  const blob = new Blob([data], { type: mime || 'application/octet-stream' });
  if (typeof window.navigator.msSaveBlob !== 'undefined') {
    // IE workaround for "HTML7007: One or more blob URLs were
    // revoked by closing the blob for which they were created.
    // These URLs will no longer resolve as the data backing
    // the URL has been freed."
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const blobURL = window.URL.createObjectURL(blob);
    const temporaryLink = document.createElement('a');
    temporaryLink.style.display = 'none';
    temporaryLink.href = blobURL;
    temporaryLink.setAttribute('download', filename);

    // Safari thinks _blank anchor are pop ups. We only want to set _blank
    // target if the browser does not support the HTML5 download attribute.
    // This allows you to download files in desktop safari if pop up blocking
    // is enabled.
    if (typeof temporaryLink.download === 'undefined') {
      temporaryLink.setAttribute('target', '_blank');
    }

    document.body.append(temporaryLink);
    temporaryLink.click();
    temporaryLink.remove();
    window.URL.revokeObjectURL(blobURL);
  }
};
