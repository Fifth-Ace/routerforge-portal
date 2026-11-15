# RouterForge Portal installation — Chrome, Edge, Opera and Firefox

**Official website:** https://fifth-ace.github.io/routerforge-portal/  
**Chrome Web Store:** https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij  
**GitHub Release (manual channel):** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.3

## Google Chrome — recommended

1. Open [RouterForge Portal on Chrome Web Store](https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij).
2. Click **Add to Chrome** and review the browser permissions.
3. Sign in to Keenetic / NETCRAZE, open Portal and grant access only to router addresses you trust.

The Chrome Web Store delivers extension updates. You **don't** need Developer Mode or a ZIP file.

## Microsoft Edge / Opera — manual channel

1. Download [Chromium ZIP v0.10.3](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.3/routerforge-portal-chromium-v0.10.3.zip) and compare its SHA-256 to `SHA256SUMS.txt` in the release.
2. Extract the archive into a permanent folder; `manifest.json` must be at the root.
3. Open `edge://extensions` or `opera://extensions`, enable Developer Mode and select **Load unpacked**.
4. Open your router WebUI and grant access only to the intended address.

## Mozilla Firefox — userscript

Install Tampermonkey or Violentmonkey, then [RouterForge Portal userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.3/routerforge-portal.user.js). The GitHub `UNSIGNED-DEV.xpi` is **for temporary testing only**, not a signed permanent install.

## Switching from the unpacked ZIP

Export profiles to JSON before installing the Chrome Web Store version. Store and unpacked extensions have different IDs and local storage. Do not enable both on one router page (duplicate menus).

If you use the ZIP in Edge/Opera, back up the folder and replace the files in place for manual updates. After JSON import, use **Grant access and reload tab** in Portal when requested.

**Privacy:** Portal doesn't collect passwords or send local router addresses to the developer. Grant host permissions only for addresses you trust.
