// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

declare module 'virtual:reference-proof-examples' {
  import type { ComponentType } from 'react';
  export const loadExamples: Record<
    string,
    () => Promise<{ examples: Record<string, ComponentType> }>
  >;
}
