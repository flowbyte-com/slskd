# Searching

Search results can be filtered with visual controls, with saved presets, or
with the advanced filter syntax.  All three can be used at the same time.

> **Filters are applied to the results that the server returns.**
>
> None of the filters change the search phrase that is sent to Soulseek; the
> server is always asked for exactly what was typed into the search box.  The
> filters are applied to the responses that come back, in the browser.

## Visual filters

The **Result Filters** panel is displayed above the results of a completed
search.  It contains the following controls:

| Control | Options | Description |
| --- | --- | --- |
| File Format | Any, MP3, FLAC, AAC / M4A, OGG, Opus, WAV, WMA, ALAC, APE, AIFF | Only display files with the selected extension. |
| Minimum Bitrate | Any, 128 kbps, 192 kbps, 256 kbps, 320 kbps | Only display files with a bitrate of at least the selected value. |
| Encoding | Any, CBR, VBR | Only display files that report the selected encoding. |
| Availability | Only show users with free upload slots, Include users without free slots | Only display responses from users that do (or do not) have a free upload slot. |

The file format is matched **exactly**, and without regard to case; filtering
for MP3 will not match a file named `song.mp3.txt`, or a file in a directory
named `mp3`.

### Bitrate and encoding are different things

The **Minimum Bitrate** control describes a *minimum*; a file with a bitrate of
320 kbps satisfies a minimum of 128 kbps, and a file with a bitrate of 128 kbps
does not.  An *exact* bitrate can be requested with the `br:` token of the
advanced filter syntax (see below).

The **Encoding** control is derived from the file's metadata, and never from
its name.  A file that does not report whether it is CBR or VBR cannot satisfy
either setting, and is filtered out.

### Lossless formats

FLAC, WAV, ALAC, APE, and AIFF files carry lossless audio; a CBR/VBR
requirement is meaningless for them, and the **Minimum Bitrate** and
**Encoding** controls are disabled when one of these formats is selected.  If
either of them was set, it is cleared, and a note is displayed in the panel
explaining why.

### Reset

The **Reset Filters** button clears the visual filters *and* the advanced
filter, returning the results to their unfiltered state.

## Presets

A preset is a named set of filters.  The following presets are built in:

| Preset | Filters |
| --- | --- |
| 320 MP3 | MP3, minimum 320 kbps |
| 320 MP3 CBR | MP3, minimum 320 kbps, CBR |
| FLAC Only | FLAC |
| Anything Goes | No restrictions |

Selecting a preset updates the controls in the filter panel immediately.

Custom presets can be created with the **Save Current Filters** button, which
saves the filters that are currently applied, including the availability
setting.  Custom presets can be renamed and deleted with the buttons next to
them.

> Custom presets are stored in your web browser's local storage, under the
> `slskd-search-presets` key.  They are not stored on the server, and are not
> synchronized between browsers or devices.

## Advanced filter syntax

The advanced filter accepts a small, space separated syntax.  It is applied in
addition to the visual filters; a file must satisfy both.

| Token | Description |
| --- | --- |
| `minbr:<n>`, `minbitrate:<n>` | Minimum bitrate, in kbps. |
| `br:<n>`, `bitrate:<n>` | Exact bitrate, in kbps. |
| `minbd:<n>`, `minbitdepth:<n>` | Minimum bit depth. |
| `minfs:<n>`, `minfilesize:<n>` | Minimum file size, in bytes. |
| `minlen:<n>`, `minlength:<n>` | Minimum length, in seconds. |
| `minfif:<n>`, `minfilesinfolder:<n>` | Minimum number of files in the response. |
| `isvbr` | Only files that report a variable bitrate. |
| `iscbr` | Only files that report a constant bitrate. |
| `islossless` | Only lossless files. |
| `islossy` | Only lossy files. |
| `term` | The filename must contain `term`.  All terms must match. |
| `-term` | The filename must not contain `term`. |

Terms are matched without regard to case, and are matched anywhere in the
filename, so `.mp3` matches any file whose name contains `.mp3`.

For example, `minbitrate:320 iscbr .mp3` displays only MP3 files that report a
constant bitrate of at least 320 kbps.

### Combining the advanced filter with the visual filters

The two sets of filters are applied together:

- Minimum bitrates are combined by taking the **strictest** of the two.  If
  the advanced filter requires 320 kbps and the visual filter requires
  128 kbps, 320 kbps is applied.
- Encoding requirements are combined.  If the advanced filter requires CBR and
  the visual filter requires VBR, no file can satisfy both; the panel displays
  a message explaining the conflict, and no results are shown.
- Everything else is combined with a logical *and*.

## Persisted preferences

The visual filters, the advanced filter, and the custom presets are stored in
the browser's local storage, and are restored the next time the application is
loaded.  They are not reset when moving between searches, and they are not
shared between browsers or devices.

## Metadata limitations

The filters are limited by the metadata that the sharing client reports; slskd
cannot determine the bitrate, encoding, or format of a file any other way.

- Files with **unknown bitrate** never satisfy a minimum or an exact bitrate.
  Many clients do not report a bitrate for lossless files, so a bitrate filter
  may exclude them.
- Files with **unknown encoding** never satisfy a CBR or VBR requirement.
- The **file format** is always determined from the file's extension, so it is
  available for every file, regardless of the metadata that was reported.
