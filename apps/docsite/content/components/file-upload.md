---
id: file-upload
title: FileUpload
summary: Styled drop zone exposing stable react-dropzone options and render state.
status: under-construction
resources: []
reference:
  component: components-fileupload
---

## Guidance status

This reference includes working examples. CoreAI UX guidance for this page still needs review.

## Component description

Thin styled wrapper around stable `react-dropzone` options. Consumers own
validation messages, upload behavior, and selected-file presentation.
Keep children presentational because the drop-zone root owns activation;
use `useDropzone` directly for nested controls or custom activation.
