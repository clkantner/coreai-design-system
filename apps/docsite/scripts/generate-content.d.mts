export function generateContent(options?: {
  outputDirectory?: string;
  snapshotPath?: string | URL;
  indexPath?: string | null;
  refresh?: boolean;
  storybookRoot?: string;
  indexUrl?: string;
  contentDirectory?: URL;
}): Promise<void>;
