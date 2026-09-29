import * as React from 'react';
import { Text } from '@coreai/fluentui-react';
import { getPage } from '../data/registry';

export function PageLayout({
  id,
  actions,
  hideTitle,
  title,
  summary,
  children,
}: {
  id: string;
  actions?: React.ReactNode;
  hideTitle?: boolean;
  title?: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  const page = getPage(id);
  const resolvedTitle = title ?? page?.title;
  const resolvedSummary = summary ?? page?.summary;

  React.useEffect(() => {
    document.title = resolvedTitle ? `${resolvedTitle} | CoreAI` : 'CoreAI';
    document.body.dataset.pageId = id;
    return () => {
      delete document.body.dataset.pageId;
    };
  }, [resolvedTitle, id]);

  if (!page) {
    return null;
  }

  const showTitle = !hideTitle;
  const hasHeader = showTitle || Boolean(resolvedSummary) || Boolean(actions);
  const hasContent = React.Children.count(children) > 0;

  return (
    <main id="main-content" className="site-main" tabIndex={-1}>
      {hasHeader ? (
        <div className="page-header">
          {showTitle || actions ? (
            <div className="page-header__title-row">
              {showTitle ? (
                <Text as="h1" size={900} weight="regular">
                  {resolvedTitle}
                </Text>
              ) : null}
              {actions}
            </div>
          ) : null}
          {resolvedSummary ? (
            <Text as="p" className="page-summary" size={400} foreground={3}>
              {resolvedSummary}
            </Text>
          ) : null}
        </div>
      ) : null}

      {hasContent ? <div className="page-content">{children}</div> : null}
    </main>
  );
}
