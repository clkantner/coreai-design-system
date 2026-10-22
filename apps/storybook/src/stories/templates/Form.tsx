// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Copy-paste form examples, not a package-level Form API.
 *
 * Start with BasicFormExample. Use dependent fields when an answer requires
 * more information and a Drawer for a larger optional configuration subtask.
 * Field supplies labels, hints, and associated errors. An inline disclosure
 * can suit smaller optional settings that do not need a separate editing task.
 *
 * Submission only previews validated data locally. Replace that step with your
 * async handler: disable duplicate submissions while pending, announce failures,
 * and preserve entered values on failure. Never send hidden, inapplicable values.
 * The companion tests in the Source Code docs describe the behavioral contract.
 */
import * as React from 'react';
import {
  Button,
  Checkbox,
  Combobox,
  DateTimePicker,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  Dropdown,
  Field,
  FileUpload,
  Input,
  Link,
  makeStyles,
  Option,
  OverlayDrawer,
  Radio,
  RadioGroup,
  SearchBox,
  Select,
  Slider,
  SpinButton,
  Switch,
  Tag,
  TagPicker,
  TagPickerControl,
  TagPickerGroup,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
  Text,
  Textarea,
  tokens,
  useId,
  useRestoreFocusSource,
  useRestoreFocusTarget,
} from '@coreai-ds/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXXL,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalL,
    minWidth: 0,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    alignItems: 'center',
  },
  disclosure: {
    alignSelf: 'flex-start',
  },
  inset: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusLarge,
  },
  result: {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    marginTop: 0,
    marginBottom: 0,
  },
  drawer: {
    maxWidth: '100%',
  },
  fluidControl: {
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
  },
});

type Settings = {
  autoscale: boolean;
  workers: string;
  scheduled: boolean;
  startAt: Date | null;
};

type Project = {
  name: string;
  description: string;
  region: string;
  access: string;
  notify: boolean;
  email: string;
};

type FieldName = 'name' | 'email' | 'workers' | 'startAt';
type Errors = Partial<Record<FieldName, string>>;
type Touched = Partial<Record<FieldName, boolean>>;

function shouldValidateOnBlur(event: React.FocusEvent<HTMLElement>) {
  // Let form actions validate/reset after the click, without moving the button on blur.
  return !(
    event.relatedTarget instanceof HTMLButtonElement &&
    (event.relatedTarget.type === 'submit' || event.relatedTarget.type === 'reset')
  );
}

function visibleErrorsFor(errors: Errors, touched: Touched, attempted: boolean): Errors {
  const visible: Errors = {};
  for (const field of ['name', 'email', 'workers', 'startAt'] as const) {
    if (attempted || touched[field]) visible[field] = errors[field];
  }
  return visible;
}

const defaultProject: Project = {
  name: '',
  description: '',
  region: 'East US',
  access: 'private',
  notify: false,
  email: '',
};

const defaultSettings: Settings = {
  autoscale: true,
  workers: '2',
  scheduled: false,
  startAt: null,
};

function validateProject(project: Project): Errors {
  const errors: Errors = {};
  if (!project.name.trim()) errors.name = 'Enter a project name.';
  if (project.notify && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(project.email.trim())) {
    errors.email = 'Enter a valid notification email address.';
  }
  return errors;
}

function validateSettings(settings: Settings): Errors {
  const errors: Errors = {};
  const workers = Number(settings.workers);
  if (!settings.workers.trim() || !Number.isInteger(workers) || workers < 1 || workers > 20) {
    errors.workers = 'Enter a whole number from 1 to 20.';
  }
  if (settings.scheduled && (!settings.startAt || !Number.isFinite(settings.startAt.getTime()))) {
    errors.startAt = 'Choose a start date and time.';
  }
  return errors;
}

function AdvancedSettings({
  value,
  onChange,
  errors,
  onBlur,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
  errors: Errors;
  onBlur: (field: FieldName) => void;
}) {
  const styles = useStyles();
  return (
    <div className={styles.section}>
      <Switch
        label="Scale automatically"
        checked={value.autoscale}
        onChange={(_, data) => onChange({ ...value, autoscale: data.checked })}
      />
      <Field
        label="Maximum workers"
        required
        hint="A whole number from 1 to 20."
        validationMessage={errors.workers}
      >
        <Input
          type="number"
          min={1}
          max={20}
          step={1}
          value={value.workers}
          onChange={(_, data) => onChange({ ...value, workers: data.value })}
          onBlur={(event) => {
            if (shouldValidateOnBlur(event)) onBlur('workers');
          }}
        />
      </Field>
      <Checkbox
        label="Schedule a start"
        checked={value.scheduled}
        onChange={(_, data) => onChange({ ...value, scheduled: data.checked === true })}
      />
      {value.scheduled && (
        <Field
          label="Start date and time"
          required
          hint="Your local time. Converted to UTC in the submission preview."
          validationMessage={errors.startAt}
        >
          <DateTimePicker
            type="datetime-local"
            value={value.startAt}
            onChange={(_, data) => onChange({ ...value, startAt: data.value })}
            onBlur={(event) => {
              if (shouldValidateOnBlur(event)) onBlur('startAt');
            }}
          />
        </Field>
      )}
    </div>
  );
}

function ProjectForm({ withDrawer = false }: { withDrawer?: boolean }) {
  const styles = useStyles();
  const headingId = useId('project-heading');
  const drawerTitleId = useId('advanced-title');
  const drawerFormId = useId('advanced-form');
  const mainFormRef = React.useRef<HTMLFormElement>(null);
  const drawerFormRef = React.useRef<HTMLFormElement>(null);
  const drawerTriggerRef = React.useRef<HTMLButtonElement>(null);
  const drawerWasOpen = React.useRef(false);
  const restoreSource = useRestoreFocusSource();
  const restoreTarget = useRestoreFocusTarget();
  const [project, setProject] = React.useState(defaultProject);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [draft, setDraft] = React.useState(defaultSettings);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [touched, setTouched] = React.useState<Touched>({});
  const [draftTouched, setDraftTouched] = React.useState<Touched>({});
  const [attempted, setAttempted] = React.useState(false);
  const [draftAttempted, setDraftAttempted] = React.useState(false);
  const [focusInvalid, setFocusInvalid] = React.useState<'main' | 'drawer' | null>(null);
  const [result, setResult] = React.useState<string>();

  React.useEffect(() => {
    // Also restore after pointer dismissal, which Tabster does not guarantee.
    if (drawerWasOpen.current && !drawerOpen) drawerTriggerRef.current?.focus();
    drawerWasOpen.current = drawerOpen;
  }, [drawerOpen]);

  React.useEffect(() => {
    if (!focusInvalid) return;
    const form = focusInvalid === 'main' ? mainFormRef.current : drawerFormRef.current;
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    setFocusInvalid(null);
  }, [focusInvalid]);

  const projectErrors = validateProject(project);
  const draftErrors = validateSettings(draft);
  const visibleErrors = visibleErrorsFor(projectErrors, touched, attempted);
  const visibleDraftErrors = visibleErrorsFor(draftErrors, draftTouched, draftAttempted);

  function updateProject(next: Project) {
    setProject(next);
    setResult(undefined);
  }

  function updateSettings(next: Settings) {
    setSettings(next);
    setResult(undefined);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setResult(undefined);
    if (Object.keys(projectErrors).length) {
      setFocusInvalid('main');
      return;
    }
    setResult(
      JSON.stringify(
        {
          name: project.name.trim(),
          description: project.description.trim(),
          region: project.region,
          access: project.access,
          notify: project.notify,
          ...(project.notify ? { email: project.email.trim() } : {}),
          ...(withDrawer
            ? {
                autoscale: settings.autoscale,
                workers: Number(settings.workers),
                scheduled: settings.scheduled,
                ...(settings.scheduled ? { startAt: settings.startAt?.toISOString() } : {}),
              }
            : {}),
        },
        null,
        2,
      ),
    );
  }

  function reset() {
    setProject(defaultProject);
    setSettings(defaultSettings);
    setDraft(defaultSettings);
    setTouched({});
    setDraftTouched({});
    setAttempted(false);
    setDraftAttempted(false);
    setDrawerOpen(false);
    setResult(undefined);
  }

  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <Text as="h1" preset="heading2" id={headingId}>
          Create project
        </Text>
        <Text>
          {withDrawer
            ? 'Keep the essentials here. Use a Drawer for a larger configuration subtask.'
            : 'Start with the essentials. Reveal more fields only when they are relevant.'}
        </Text>
        <Text preset="bodyS" foreground={2}>
          Required fields are marked with an asterisk. This example does not create a real project.
        </Text>
      </header>
      <form
        ref={mainFormRef}
        aria-labelledby={headingId}
        noValidate
        onSubmit={submit}
        onReset={reset}
        className={styles.section}
      >
        <Field
          label="Project name"
          required
          hint="Use a recognizable name for your team."
          validationMessage={visibleErrors.name}
        >
          <Input
            name="projectName"
            autoComplete="off"
            value={project.name}
            onChange={(_, data) => updateProject({ ...project, name: data.value })}
            onBlur={(event) => {
              if (shouldValidateOnBlur(event))
                setTouched((current) => ({ ...current, name: true }));
            }}
          />
        </Field>
        <Field label="Description" hint="Optional. Explain what this project is for.">
          <Textarea
            value={project.description}
            onChange={(_, data) => updateProject({ ...project, description: data.value })}
            resize="vertical"
          />
        </Field>
        <Field label="Region">
          <Dropdown
            className={styles.fluidControl}
            value={project.region}
            selectedOptions={[project.region]}
            onOptionSelect={(_, data) =>
              updateProject({ ...project, region: data.selectedOptions[0] })
            }
          >
            <Option>East US</Option>
            <Option>West Europe</Option>
            <Option>Southeast Asia</Option>
          </Dropdown>
        </Field>
        <Field label="Access level">
          <RadioGroup
            value={project.access}
            onChange={(_, data) => updateProject({ ...project, access: data.value })}
          >
            <Radio value="private" label="Private to my team" />
            <Radio value="organization" label="Everyone in my organization" />
          </RadioGroup>
        </Field>
        <Checkbox
          label="Send email notifications"
          checked={project.notify}
          onChange={(_, data) => updateProject({ ...project, notify: data.checked === true })}
        />
        {project.notify && (
          <Field
            label="Notification email"
            required
            hint="Only used while email notifications are enabled."
            validationMessage={visibleErrors.email}
          >
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={project.email}
              onChange={(_, data) => updateProject({ ...project, email: data.value })}
              onBlur={(event) => {
                if (shouldValidateOnBlur(event))
                  setTouched((current) => ({ ...current, email: true }));
              }}
            />
          </Field>
        )}

        {withDrawer && (
          <section aria-label="Advanced configuration" className={styles.inset}>
            <Text preset="bodyStrong">Advanced options</Text>
            <Text>
              {settings.workers} maximum workers; automatic scaling{' '}
              {settings.autoscale ? 'on' : 'off'};{' '}
              {settings.scheduled && settings.startAt
                ? `starts ${settings.startAt.toLocaleString()}`
                : 'no scheduled start'}
              .
            </Text>
            <Button
              {...restoreTarget}
              ref={drawerTriggerRef}
              type="button"
              className={styles.disclosure}
              onClick={() => {
                setDraft({ ...settings });
                setDraftTouched({});
                setDraftAttempted(false);
                setDrawerOpen(true);
              }}
            >
              Edit advanced options
            </Button>
          </section>
        )}
        <div className={styles.actions}>
          <Button type="submit" appearance="primary">
            Create project
          </Button>
          <Button type="reset">Reset</Button>
        </div>
      </form>
      {result && (
        <section aria-label="Submission result" className={styles.inset}>
          <Text as="p" role="status">
            Validated locally. No project was created or data sent.
          </Text>
          <pre className={styles.result}>{result}</pre>
        </section>
      )}

      {withDrawer && (
        <OverlayDrawer
          {...restoreSource}
          className={styles.drawer}
          position="end"
          size="medium"
          aria-labelledby={drawerTitleId}
          open={drawerOpen}
          onOpenChange={(_, data) => setDrawerOpen(data.open)}
        >
          <DrawerHeader>
            <DrawerHeaderTitle
              heading={{ id: drawerTitleId }}
              action={
                <Button
                  type="button"
                  appearance="subtle"
                  aria-label="Close advanced options"
                  icon={<DismissRegular />}
                  onClick={() => setDrawerOpen(false)}
                />
              }
            >
              Advanced options
            </DrawerHeaderTitle>
          </DrawerHeader>
          <DrawerBody>
            <form
              id={drawerFormId}
              ref={drawerFormRef}
              aria-label="Advanced options"
              noValidate
              className={styles.section}
              onSubmit={(event) => {
                event.preventDefault();
                setDraftAttempted(true);
                if (Object.keys(draftErrors).length) {
                  setFocusInvalid('drawer');
                  return;
                }
                updateSettings(draft);
                setDrawerOpen(false);
              }}
            >
              <Text>
                Apply saves these settings to the form. Cancel or dismiss to discard your changes.
              </Text>
              <AdvancedSettings
                value={draft}
                onChange={setDraft}
                errors={visibleDraftErrors}
                onBlur={(field) => setDraftTouched((current) => ({ ...current, [field]: true }))}
              />
            </form>
          </DrawerBody>
          <DrawerFooter className={styles.actions}>
            <Button type="submit" form={drawerFormId} appearance="primary">
              Apply
            </Button>
            <Button type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </OverlayDrawer>
      )}
    </div>
  );
}

export function BasicFormExample() {
  return <ProjectForm />;
}

export function FormWithDrawerExample() {
  return <ProjectForm withDrawer />;
}

const environments = ['Development', 'Test', 'Staging', 'Production'];
const members = ['Alex', 'Blair', 'Casey', 'Drew'];

/** A control-choice reference, not a suggestion to put every input in one form. */
export function FormInputOptionsExample() {
  const styles = useStyles();
  const fileHintId = useId('file-hint');
  const fileErrorId = useId('file-error');
  const [search, setSearch] = React.useState('');
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
  const [memberQuery, setMemberQuery] = React.useState('');
  const [selectedEnvironments, setSelectedEnvironments] = React.useState<string[]>([]);
  const [priority, setPriority] = React.useState(50);
  const [files, setFiles] = React.useState<string[]>([]);
  const [fileError, setFileError] = React.useState('');
  const [dateError, setDateError] = React.useState<string>();
  const filteredMembers = members.filter(
    (member) =>
      !selectedMembers.includes(member) && member.toLowerCase().includes(memberQuery.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <header className={styles.section}>
        <Text as="h1" preset="heading2">
          Input options
        </Text>
        <Text>
          Choose the simplest control that fits the task. These independent examples stay local and
          are not submitted together.
        </Text>
      </header>
      <section aria-label="Text inputs" className={styles.section}>
        <Text as="h2" preset="heading4">
          Text and Field states
        </Text>
        <Field label="Display name" required hint="A visible label is not a placeholder.">
          <Input autoComplete="name" />
        </Field>
        <Field label="Contact email">
          <Input type="email" autoComplete="email" />
        </Field>
        <Field label="Website">
          <Input type="url" autoComplete="url" />
        </Field>
        <Field label="New password" hint="Use your project's password requirements.">
          <Input type="password" autoComplete="new-password" />
        </Field>
        <Field label="Notes" hint="Optional, up to 200 characters.">
          <Textarea maxLength={200} resize="vertical" />
        </Field>
        <Field
          label="Name with an error"
          validationState="error"
          validationMessage="Enter a name before continuing."
        >
          <Input />
        </Field>
        <Field
          label="Public endpoint"
          validationState="warning"
          validationMessage="This address will be visible to your organization."
        >
          <Input defaultValue="https://example.com" type="url" />
        </Field>
        <Field label="Verified alias" validationState="success" validationMessage="Alias verified.">
          <Input defaultValue="project-alias" readOnly />
        </Field>
        <Field label="Managed setting" hint="Only an administrator can change this.">
          <Input defaultValue="Organization policy" disabled />
        </Field>
      </section>
      <section aria-label="Selection inputs" className={styles.section}>
        <Text as="h2" preset="heading4">
          Selecting options
        </Text>
        <Field label="Default environment" hint="Select is a simple native choice list.">
          <Select defaultValue="Development">
            {environments.map((environment) => (
              <option key={environment}>{environment}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Enabled environments"
          hint="Dropdown supports richer options and multiple selection."
        >
          <Dropdown
            className={styles.fluidControl}
            multiselect
            value={selectedEnvironments.join(', ')}
            selectedOptions={selectedEnvironments}
            onOptionSelect={(_, data) => setSelectedEnvironments(data.selectedOptions)}
          >
            {environments.map((environment) => (
              <Option key={environment}>{environment}</Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Find environment" hint="Type to narrow a fixed set of choices.">
          <Combobox
            className={styles.fluidControl}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onOptionSelect={(_, data) => setSearch(data.optionText ?? '')}
          >
            {environments
              .filter((environment) => environment.toLowerCase().includes(search.toLowerCase()))
              .map((environment) => (
                <Option key={environment}>{environment}</Option>
              ))}
            {!environments.some((environment) =>
              environment.toLowerCase().includes(search.toLowerCase()),
            ) && <Option disabled>No matching environments</Option>}
          </Combobox>
        </Field>
        <Field
          label="Project members"
          hint="TagPicker makes multiple selections visible and removable."
        >
          <TagPicker
            selectedOptions={selectedMembers}
            onOptionSelect={(_, data) => {
              setSelectedMembers(data.selectedOptions);
              setMemberQuery('');
            }}
          >
            <TagPickerControl className={styles.fluidControl}>
              <TagPickerGroup aria-label="Selected project members">
                {selectedMembers.map((member) => (
                  <Tag key={member} value={member}>
                    {member}
                  </Tag>
                ))}
              </TagPickerGroup>
              <TagPickerInput
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
              />
            </TagPickerControl>
            <TagPickerList>
              {filteredMembers.map((member) => (
                <TagPickerOption key={member} value={member}>
                  {member}
                </TagPickerOption>
              ))}
              {!filteredMembers.length && <Text role="status">No matching members</Text>}
            </TagPickerList>
          </TagPicker>
        </Field>
        <Field
          label="Search within choices"
          hint="Search filters choices; it does not replace a form field."
        >
          <SearchBox value={memberQuery} onChange={(_, data) => setMemberQuery(data.value)} />
        </Field>
        <Text preset="bodyS">
          Matching unselected members: {filteredMembers.join(', ') || 'None'}
        </Text>
      </section>
      <section aria-label="Choice and numeric inputs" className={styles.section}>
        <Text as="h2" preset="heading4">
          Choices and numbers
        </Text>
        <Checkbox label="Include sample data" />
        <Switch label="Enable activity logging" />
        <Field label="Support tier">
          <RadioGroup defaultValue="standard">
            <Radio value="standard" label="Standard" />
            <Radio value="premium" label="Premium" />
          </RadioGroup>
        </Field>
        <Field label="Retry attempts" hint="SpinButton is useful for precise, bounded stepping.">
          <SpinButton defaultValue={3} min={0} max={10} />
        </Field>
        <Field
          label={`Priority: ${priority}`}
          hint="Slider is useful when approximate values are enough."
        >
          <Slider
            min={0}
            max={100}
            value={priority}
            aria-valuetext={`${priority} out of 100`}
            onChange={(_, data) => setPriority(data.value)}
          />
        </Field>
      </section>
      <section aria-label="Date and time inputs" className={styles.section}>
        <Text as="h2" preset="heading4">
          Dates and times
        </Text>
        <Text>
          Native picker presentation varies by browser. Use local Date values, not UTC date-string
          parsing.
        </Text>
        <Field
          label="Review date"
          required
          hint="Choose a date in 2026."
          validationMessage={dateError}
        >
          <DateTimePicker
            min={new Date(2026, 0, 1)}
            max={new Date(2026, 11, 31)}
            onValidationResult={(_, data) =>
              setDateError(data.error ? 'Choose a valid date in 2026.' : undefined)
            }
          />
        </Field>
        <Field label="Start time">
          <DateTimePicker type="time" />
        </Field>
        <Field label="Local appointment">
          <DateTimePicker type="datetime-local" />
        </Field>
        <Field label="Reporting month">
          <DateTimePicker type="month" />
        </Field>
        <Field label="Reporting week">
          <DateTimePicker type="week" />
        </Field>
      </section>
      <section aria-label="File selection" className={styles.section}>
        <Text as="h2" preset="heading4">
          Files
        </Text>
        <Text id={fileHintId}>
          Choose a nonempty TXT file, up to 1 MB. Files stay local; nothing is uploaded.
        </Text>
        <FileUpload
          ariaLabel="Choose a reference file"
          ariaDescribedBy={fileError ? `${fileHintId} ${fileErrorId}` : fileHintId}
          accept={{ 'text/plain': ['.txt'] }}
          minSize={1}
          maxSize={1024 * 1024}
          multiple={false}
          onDropAccepted={(accepted) => {
            setFiles(accepted.map((file) => file.name));
            setFileError('');
          }}
          onDropRejected={(rejected) =>
            setFileError(
              rejected
                .map(
                  ({ file, errors }) =>
                    `${file.name}: ${errors.map(({ message }) => message).join(', ')}`,
                )
                .join('; '),
            )
          }
        >
          <Text>Drop a file here or activate to browse</Text>
        </FileUpload>
        {fileError && (
          <Text role="alert" id={fileErrorId}>
            {fileError}
          </Text>
        )}
        <Text role="status">
          {files.length ? `Selected locally: ${files.join(', ')}` : 'No file selected.'}
        </Text>
      </section>
      <Text>
        For specialized inputs, see the component examples for{' '}
        <Link href="?path=/story/components-colorpicker--default" target="_top">
          ColorPicker
        </Link>
        ,{' '}
        <Link href="?path=/story/components-swatchpicker--default" target="_top">
          SwatchPicker
        </Link>
        , and{' '}
        <Link href="?path=/story/components-rating--default" target="_top">
          Rating
        </Link>
        .
      </Text>
    </div>
  );
}
