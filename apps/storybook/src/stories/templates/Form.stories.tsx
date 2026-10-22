// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BasicFormExample, FormInputOptionsExample, FormWithDrawerExample } from './Form';

/**
 * A typical form with Field labels, hints, and validation. Enabling notifications
 * reveals a required email field. Submit previews validated data locally;
 * Reset restores defaults. Larger optional configuration is shown separately
 * in the Drawer example.
 *
 * @summary Typical form with dependent fields and local validation.
 */
export const Default: StoryObj = {
  name: 'Typical form',
  render: () => <BasicFormExample />,
};

/**
 * Break out a larger configuration into a Drawer. Apply validates and commits the
 * draft without submitting the main form. Cancel, close, Escape, and backdrop
 * dismissal discard draft changes; closing restores focus to the trigger.
 *
 * @summary Form with draft/apply/cancel advanced settings in an overlay Drawer.
 */
export const WithDrawer: StoryObj = {
  name: 'Form with advanced-options Drawer',
  render: () => <FormWithDrawerExample />,
};

/**
 * Independent examples of text, single/multiple choice, boolean, numeric, date,
 * and file inputs. Includes Field states and guidance on choosing controls,
 * with links to specialized color and rating component examples.
 * Not a suggestion to put every input into one form.
 *
 * @summary Input-choice reference with Field states and accessible control labels.
 */
export const InputOptions: StoryObj = {
  name: 'Input options',
  render: () => <FormInputOptionsExample />,
};

/**
 * Copy-paste template — not an importable component. Copy the full source from
 * the `templates-form--source-code` docs entry, including the companion browser
 * tests and their setup instructions.
 *
 * Two task-focused forms and an input-choice reference. Use Field for label,
 * hint, and error associations; dependent fields for conditional requirements;
 * and a Drawer for larger optional configuration.
 * Submission only previews local data. Add your own async submission, pending
 * state, failure announcements, and domain-specific tests when adapting it.
 *
 * @summary Two form configurations, an input-options reference, and copyable browser tests.
 */
const meta: Meta = {
  title: 'Templates/Form',
  component: BasicFormExample,
  parameters: { layout: 'fullscreen' },
};

export default meta;
