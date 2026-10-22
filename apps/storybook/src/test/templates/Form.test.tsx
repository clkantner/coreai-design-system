// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Companion tests: copy beside Form.tsx and change the import below to './Form'.
 * Requires Vitest Browser Mode, @vitest/browser-playwright, Playwright Chromium,
 * and vitest-browser-react. Setup and the repository run command are in the
 * template's generated Source Code page. The provider helper is included here
 * so the tests do not depend on private repository test utilities.
 */
import * as React from 'react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import { CoreAIFluentProvider } from '@coreai-ds/react-components';
import {
  BasicFormExample,
  FormInputOptionsExample,
  FormWithDrawerExample,
} from '../../stories/templates/Form';

function renderCoreAIComponent(component: React.ReactNode) {
  return render(component, {
    wrapper: ({ children }) => <CoreAIFluentProvider>{children}</CoreAIFluentProvider>,
  });
}

afterEach(cleanup);

test.each([
  { name: 'Typical form', Example: BasicFormExample },
  { name: 'Drawer form', Example: FormWithDrawerExample },
  { name: 'Input reference', Example: FormInputOptionsExample },
])('$name reflows without horizontal scrolling at a narrow viewport', async ({ Example }) => {
  const previousViewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(320, 900);
  try {
    const screen = await renderCoreAIComponent(<Example />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    if (Example === FormWithDrawerExample) {
      await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
      await expect
        .element(page.getByRole('dialog', { name: 'Advanced options', exact: true }))
        .toBeInTheDocument();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  } finally {
    await page.viewport(previousViewport.width, previousViewport.height);
  }
});

test('submits trimmed, validated values locally without inapplicable fields', async () => {
  const screen = await renderCoreAIComponent(<BasicFormExample />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), '  Research  ');
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

  const result = screen.getByRole('region', { name: 'Submission result' });
  await expect.element(result).toHaveTextContent('No project was created or data sent.');
  expect(result).toHaveTextContent('"name": "Research"');
  expect(result).toHaveTextContent('"region": "East US"');
  expect(result).not.toHaveTextContent('"workers"');
  expect(result).not.toHaveTextContent('"autoscale"');
  expect(result).not.toHaveTextContent('"scheduled"');
  expect(screen.getByRole('button', { name: /advanced options/i })).not.toBeInTheDocument();
  expect(screen.getByRole('spinbutton', { name: /^Maximum workers/ })).not.toBeInTheDocument();
  expect(result).not.toHaveTextContent('"email"');
  expect(result).not.toHaveTextContent('"startAt"');
});

test('reports an associated required error and focuses the first invalid field', async () => {
  const screen = await renderCoreAIComponent(<BasicFormExample />);
  const name = screen.getByRole('textbox', { name: /^Project name/ });
  expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  await expect.element(name).toHaveFocus();
  expect(name).toHaveAttribute('aria-invalid', 'true');
  expect(name).toHaveAccessibleDescription(/Enter a project name/);
  await userEvent.fill(name, 'Research');
  expect(name).not.toHaveAttribute('aria-invalid', 'true');
});

test('validates email only while enabled, preserving but not submitting a hidden value', async () => {
  const screen = await renderCoreAIComponent(<BasicFormExample />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  const notifications = screen.getByRole('checkbox', { name: 'Send email notifications' });
  await userEvent.click(notifications);
  const email = screen.getByRole('textbox', { name: /^Notification email/ });
  await userEvent.fill(email, 'invalid');
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  await expect.element(email).toHaveFocus();
  expect(email).toHaveAccessibleDescription(/valid notification email/);
  await userEvent.fill(email, 'team@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).toHaveTextContent(
    '"email": "team@example.com"',
  );
  await userEvent.click(notifications);
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toHaveTextContent(
    '"email"',
  );
  await userEvent.click(notifications);
  expect(email).toHaveValue('team@example.com');
});

test('Drawer validates the upper worker limit before committing settings', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  const workers = dialog.getByRole('spinbutton', { name: /^Maximum workers/ });
  await userEvent.fill(workers, '21');
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(workers).toHaveFocus();
  expect(workers).toHaveAccessibleDescription(/whole number from 1 to 20/);
  await userEvent.fill(workers, '20');
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(dialog).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).toHaveTextContent(
    '"workers": 20',
  );
});

test.each(['0', '1.5', ''])('rejects invalid maximum workers "%s"', async (value) => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  const workers = dialog.getByRole('spinbutton', { name: /^Maximum workers/ });
  await userEvent.fill(workers, value);
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(workers).toHaveFocus();
  expect(workers).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toBeInTheDocument();
});

test('requires scheduled start only when scheduling is enabled', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  const schedule = dialog.getByRole('checkbox', { name: 'Schedule a start' });
  await userEvent.click(schedule);
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  const start = dialog.getByLabelText(/^Start date and time/);
  await expect.element(start).toHaveFocus();
  expect(start).toHaveAccessibleDescription(/Choose a start date and time/);
  await userEvent.click(schedule);
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(dialog).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toHaveTextContent(
    '"startAt"',
  );
});

test('converts a scheduled local time to UTC and retains it when scheduling is toggled', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  const trigger = screen.getByRole('button', { name: 'Edit advanced options' });
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  const schedule = dialog.getByRole('checkbox', { name: 'Schedule a start' });
  await userEvent.click(schedule);
  const start = dialog.getByLabelText(/^Start date and time/);
  await userEvent.fill(start, '2026-11-01T09:30');
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(dialog).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).toHaveTextContent(
    `"startAt": "${new Date(2026, 10, 1, 9, 30).toISOString()}"`,
  );
  await userEvent.click(trigger);
  await userEvent.click(schedule);
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(dialog).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toHaveTextContent(
    '"startAt"',
  );
  await userEvent.click(trigger);
  await userEvent.click(schedule);
  expect(start).toHaveValue('2026-11-01T09:30');
});

test('Drawer Apply commits settings without submitting the main form and restores focus', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  const trigger = screen.getByRole('button', { name: 'Edit advanced options' });
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  await userEvent.fill(dialog.getByRole('spinbutton', { name: /^Maximum workers/ }), '6');
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
  expect(screen.getByRole('region', { name: 'Advanced configuration' })).toHaveTextContent(
    '6 maximum workers',
  );
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  expect(screen.getByRole('region', { name: 'Submission result' })).toHaveTextContent(
    '"workers": 6',
  );
  await userEvent.click(trigger);
  expect(dialog.getByRole('spinbutton', { name: /^Maximum workers/ })).toHaveValue(6);
});

test.each(['Cancel', 'Close advanced options', 'Escape'])(
  'Drawer %s discards draft values and restores trigger focus',
  async (dismissal) => {
    const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
    const trigger = screen.getByRole('button', { name: 'Edit advanced options' });
    await userEvent.click(trigger);
    const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
    await userEvent.fill(dialog.getByRole('spinbutton', { name: /^Maximum workers/ }), '9');
    if (dismissal === 'Escape') {
      await userEvent.keyboard('{Escape}');
    } else {
      await userEvent.click(dialog.getByRole('button', { name: dismissal, exact: true }));
    }
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Advanced configuration' })).toHaveTextContent(
      '2 maximum workers',
    );
    await userEvent.click(trigger);
    expect(dialog.getByRole('spinbutton', { name: /^Maximum workers/ })).toHaveValue(2);
  },
);

test('invalid Drawer Apply stays open and focuses the invalid setting', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  const workers = dialog.getByRole('spinbutton', { name: /^Maximum workers/ });
  await userEvent.fill(workers, '');
  await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
  await expect.element(workers).toHaveFocus();
  expect(workers).toHaveAttribute('aria-invalid', 'true');
  expect(workers).toHaveAccessibleDescription(/whole number from 1 to 20/);
  expect(dialog).toBeInTheDocument();
});

test('Drawer backdrop dismissal discards the draft and restores focus', async () => {
  const previousViewport = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(1100, 800);
  try {
    const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
    const trigger = screen.getByRole('button', { name: 'Edit advanced options' });
    await userEvent.click(trigger);
    const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
    await userEvent.fill(dialog.getByRole('spinbutton', { name: /^Maximum workers/ }), '7');
    // A modal backdrop is intentionally not an accessible control.
    await userEvent.click(page.elementLocator(document.body), { position: { x: 8, y: 8 } });
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await userEvent.click(trigger);
    expect(dialog.getByRole('spinbutton', { name: /^Maximum workers/ })).toHaveValue(2);
  } finally {
    await page.viewport(previousViewport.width, previousViewport.height);
  }
});

test('Enter in the Drawer applies its own form, not the main form', async () => {
  const screen = await renderCoreAIComponent(<FormWithDrawerExample />);
  await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
  const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
  await userEvent.fill(dialog.getByRole('spinbutton', { name: /^Maximum workers/ }), '4');
  await userEvent.keyboard('{Enter}');
  await expect.element(dialog).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Advanced configuration' })).toHaveTextContent(
    '4 maximum workers',
  );
  expect(screen.getByRole('textbox', { name: /^Project name/ })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toBeInTheDocument();
});

test.each([
  { name: 'Typical form', Example: BasicFormExample },
  { name: 'Drawer form', Example: FormWithDrawerExample },
])('$name Reset restores applicable defaults and clears validation', async ({ Example }) => {
  const screen = await renderCoreAIComponent(<Example />);
  await userEvent.fill(screen.getByRole('textbox', { name: /^Project name/ }), 'Research');
  if (Example === FormWithDrawerExample) {
    await userEvent.click(screen.getByRole('button', { name: 'Edit advanced options' }));
    const dialog = page.getByRole('dialog', { name: 'Advanced options', exact: true });
    await userEvent.fill(dialog.getByRole('spinbutton', { name: /^Maximum workers/ }), '8');
    await userEvent.click(dialog.getByRole('button', { name: 'Apply', exact: true }));
    await expect.element(dialog).not.toBeInTheDocument();
  }
  await userEvent.click(screen.getByRole('checkbox', { name: 'Send email notifications' }));
  await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset', exact: true }));
  const name = screen.getByRole('textbox', { name: /^Project name/ });
  expect(name).toHaveValue('');
  expect(name).not.toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('checkbox', { name: 'Send email notifications' })).not.toBeChecked();
  expect(screen.getByRole('region', { name: 'Submission result' })).not.toBeInTheDocument();
  if (Example === FormWithDrawerExample) {
    expect(screen.getByRole('region', { name: 'Advanced configuration' })).toHaveTextContent(
      '2 maximum workers',
    );
  }
});

test('reference controls have names and search visibly filters member choices', async () => {
  const screen = await renderCoreAIComponent(<FormInputOptionsExample />);
  expect(screen.getByRole('textbox', { name: /^Display name/ })).toHaveAttribute('required');
  expect(
    screen.getByRole('textbox', { name: 'Name with an error', exact: true }),
  ).toHaveAccessibleDescription('Enter a name before continuing.');
  expect(screen.getByRole('textbox', { name: 'Verified alias', exact: true })).toHaveAttribute(
    'readonly',
  );
  expect(screen.getByRole('textbox', { name: 'Managed setting', exact: true })).toBeDisabled();
  expect(screen.getByRole('spinbutton', { name: 'Retry attempts', exact: true })).toHaveValue('3');
  expect(screen.getByRole('slider', { name: 'Priority: 50', exact: true })).toHaveValue('50');
  await userEvent.fill(
    screen.getByRole('searchbox', { name: 'Search within choices', exact: true }),
    'Bl',
  );
  expect(
    screen.getByText('Matching unselected members: Blair', { exact: true }),
  ).toBeInTheDocument();
  const date = screen.getByLabelText(/^Review date/);
  expect(date).toHaveAttribute('min', '2026-01-01');
  expect(date).toHaveAttribute('max', '2026-12-31');
  expect(screen.getByRole('region', { name: 'Specialized inputs' })).not.toBeInTheDocument();
  for (const [name, id] of [
    ['ColorPicker', 'colorpicker'],
    ['SwatchPicker', 'swatchpicker'],
    ['Rating', 'rating'],
  ]) {
    expect(screen.getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      `?path=/story/components-${id}--default`,
    );
  }
});

test('file selection stays local and a rejected empty file has explicit feedback', async () => {
  const screen = await renderCoreAIComponent(<FormInputOptionsExample />);
  const input = screen
    .getByRole('region', { name: 'File selection' })
    .element()
    .querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('The file picker must expose a native file input.');
  await userEvent.upload(input, new File(['Reference'], 'reference.txt', { type: 'text/plain' }));
  await expect
    .element(screen.getByText('Selected locally: reference.txt', { exact: true }))
    .toBeInTheDocument();
  await userEvent.upload(input, new File([], 'empty.txt', { type: 'text/plain' }));
  await expect
    .element(screen.getByRole('region', { name: 'File selection' }).getByRole('alert'))
    .toHaveTextContent('empty.txt');
  expect(input).toHaveAccessibleDescription(/empty.txt/);
  expect(screen.getByText('Selected locally: reference.txt', { exact: true })).toBeInTheDocument();
});
