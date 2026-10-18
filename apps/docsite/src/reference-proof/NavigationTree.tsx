// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import { Tree, TreeItem, TreeItemLayout, type TreeItemValue } from '@coreai-ds/react-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { normalizeReferencePath } from './navigation.mjs';

export interface NavigationEntry {
  path: string;
  title: string;
}

export function NavigationTree({ entries, query }: { entries: NavigationEntry[]; query: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = normalizeReferencePath(location.pathname);
  const [openItems, setOpenItems] = React.useState<TreeItemValue[]>([
    'components',
    'templates',
    'react-router',
  ]);
  const needle = query.trim().toLowerCase();
  const visible = entries.filter((entry) => !needle || entry.title.toLowerCase().includes(needle));

  React.useEffect(() => {
    const parents = activePath.startsWith('/components/')
      ? ['components']
      : activePath.startsWith('/templates/react-router-')
        ? ['templates', 'react-router']
        : activePath.startsWith('/templates/')
          ? ['templates']
          : [];
    setOpenItems((current) => [...new Set([...current, ...parents])]);
  }, [activePath]);

  function leaf(entry: NavigationEntry, label = entry.title) {
    const active = entry.path === activePath;
    return (
      <TreeItem
        key={entry.path}
        itemType="leaf"
        value={entry.path}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            event.target === event.currentTarget &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            event.preventDefault();
            navigate(entry.path);
          }
        }}
      >
        <TreeItemLayout>
          <Link
            className="reference-tree-link"
            data-navigation-entry={
              entry.path.startsWith('/components/') || entry.path.startsWith('/templates/')
                ? ''
                : undefined
            }
            to={entry.path}
            tabIndex={-1}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        </TreeItemLayout>
      </TreeItem>
    );
  }

  const components = visible.filter((entry) => entry.path.startsWith('/components/'));
  const templates = visible.filter((entry) => entry.path.startsWith('/templates/'));
  const routerTemplates = templates.filter((entry) =>
    entry.path.startsWith('/templates/react-router-'),
  );
  return (
    <>
      {needle && !visible.length ? <p role="status">No pages match your filter.</p> : null}
      <Tree
        aria-label="Documentation pages"
        className="reference-navigation-tree"
        openItems={needle ? ['components', 'templates', 'react-router'] : openItems}
        onOpenChange={(_event, data) => setOpenItems([...data.openItems])}
      >
        {visible
          .filter(
            (entry) =>
              !entry.path.startsWith('/components/') && !entry.path.startsWith('/templates/'),
          )
          .map((entry) => leaf(entry))}
        {components.length ? (
          <TreeItem itemType="branch" value="components" aria-label="Components">
            <TreeItemLayout>Components</TreeItemLayout>
            <Tree>{components.map((entry) => leaf(entry))}</Tree>
          </TreeItem>
        ) : null}
        {templates.length ? (
          <TreeItem itemType="branch" value="templates" aria-label="Templates">
            <TreeItemLayout>Templates</TreeItemLayout>
            <Tree>
              {templates
                .filter((entry) => !entry.path.startsWith('/templates/react-router-'))
                .map((entry) => leaf(entry))}
              {routerTemplates.length ? (
                <TreeItem itemType="branch" value="react-router" aria-label="React Router">
                  <TreeItemLayout>React Router</TreeItemLayout>
                  <Tree>
                    {routerTemplates.map((entry) =>
                      leaf(entry, entry.title.replace(/^React Router \/ /, '')),
                    )}
                  </Tree>
                </TreeItem>
              ) : null}
            </Tree>
          </TreeItem>
        ) : null}
      </Tree>
    </>
  );
}
