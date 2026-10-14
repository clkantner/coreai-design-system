// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type { TabListProps as CoreAITabListProps } from '@coreai-ds/react-components';
import type { JSX, MouseEventHandler } from 'react';

import { TabList } from '@coreai-ds/react-components';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router';

import { isLinkSelected, TabLink } from '../TabLink/TabLink';

import styles from './TabLinkList.module.css';

export interface TabLinkListProps extends Omit<
  CoreAITabListProps,
  'children' | 'onTabSelect' | 'selectedValue'
> {
  'aria-label': string;
  alignContent?: boolean;
  preventScrollReset?: boolean;
  className?: string;
  links: {
    label: string;
    to: string;
    hidden?: boolean;
    end?: boolean;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }[];
}

export function TabLinkList({
  alignContent = true,
  preventScrollReset = false,
  className,
  links,
  ...rest
}: TabLinkListProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleLinks = links.filter((link) => !link.hidden);
  const selectedValue = visibleLinks.find((link) =>
    isLinkSelected(link.to, link.end, location.pathname, location.search),
  )?.to;

  return (
    <TabList
      className={clsx(styles.tabList, alignContent && styles.alignContent, className)}
      onClickCapture={(event) => {
        const anchor = (event.target as Element).closest('a[href]');
        const target = anchor?.getAttribute('href');
        const link = visibleLinks.find((item) => item.to === target);

        if (anchor === null || target === null || link === undefined) {
          return;
        }

        link.onClick?.(event as unknown as React.MouseEvent<HTMLAnchorElement>);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        void navigate(link.to, { preventScrollReset });
      }}
      selectedValue={selectedValue}
      size="small"
      {...rest}
    >
      {visibleLinks.map((link) => (
        <TabLink key={link.to} end={link.end} to={link.to} preventScrollReset={preventScrollReset}>
          {link.label}
        </TabLink>
      ))}
    </TabList>
  );
}
