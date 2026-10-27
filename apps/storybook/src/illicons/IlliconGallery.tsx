// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { Button, Field, Input, Link, makeStyles, tokens } from '@coreai-ds/react-components';
import manifest from '../../../../assets/illicons/manifest.json';

export interface IlliconEntry {
  id: string;
  name: string;
  tags: string[];
  file: string;
  provenance: { author: string; source: string; license: string };
}

const pageSize = 24;
const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  search: { maxWidth: '400px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  tile: {
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  preview: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingHorizontalM,
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  title: { margin: 0, fontSize: tokens.fontSizeBase400 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function IlliconTile({ icon }: { icon: IlliconEntry }) {
  const styles = useStyles();
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [copying, setCopying] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const url = `./illicons/${icon.file}`;

  async function copySvg() {
    setCopying(true);
    setStatus('');
    setError('');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable. Download the SVG instead.');
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`SVG download failed (${response.status}).`);
      if (!response.headers.get('content-type')?.includes('image/svg+xml')) {
        throw new Error('The server did not return an SVG. Try downloading it again.');
      }
      await navigator.clipboard.writeText(await response.text());
      setStatus(`Copied ${icon.name} SVG.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Copy failed. Download the SVG instead.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <article className={styles.tile} aria-label={icon.name}>
      <div className={styles.preview}>
        {imageFailed ? (
          <p role="alert" className={styles.error}>
            Preview unavailable for {icon.name}.
          </p>
        ) : (
          <img
            src={url}
            width={140}
            height={140}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <h3 className={styles.title}>{icon.name}</h3>
      <span>{icon.tags.join(', ')}</span>
      <div className={styles.actions}>
        <Button onClick={copySvg} disabled={copying}>
          Copy SVG
        </Button>
        <Link href={url} download={icon.file} aria-label={`Download ${icon.name} SVG`}>
          Download SVG
        </Link>
      </div>
      <small>
        By {icon.provenance.author} · {icon.provenance.license}
      </small>
      <span role="status">{status}</span>
      {error ? (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      ) : null}
    </article>
  );
}

export function IlliconGallery({ icons = manifest.icons }: { icons?: IlliconEntry[] }) {
  const styles = useStyles();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(0);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = icons.filter((icon) => {
    const searchable = `${icon.name} ${icon.id} ${icon.tags.join(' ')}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  const pageCount = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const start = currentPage * pageSize;

  return (
    <section className={styles.root} aria-label="Illicon catalog">
      <Field label="Search illicons" className={styles.search}>
        <Input
          type="search"
          value={query}
          placeholder="Search names or tags"
          onChange={(_, data) => {
            setQuery(data.value);
            setPage(0);
          }}
        />
      </Field>
      <p role="status">
        {filtered.length} {filtered.length === 1 ? 'illicon' : 'illicons'}
        {filtered.length
          ? ` · Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)}`
          : ''}
      </p>
      {icons.length === 0 ? (
        <p>
          No artwork has been published yet. Use the contribution guide below to propose the first
          illicon.
        </p>
      ) : filtered.length === 0 ? (
        <p>No illicons match your search. Try another name or tag.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.slice(start, start + pageSize).map((icon) => (
            <IlliconTile key={icon.id} icon={icon} />
          ))}
        </div>
      )}
      {pageCount > 1 ? (
        <nav className={styles.actions} aria-label="Illicon pages">
          <Button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Previous
          </Button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button disabled={currentPage + 1 === pageCount} onClick={() => setPage(currentPage + 1)}>
            Next
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
