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
  const groups = [
    { value: 'overview', label: 'Overview' },
    { value: 'guides', label: 'Guides' },
    { value: 'foundations', label: 'Foundations' },
    { value: 'patterns', label: 'Patterns' },
    { value: 'components', label: 'Components' },
    { value: 'templates', label: 'Templates' },
  ];
  const [openItems, setOpenItems] = React.useState<TreeItemValue[]>([
    'overview',
    'guides',
    'foundations',
    'patterns',
    'components',
    'templates',
    'react-router',
  ]);
  const needle = query.trim().toLowerCase();
  const visible = entries.filter((entry) => !needle || entry.title.toLowerCase().includes(needle));

  React.useEffect(() => {
    const parents = [activePath.split('/')[1] || 'overview'];
    if (activePath.startsWith('/templates/react-router-')) parents.push('react-router');
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
            data-navigation-entry=""
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

  return (
    <>
      {needle && !visible.length ? <p role="status">No pages match your filter.</p> : null}
      <Tree
        aria-label="Documentation pages"
        className="reference-navigation-tree"
        openItems={needle ? [...groups.map((group) => group.value), 'react-router'] : openItems}
        onOpenChange={(_event, data) => setOpenItems([...data.openItems])}
      >
        {groups.map((group) => {
          const items = visible.filter(
            (entry) => (entry.path.split('/')[1] || 'overview') === group.value,
          );
          const routerTemplates = items.filter((entry) =>
            entry.path.startsWith('/templates/react-router-'),
          );
          return items.length ? (
            <TreeItem
              key={group.value}
              itemType="branch"
              value={group.value}
              aria-label={group.label}
            >
              <TreeItemLayout>{group.label}</TreeItemLayout>
              <Tree>
                {items
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
          ) : null;
        })}
      </Tree>
    </>
  );
}
