#!/usr/bin/env bash
set -euo pipefail
npm --workspace packages/coreai-fluentui-react run type-check
npm --workspace packages/coreai-fluentui-react run build
npm --workspace packages/coreai-fluentui-react test
npm --workspace packages/coreai-fluentui-react run test:tree-shaking
