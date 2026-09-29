import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Shell } from './components/Shell';
import { pages, redirects } from './data/registry';

const Introduction = React.lazy(() =>
  import('./pages/Introduction').then((module) => ({
    default: module.Introduction,
  })),
);
const Changelog = React.lazy(() =>
  import('./pages/Changelog').then((module) => ({
    default: module.Changelog,
  })),
);
const Colors = React.lazy(() =>
  import('./pages/Colors').then((module) => ({ default: module.Colors })),
);
const Typography = React.lazy(() =>
  import('./pages/Typography').then((module) => ({
    default: module.Typography,
  })),
);
const Materials = React.lazy(() =>
  import('./pages/Materials').then((module) => ({
    default: module.Materials,
  })),
);
const Component = React.lazy(() =>
  import('./pages/Component').then((module) => ({
    default: module.Component,
  })),
);
const CoreAISkill = React.lazy(() =>
  import('./pages/CoreAISkill').then((module) => ({
    default: module.CoreAISkill,
  })),
);
const Package = React.lazy(() =>
  import('./pages/Package').then((module) => ({
    default: module.Package,
  })),
);
const McpServer = React.lazy(() =>
  import('./pages/McpServer').then((module) => ({
    default: module.McpServer,
  })),
);
const NotFound = React.lazy(() =>
  import('./pages/NotFound').then((module) => ({
    default: module.NotFound,
  })),
);

const routeComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  resources: Introduction,
  changelog: Changelog,
  colors: Colors,
  typography: Typography,
  materials: Materials,
  'coreai-skill': CoreAISkill,
  package: Package,
  'mcp-server': McpServer,
};

export function App() {
  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          {pages.map((page) => {
            if (
              page.group === 'Components' ||
              page.group === 'Templates' ||
              page.group === 'Assets'
            ) {
              return (
                <Route
                  key={page.id}
                  path={page.slug}
                  element={<Component componentId={page.id} />}
                />
              );
            }
            const Page = routeComponents[page.id];
            if (!Page) {
              throw new Error(`No route component registered for "${page.id}"`);
            }
            return <Route key={page.id} path={page.slug} element={<Page />} />;
          })}
          {redirects.map((redirect) => (
            <Route
              key={redirect.from}
              path={redirect.from}
              element={<Navigate to={redirect.to} replace />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
