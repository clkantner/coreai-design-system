# Aptos: separately acquired, never redistributed here

CoreAI prefers Aptos and Aptos Mono. `fonts.css` only registers fonts already
installed on the reader's device, with no remote URLs or bundled binaries.
If unavailable, the theme uses system sans-serif and monospace fallbacks.

## Local development

1. Visit [Microsoft's Aptos typography page](https://learn.microsoft.com/en-us/typography/font-list/aptos)
   and its [official download](https://www.microsoft.com/en-us/download/details.aspx?id=106087).
2. Read and retain the license accompanying your download. Download availability
   is not permission to redistribute or host fonts. The previously supplied terms
   explicitly withheld distribution rights. This repository does not grant any.
3. Extract the download with your operating system's archive tool if necessary.
   The setup script accepts an extracted directory, not an unverified archive or
   mutable download URL. Nested directories are supported.
4. From the repository root, run:

   ```sh
   node scripts/setup-fonts.mjs --source "<extracted-directory>" --accept-license
   ```

5. Install the staged `.local-fonts/aptos/*.ttf` files with Windows' **Install**
   action, macOS Font Book, or your platform's font installer; restart the browser.
   Installation in Office alone may not make cloud fonts available to browsers.

The script performs no network access, system installation, conversion, or license
acceptance on your behalf. It stages only recognized Aptos TrueType faces, requires
regular Aptos, Aptos SemiBold, and Aptos Mono, and reports optional missing styles.
It records SHA-256 hashes in `setup.json`; keep your official source and its license
to reproduce the same setup. The destination must be absent or empty; remove your
previous staging directory yourself before re-running.

The ignored `.local-fonts` directory is outside app public/source assets. Neither
development servers nor builds load it. No setup runs automatically in npm hooks
or CI. Installing the fonts on your own device is the recommended way to preview
Aptos without distributing it.

## Consumer-owned web fonts: separate rights required

The npm package remains usable without this repository or setup script. Install
Aptos on the client devices, or supply your own appropriately licensed web fonts.
Do not assume that desktop-use rights, Microsoft 365 access, or the CoreAI package
license allow embedding, sublicensing, web hosting, or redistribution.

Only after obtaining appropriate web-hosting rights, use the repository script
to create consumer-owned assets:

```sh
node scripts/setup-fonts.mjs --source "<licensed-directory>" --accept-license --output "<consumer-project>/public/fonts/aptos" --allow-web-hosting
```

This creates a `fonts.css` with relative URLs next to the copied fonts. Load it with
your application's own stylesheet/link URL (including any deployment base path).
The explicit destination must be outside this repository, and the script refuses
repository source/build directories. No package-managed files are patched.

Add the consumer's font directory to both `.gitignore` and its publication
exclusions, verify `npm pack --dry-run`, and comply with your license before
deploying. These flags acknowledge your responsibility; they do not confer rights.
See Microsoft's [font licensing FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)
and the licensing links on the Aptos page if rights are unclear.
