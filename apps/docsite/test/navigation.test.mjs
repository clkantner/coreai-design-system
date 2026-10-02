import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const repoRoot = new URL('../../../', import.meta.url);

test('Storybook embeds follow the resolved docsite mode without resetting story selection', async () => {
  const source = await fs.readFile(
    new URL('apps/docsite/src/components/ComponentPage.tsx', repoRoot),
    'utf8',
  );
  assert.match(source, /const \{ mode \} = useThemeMode\(\)/);
  assert.match(source, /getComponentSourceUrl\(previewSource, activeStoryId\)/);
  assert.match(source, /new URL\(storyUrl\)/);
  assert.match(source, /globals\.push\(`mode:\$\{mode\}`\)/);
  assert.ok(source.includes("searchParams.set('globals', globals.join(';'))"));
  assert.match(source, /src=\{embedUrl\.toString\(\)\}/);
  assert.match(source, /setSelectedStoryId\(undefined\);\s*\}, \[content\.id\]\)/);
});

test('system theme updates respect saved preferences and clean up their listener', async () => {
  const source = await fs.readFile(
    new URL('apps/docsite/src/theme/ThemeProvider.tsx', repoRoot),
    'utf8',
  );
  assert.match(source, /window\.matchMedia\('\(prefers-color-scheme: light\)'\)/);
  assert.match(source, /stored !== 'light' && stored !== 'dark'/);
  assert.match(source, /setPreferenceState\(systemTheme\.matches \? 'light' : 'dark'\)/);
  assert.match(source, /addEventListener\('change', followSystemTheme\)/);
  assert.match(source, /removeEventListener\('change', followSystemTheme\)/);
});

test('mobile navigation behaves as an accessible modal overlay', async () => {
  const [shellSource, sidebarSource] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/components/Shell.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/Sidebar.tsx', repoRoot), 'utf8'),
  ]);

  assert.match(shellSource, /pageRef\.current\.inert = navigationOpen/);
  assert.match(shellSource, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(shellSource, /getComputedStyle\(navigation\)\.position !== 'fixed'/);
  assert.match(sidebarSource, /aria-modal=\{isOpen \|\| undefined\}/);
  assert.match(sidebarSource, /event\.key === 'Escape'/);
  assert.match(sidebarSource, /event\.key !== 'Tab'/);
  assert.doesNotMatch(sidebarSource, /max-width:\s*1100px/);
});

test('theme surfaces switch together before normal transitions resume', async () => {
  const [theme, styles] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/theme/ThemeProvider.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
  ]);
  assert.match(
    theme,
    /React\.useLayoutEffect\(\(\) => \{\s*const root = document\.documentElement;/,
  );
  assert.match(
    theme,
    /root\.classList\.add\('theme-transitioning'\);\s*root\.dataset\.theme = mode/,
  );
  assert.match(
    theme,
    /const paintFrame = requestAnimationFrame\(\(\) => \{\s*restoreFrame = requestAnimationFrame/,
  );
  assert.match(theme, /cancelAnimationFrame\(paintFrame\);\s*cancelAnimationFrame\(restoreFrame\)/);
  assert.doesNotMatch(theme, /setTimeout|didMount/);
  assert.match(theme, /background: 'transparent'/);
  assert.match(styles, /\.theme-transitioning \*::after \{\s*transition: none !important;/);
  assert.doesNotMatch(styles, /transition: opacity 250ms ease !important/);
});

test('landing page has an interactive logo alongside vertically centered content', async () => {
  const [homeSource, logoSource, stylesSource] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/pages/Introduction.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/CoreAILogoCube.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
  ]);

  assert.match(homeSource, /className="home-visual"/);
  assert.match(homeSource, /<CoreAILogoCube \/>/);
  assert.match(logoSource, /<OrbitControls[^>]*enablePan=\{false\}\s+enableZoom=\{false\}/);
  assert.match(logoSource, /new IntersectionObserver/);
  assert.match(logoSource, /intersectionObserver\.disconnect\(\)/);
  assert.match(logoSource, /document\.addEventListener\('visibilitychange'/);
  assert.match(logoSource, /document\.removeEventListener\('visibilitychange'/);
  assert.match(logoSource, /dpr=\{\[1, 2\]\}/);
  assert.match(logoSource, /frameloop=\{shouldRender \? 'always' : 'never'\}/);
  assert.match(stylesSource, /\.home-landing \{[^}]*align-items: center/);
  assert.match(
    stylesSource,
    /\.app-page--home \.site-main \{[^}]*overflow: visible;[^}]*animation: none;/,
  );
  assert.match(stylesSource, /\.home-visual \{\s*position: fixed;/);
  assert.match(stylesSource, /calc\(120vh \* var\(--logo-scale, 1\)\)/);
  assert.match(stylesSource, /@media \(max-width: 800px\)/);
  assert.doesNotMatch(homeSource, /home-logo-background|BasicGrid/);
  assert.doesNotMatch(stylesSource, /basic-grid/);
});

test('Home is in Getting started and the logo toggles a button-only desktop sidebar', async () => {
  const [registrySource, sidebar, styles] = await Promise.all([
    fs.readFile(new URL('apps/docsite/site-registry.json', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/Sidebar.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
  ]);
  const home = JSON.parse(registrySource).pages.find((page) => page.slug === '/');
  assert.equal(home.navLabel, 'Home');
  assert.equal(home.group, 'UI Kit');
  assert.equal(home.showInSidebar, true);
  assert.match(sidebar, /setIsCollapsed\(\(current\) => !current\)/);
  assert.match(sidebar, /aria-expanded=\{isOpen \|\| !isCollapsed\}/);
  assert.match(sidebar, /aria-controls="app-navigation-links"/);
  assert.match(sidebar, /localStorage\.getItem\(sidebarStorageKey\) === 'true'/);
  assert.match(sidebar, /if \(typeof localStorage === 'undefined'\) return;/);
  assert.match(sidebar, /localStorage\.setItem\(sidebarStorageKey, String\(isCollapsed\)\)/);
  assert.doesNotMatch(sidebar, /RouterLink|CoreAI home/);
  assert.match(styles, /@media \(min-width: 1101px\)/);
  assert.match(styles, /\.app-sidenav\.is-collapsed \{\s*width: 48px;\s*height: 48px;/);
  assert.match(styles, /width var\(--mf-duration-smooth\) var\(--mf-ease\)/);
  assert.match(styles, /opacity: 0;\s*visibility: hidden;\s*pointer-events: none;/);
  assert.match(styles, /transition-delay: 0s !important/);
});

test('illustration uses Paper dithering and stationary lights without tuning controls', async () => {
  const [home, logo, adapter, styles] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/pages/Introduction.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/CoreAILogoCube.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/paper-dithering.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
  ]);
  assert.doesNotMatch(home + styles, /LogoControls|logo-controls/);
  assert.match(logo, /<StaticLighting \/>\s*<LogoCubeMesh/);
  assert.doesNotMatch(logo.match(/<group[\s\S]*?<\/group>/)?.[0] ?? '', /StaticLighting/);
  assert.match(logo, /if \(!reduceMotion\) animationTimeRef\.current \+=/);
  assert.match(logo, /scale: 1\.19 \* 1\.25/);
  assert.match(logo, /const rotationSpeed = 0\.18 \* 0\.67 \* 0\.67;/);
  assert.match(
    logo,
    /<PaperHeatmap reduceMotion=\{reduceMotion\} lightMode=\{mode === 'light'\} \/>\s*<PaperDithering \/>/,
  );
  assert.doesNotMatch(logo, /ditherFragmentShader|OrderedDither|OutputLevels|bayer4|dotMask/);
  assert.match(adapter, /imageDitheringFragmentShader \} from '@paper-design\/shaders'/);
  assert.match(adapter, /extends ShaderPass/);
  assert.match(adapter, /image\.rgb \/= max\(surfaceAlpha, 0\.00001\)/);
  assert.match(adapter, /clamp\(color, 0\.0, 1\.0\) \* surfaceAlpha, surfaceAlpha/);
  assert.match(adapter, /'u_image'/);
  assert.match(adapter, /\.replace\(imageFlip, ''\)/);
  assert.match(adapter, /this\.resolution\.set\(width, height\)/);
  assert.match(adapter, /pass\.pixelRatio\.value = pixelRatio/);
  assert.match(adapter, /pass\.dispose\(\)/);
  assert.match(adapter, /u_originalColors: new Uniform\(true\)/);
  assert.match(
    styles,
    /\.home-resource-links \.app-sidenav__quick-link \{[^}]*border-radius: var\(--borderRadius2XLarge\)/,
  );
});

test('Paper heatmap prepares live channels and preserves the original cube surface', async () => {
  const source = await fs.readFile(
    new URL('apps/docsite/src/components/paper-heatmap.tsx', repoRoot),
    'utf8',
  );
  assert.match(source, /heatmapFragmentShader/);
  assert.match(source, /from '@paper-design\/shaders'/);
  assert.match(source, /fragmentShader: heatmapFragmentShader\.replace\('#version 300 es', ''\)/);
  assert.match(source, /new KawaseBlurPass/);
  assert.match(source, /512 \/ Math\.max\(width, height\)/);
  assert.match(source, /vec4\(heat \* surface\.a, surface\.a\)/);
  assert.doesNotMatch(source, /heat \* surface\.rgb|heat \* lighting/);
  assert.match(source, /lessThanEqual\(abs\(heat - u_base\.rgb\), vec3\(0\.012\)\)/);
  assert.match(source, /pass\.setLightMode\(lightMode\)/);
  assert.match(source, /if \(!reduceMotion\) pass\.time\.value \+=/);
  assert.match(source, /pass\.time\.value \+= Math\.min\(delta, 0\.1\) \* 0\.67/);
  assert.match(source, /stage\.dispose\(\)/);
  assert.match(source, /buffer\.dispose\(\)/);
  assert.equal((source.match(/coreaiDarkTheme\.colorNeutralBackground6/g) ?? []).length, 2);
  assert.match(source, /coreaiBrandVariants\[80\]/);
  for (const mode of ['dark', 'light']) {
    const palette = source
      .match(new RegExp(`const ${mode}Colors = \\[([\\s\\S]*?)\\n\\];`))[1]
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean);
    assert.equal(palette.length, 10);
    assert.equal(
      palette[0],
      mode === 'dark'
        ? 'coreaiDarkTheme.colorNeutralBackground6'
        : 'coreaiLightTheme.colorNeutralBackground1',
    );
    assert.deepEqual(palette.slice(0, 2), Array(2).fill(palette[0]));
    assert.equal(palette[2], '`${coreaiBrandVariants[140]}1f`');
    assert.deepEqual(
      palette.slice(3),
      [140, 130, 110, 100, 80, 80, 80].map((tone) => `coreaiBrandVariants[${tone}]`),
    );
  }
  assert.doesNotMatch(source, /azureBrandVariants/);
  assert.doesNotMatch(source, /coreaiDarkTheme\.colorNeutralForeground1/);
  assert.doesNotMatch(source, /coreaiDarkTheme\.colorNeutralForeground[34]/);
  assert.match(source, /u_contour: new Uniform\(1\)/);
  assert.match(source, /u_noise: new Uniform\(0\.025\)/);
});

test('search selection clears the filter, navigates, and closes the sidebar without tracking', async () => {
  const [sidebarSource, appSource] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/components/Sidebar.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/App.tsx', repoRoot), 'utf8'),
  ]);

  assert.match(sidebarSource, /if \(query\.trim\(\)\) \{\s*setQuery\(''\);\s*\}/);
  assert.match(sidebarSource, /navigate\(String\(data\.value\)\);\s*onClose\(\)/);
  assert.match(sidebarSource, /page\.navLabel\.toLowerCase\(\)\.includes\(needle\)/);
  assert.match(sidebarSource, /const openItems = needle \? groups\.map/);
  assert.match(sidebarSource, /onChange=\{\(_event, data\) => setQuery\(data\.value\)\}/);
  assert.match(appSource, /<Navigate to=\{redirect\.to\} replace \/>/);
  assert.match(appSource, /<Route path="\*" element=\{<NotFound \/>\} \/>/);
});

test('Figma previews and resources coexist with Storybook and Markdown actions', async () => {
  const [component, icons, introduction, styles, home] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/components/ComponentPage.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/components/Icons.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/storybook/src/stories/docs/IntroductionPage.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/pages/Introduction.tsx', repoRoot), 'utf8'),
  ]);
  assert.match(component, /if \(source\.kind === 'figma'\)/);
  assert.match(component, /encodeURIComponent\(figmaPreviewSource\.url\)/);
  assert.match(component, /src=\{figmaEmbedUrl\}/);
  assert.match(component, /content\.figmaPreviewSourceId && !hasStorybookResource/);
  assert.match(icons, /export function FigmaLogo/);
  assert.match(styles, /\.component-embed--figma \{\s*height: 560px/);
  assert.match(styles, /\.component-resources \.component-resource-card--disabled/);
  assert.match(home, /href=\{siteLinks\.figma\}/);
  assert.match(introduction, /href: siteLinks\.figma/);
  assert.match(home, /href=\{siteLinks\.storybook\}/);
  assert.match(component, /src=\{embedUrl\.toString\(\)\}/);
  assert.match(component, /content\.resourceSourceIds\.map/);
  assert.match(component, /content\.resourceSourceIds\.length > 0/);
  assert.match(component, /navigator\.clipboard\.writeText\(await response\.text\(\)\)/);
  assert.match(component, /href=\{markdownUrl\}/);
  assert.match(introduction, /href: siteLinks\.docsite/);
});

test('landing fade sits between the joined cubes and clickable hero content', async () => {
  const [logo, styles] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/components/CoreAILogoCube.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/src/styles/docsite.css', repoRoot), 'utf8'),
  ]);
  assert.match(logo, /position: \[x \* 0\.94, y \* 0\.94, 0\]/);
  assert.match(
    styles,
    /\.home-landing::before \{[^}]*z-index: 1;[^}]*pointer-events: none;[^}]*radial-gradient\(/,
  );
  assert.match(styles, /\.home-visual \{[^}]*z-index: 0;/);
  assert.match(styles, /\.home-foreground \{[^}]*z-index: 2;/);
  assert.match(styles, /\.home-landing::before \{\s*display: none;/);
});

test('landing page reserves audience content and exposes Storybook, Figma, and npm links', async () => {
  const [homeSource, registrySource] = await Promise.all([
    fs.readFile(new URL('apps/docsite/src/pages/Introduction.tsx', repoRoot), 'utf8'),
    fs.readFile(new URL('apps/docsite/site-registry.json', repoRoot), 'utf8'),
  ]);
  assert.match(homeSource, /<PageLayout id="resources" hideTitle>/);
  assert.match(homeSource, /Audience cards will return when their supporting content is ready/);
  assert.doesNotMatch(homeSource, /className="home-audiences"/);
  assert.match(homeSource, /href=\{siteLinks\.storybook\}/);
  assert.match(homeSource, /href=\{siteLinks\.figma\}/);
  assert.match(
    homeSource,
    /<FigmaLogo className="app-sidenav__quick-link-brand app-sidenav__figma-logo" \/>/,
  );
  assert.match(homeSource, /href=\{siteLinks\.npmPackage\}/);
  assert.match(homeSource, /<NpmLogo className="app-sidenav__quick-link-brand" \/>/);
  assert.equal((homeSource.match(/className="app-sidenav__quick-link-title"/g) ?? []).length, 3);
  assert.doesNotMatch(homeSource, /Same Foundry look|New foundation/);
  assert.match(homeSource, /className="home-resource-links app-sidenav__quick-links"/);
  assert.equal((homeSource.match(/className="app-sidenav__quick-link"/g) ?? []).length, 3);
  assert.equal(
    (homeSource.match(/<ExternalIcon className="app-sidenav__quick-link-open"/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(homeSource, /description:|home-card__description/);
  const home = JSON.parse(registrySource).pages.find((page) => page.id === 'resources');
  assert.deepEqual(
    home.anchors.map((anchor) => anchor.id),
    ['get-started'],
  );
});

test('Typography retains the branded external font download without setup instructions', async () => {
  const source = await fs.readFile(
    new URL('apps/docsite/src/pages/Typography.tsx', repoRoot),
    'utf8',
  );
  assert.match(
    source,
    /<Link href=\{siteLinks\.fontDownload\} external>\s*Download Aptos from Microsoft\s*<\/Link>/,
  );
  assert.doesNotMatch(source, /Set up Aptos|siteLinks\.fontGuide/);
});
