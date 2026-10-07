/**
 * Storybook story file for the Empty State template.
 * The component and all its code live in EmptyState.tsx.
 * This file owns Storybook meta and story objects. The full source is shown
 * to humans and agents via the auto-generated EmptyState.mdx (see
 * scripts/generate-template-docs.mjs — do not hand-author that file).
 *
 * Stories:
 *   Default       — no data exists yet; offer a primary create action
 *   NoResults     — a search or filter returned zero matches
 *   NoPermissions — the user lacks access to the resource
 *   ErrorState    — something went wrong loading the data
 */

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';
import { Button } from '@coreai-ds/react-components';
import {
  DatabaseRegular,
  SearchRegular,
  LockClosedRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * No data exists yet: a neutral icon, a title, a brief description, and a
 * primary action to create the first item.
 *
 * @summary Centered icon + title + body + primary CTA for pages with no content yet.
 */
export const Default: StoryObj = {
  name: 'Empty State',
  render: () => (
    <EmptyState
      icon={DatabaseRegular}
      title="No items yet"
      description="Items you create will appear here."
      action={<Button appearance="primary">Create item</Button>}
    />
  ),
};

/**
 * No results: a search or filter returned zero matches. Inform the user
 * what was searched and suggest how to recover — no action button needed,
 * since the user already knows what to do (adjust the query).
 *
 * @summary Search/filter returned zero matches — no action button, guidance text only.
 */
export const NoResults: StoryObj = {
  render: () => (
    <EmptyState
      icon={SearchRegular}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
    />
  ),
};

/**
 * No permissions: the signed-in user lacks access to this resource.
 * Offer a secondary action to request access rather than a primary create CTA,
 * so it doesn't compete visually with primary create CTAs elsewhere on the page.
 *
 * @summary User lacks access — secondary "Request access" action, not a primary CTA.
 */
export const NoPermissions: StoryObj = {
  render: () => (
    <EmptyState
      icon={LockClosedRegular}
      title="Access required"
      description="You don't have permission to view this content."
      action={<Button appearance="secondary">Request access</Button>}
    />
  ),
};

/**
 * Error state: data failed to load. Provide a primary retry action so the
 * user can recover in place without a full page reload.
 *
 * @summary Data failed to load — primary "Try again" action for in-place recovery.
 */
export const ErrorState: StoryObj = {
  render: () => (
    <EmptyState
      icon={ErrorCircleRegular}
      title="Something went wrong"
      description="An error occurred while loading this content."
      action={<Button appearance="primary">Try again</Button>}
    />
  ),
};

// ─── Storybook meta ───────────────────────────────────────────────────────────

/**
 * Copy-paste template — not an importable component. Copy the full source from
 * the `templates-empty-state--source-code` docs entry.
 *
 * Centered placeholder shown when a page or data surface has nothing to display.
 *
 * @summary Centered icon/title/body/action pattern for empty data surfaces; 4 variants.
 */
const meta: Meta = {
  title: 'Templates/Empty State',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
