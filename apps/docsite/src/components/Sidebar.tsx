import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  type AccordionToggleEventHandler,
} from '@coreai/fluentui-react';
import { SearchBox } from '@coreai/fluentui-react';
import { TabList, Tab, type SelectTabData, type SelectTabEvent } from '@coreai/fluentui-react';
import { Link } from '@coreai/fluentui-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sidebarGroups } from '../data/registry';
import { siteLinks } from '../data/content';
import { CoreAILogo, ExternalIcon } from './Icons';
import { ThemeSwitcher } from './ThemeSwitcher';

const sidebarStorageKey = 'coreai-docsite-sidebar-collapsed';

const logoEffectFrames = [
  '/logo-effects/single-logo-effect1-white.png',
  '/logo-effects/single-logo-effect2-white.png',
  '/logo-effects/single-logo-effect3-white.png',
  '/logo-effects/single-logo-effect4-white.png',
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = React.useRef<HTMLElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(sidebarStorageKey) === 'true',
  );
  const [query, setQuery] = React.useState('');
  const isApplePlatform =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const [openGroups, setOpenGroups] = React.useState<string[]>(() =>
    sidebarGroups.map((group) => group.label),
  );

  React.useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(sidebarStorageKey, String(isCollapsed));
  }, [isCollapsed]);

  const onTabSelect = React.useCallback(
    (_event: SelectTabEvent, data: SelectTabData) => {
      if (query.trim()) {
        setQuery('');
      }
      navigate(String(data.value));
      onClose();
    },
    [navigate, onClose, query],
  );

  const needle = query.trim().toLowerCase();
  const groups = sidebarGroups
    .map((group) => ({
      ...group,
      items: needle
        ? group.items.filter((page) => page.navLabel.toLowerCase().includes(needle))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const standaloneGroups = groups.filter((group) => group.layout === 'standalone');
  const combinedGroups = groups.filter((group) => group.layout === 'combined');

  // While searching, force matching groups open so results are visible;
  // otherwise reflect the user's expand/collapse state.
  const openItems = needle ? groups.map((group) => group.label) : openGroups;
  const createSectionToggleHandler =
    (sectionGroups: typeof groups): AccordionToggleEventHandler =>
    (_event, data) => {
      const sectionLabels = new Set(sectionGroups.map((group) => group.label));
      setOpenGroups((current) => [
        ...current.filter((label) => !sectionLabels.has(label)),
        ...(data.openItems as string[]),
      ]);
    };

  const renderGroup = (group: (typeof groups)[number]) => (
    <AccordionItem value={group.label} key={group.label}>
      <AccordionHeader expandIconPosition="end" size="small">
        {group.label}
      </AccordionHeader>
      <AccordionPanel>
        <TabList
          vertical
          appearance="subtle"
          size="medium"
          selectedValue={location.pathname}
          onTabSelect={onTabSelect}
        >
          {group.items.map((page) => (
            <Tab key={page.id} value={page.slug}>
              {page.navLabel}
            </Tab>
          ))}
        </TabList>
      </AccordionPanel>
    </AccordionItem>
  );

  React.useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
        return;
      }
      if (sidebarRef.current && getComputedStyle(sidebarRef.current).visibility === 'hidden') {
        return;
      }
      event.preventDefault();
      setIsCollapsed(false);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };

    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFrame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sidebarRef.current) {
        return;
      }

      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === first || !sidebarRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <aside
      ref={sidebarRef}
      id="app-navigation"
      className={`app-sidenav${isOpen ? ' is-open' : ''}${isCollapsed ? ' is-collapsed' : ''}`}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen || undefined}
      aria-label={isOpen ? 'Site navigation' : undefined}
      data-docsite-sidebar
    >
      <div className="app-sidenav__header">
        <div className="app-sidenav__search-row">
          <button
            type="button"
            className="app-sidenav__search-logo"
            aria-label={isOpen || !isCollapsed ? 'Hide navigation' : 'Show navigation'}
            aria-expanded={isOpen || !isCollapsed}
            aria-controls="app-navigation-links"
            onClick={() => {
              if (sidebarRef.current && getComputedStyle(sidebarRef.current).position === 'fixed') {
                onClose();
              } else {
                setIsCollapsed((current) => !current);
              }
            }}
          >
            <span className="app-sidenav__search-logo-static">
              <CoreAILogo />
            </span>
            <span className="app-sidenav__search-logo-effects" aria-hidden="true">
              {logoEffectFrames.map((frame) => (
                <img key={frame} src={frame} alt="" />
              ))}
            </span>
          </button>
          <SearchBox
            ref={searchInputRef}
            placeholder="Search"
            value={query}
            onChange={(_event, data) => setQuery(data.value)}
            aria-label="Search navigation"
            contentBefore={null}
            contentAfter={
              <span className="app-sidenav__search-shortcut" aria-hidden="true">
                <span
                  className={
                    isApplePlatform
                      ? 'app-sidenav__search-shortcut-command'
                      : 'app-sidenav__search-shortcut-control'
                  }
                >
                  {isApplePlatform ? '⌘' : 'Ctrl'}
                </span>
                <span className="app-sidenav__search-shortcut-key">K</span>
              </span>
            }
          />
          <ThemeSwitcher />
          <button
            type="button"
            className="app-sidenav__dismiss"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav id="app-navigation-links" className="app-sidenav__nav" aria-label="Section navigation">
        {standaloneGroups.map((group) => (
          <div className="app-sidenav__section-shell" key={group.label}>
            <Accordion
              multiple
              collapsible
              openItems={openItems.filter((item) => item === group.label)}
              onToggle={createSectionToggleHandler([group])}
            >
              {renderGroup(group)}
            </Accordion>
          </div>
        ))}
        {combinedGroups.map((group) => (
          <div className="app-sidenav__section-shell" key={group.label}>
            <Accordion
              multiple
              collapsible
              openItems={openItems.filter((item) => item === group.label)}
              onToggle={createSectionToggleHandler([group])}
            >
              {renderGroup(group)}
            </Accordion>
          </div>
        ))}
      </nav>

      <div className="app-sidenav__footer">
        <Link className="app-sidenav__link" href={siteLinks.contact} target="_blank" rel="noopener">
          <span className="app-sidenav__link-title">
            <span>Questions?</span>
            <ExternalIcon className="app-sidenav__link-external" />
          </span>
        </Link>
        <Link
          className="app-sidenav__link"
          href={siteLinks.feedback}
          target="_blank"
          rel="noopener"
        >
          <span className="app-sidenav__link-title">
            <span>Feedback</span>
            <ExternalIcon className="app-sidenav__link-external" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
