#!/usr/bin/env bash
set -euo pipefail
npm --workspace packages/react-components run type-check
npm --workspace packages/react-components run build
npm --workspace packages/react-components test
npm --workspace packages/react-components run test:tree-shaking
