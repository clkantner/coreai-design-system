import { useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'azure-openai-settings';
const SETTINGS_EVENT = 'azure-openai-settings-change';

export const DEFAULT_API_VERSION = '2025-04-01-preview';

export interface AzureOpenAISettings {
  endpoint: string;
  deployment: string;
  apiKey: string;
  apiVersion: string;
}

const DEFAULT_SETTINGS: AzureOpenAISettings = {
  endpoint: '',
  deployment: '',
  apiKey: '',
  apiVersion: DEFAULT_API_VERSION,
};

function loadSettings(): AzureOpenAISettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AzureOpenAISettings;
    }
  } catch {
    // Invalid JSON, return defaults
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AzureOpenAISettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  // Dispatch custom event so other hook instances in the same tab know about the change
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

function clearStoredSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: DEFAULT_SETTINGS }));
}

export interface UseAzureOpenAISettingsReturn {
  settings: AzureOpenAISettings;
  setSettings: (settings: AzureOpenAISettings) => void;
  clearSettings: () => void;
  isConfigured: boolean;
}

export function useAzureOpenAISettings(): UseAzureOpenAISettingsReturn {
  const [settings, setSettingsState] = useState<AzureOpenAISettings>(loadSettings);

  // Re-sync with localStorage on mount (for SSR hydration)
  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  // Listen for settings changes from other hook instances
  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AzureOpenAISettings>;
      setSettingsState(customEvent.detail);
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange);
    return () => window.removeEventListener(SETTINGS_EVENT, handleSettingsChange);
  }, []);

  const setSettings = useCallback((newSettings: AzureOpenAISettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  }, []);

  const clearSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    clearStoredSettings();
  }, []);

  const isConfigured = useMemo(
    () =>
      settings.endpoint.trim() !== '' &&
      settings.deployment.trim() !== '' &&
      settings.apiKey.trim() !== '' &&
      settings.apiVersion.trim() !== '',
    [settings],
  );

  return {
    settings,
    setSettings,
    clearSettings,
    isConfigured,
  };
}
