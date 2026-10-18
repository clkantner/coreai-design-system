---
id: date-time-picker
title: DateTimePicker
summary: 'Native browser input for picking a date, time, or related value.'
status: under-construction
resources: []
reference:
  component: components-datetimepicker
---

## Guidance status

This reference includes working examples. CoreAI UX guidance for this page still needs review.

## Component description

`DateTimePicker` renders the browser's native picker UI for date/time values —
a thin wrapper around `Input` that restricts `type` to HTML's temporal input
types (`date` [default], `time`, `datetime-local`, `month`, `week`), rather than
the custom popup calendar / dropdown list used by the compat `DatePicker`/`TimePicker`.
The native calendar/clock icon is swapped for a themed Fluent icon button that
opens the same native picker via `showPicker()`.

`value`/`defaultValue`/`min`/`max` are plain `Date` objects (not strings) —
conversion to/from the native input string format happens internally, based
on local wall-clock `Date` fields. Construct/compare these `Date`s using local
fields too (e.g. `new Date(y, m, d)`), not UTC/ISO parsing (e.g. `new Date("2026-07-29")`),
or the calendar day can shift by one in negative-UTC-offset timezones. A `time`
value's date portion is filled in with "today" at the moment it's parsed, so
two `onChange` events on different days won't produce `Date`s that are `===`
or day-equal even for the same time of day.

`min`/`max`/`required` are enforced by the browser's native constraint
validation. `onValidationResult` mirrors the compat `DatePicker`'s callback of
the same name, reporting the result derived from the input's `ValidityState`.
Pair it with `Field`'s `validationState`/`validationMessage` to surface it -
Fluent's `Input` already themes the invalid state once nested in a `Field`,
no custom styling needed, as shown in `Controlled` and `Range` (the latter
feeds each side's `min`/`max` from the other side's current value).

`clearable` adds an "x" icon button, shown once there's a value to act on,
mirroring `Dropdown`/`Combobox`'s `clearable` prop. If `defaultValue` is set,
clicking it resets back to `defaultValue`; otherwise it clears the value.
