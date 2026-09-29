import registryJson from '../../site-registry.json';
import { componentContents } from './components';
import { buildSiteRegistry, type RegistryPage, type SiteRegistry } from './registry-builder';

export type { Anchor, RegistryPage, RouteRedirect, SiteRegistry } from './registry-builder';

const baseRegistry = registryJson as SiteRegistry;
export const registry = buildSiteRegistry(baseRegistry, componentContents);
export const pages = registry.pages;
export const redirects = registry.redirects;

export const pageById = new Map(pages.map((page) => [page.id, page]));

export function getPage(id: string): RegistryPage | undefined {
  return pageById.get(id);
}

/**
 * Sidebar navigation groups. Preserves the IA from the previous docsite:
 * Navigation groups and section boundaries, in registry order. Only pages flagged
 * `showInSidebar` appear.
 */
export interface SidebarGroup {
  label: string;
  items: RegistryPage[];
  layout: 'standalone' | 'combined';
}

const SIDEBAR_ORDER: Array<{
  label: string;
  group: string;
  layout: SidebarGroup['layout'];
}> = [
  { label: 'Getting started', group: 'UI Kit', layout: 'standalone' },
  { label: 'For agents', group: 'Agents', layout: 'standalone' },
  { label: 'Design Language', group: 'Foundations', layout: 'standalone' },
  { label: 'Components', group: 'Components', layout: 'combined' },
  { label: 'Templates', group: 'Templates', layout: 'combined' },
  { label: 'Assets', group: 'Assets', layout: 'combined' },
];

export const sidebarGroups: SidebarGroup[] = SIDEBAR_ORDER.map(({ label, group, layout }) => ({
  label,
  layout,
  items: pages.filter((page) => page.showInSidebar && page.group === group),
})).filter((entry) => entry.items.length > 0);
