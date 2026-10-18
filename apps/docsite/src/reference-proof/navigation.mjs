// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function normalizeReferencePath(pathname) {
  const path = pathname.replace(/\/index\.html$/, '/');
  return path.endsWith('/') ? path : `${path}/`;
}

export function clientNavigationTarget(href, options) {
  if (
    options.button !== 0 ||
    options.altKey ||
    options.ctrlKey ||
    options.metaKey ||
    options.shiftKey ||
    options.download ||
    (options.target && options.target !== '_self') ||
    href.startsWith('#')
  )
    return undefined;
  const url = new globalThis.URL(href, options.currentUrl);
  if (
    url.origin !== new globalThis.URL(options.currentUrl).origin ||
    !url.pathname.startsWith(options.basePath)
  )
    return undefined;
  const path = normalizeReferencePath(url.pathname.slice(options.basePath.length - 1));
  return options.paths.has(path) ? `${path}${url.search}${url.hash}` : undefined;
}
