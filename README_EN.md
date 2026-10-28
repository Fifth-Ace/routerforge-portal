<div align="center">

<a href="https://github.com/Fifth-Ace/routerforge"><img src="https://raw.githubusercontent.com/Fifth-Ace/routerforge/main/docs/assets/routerforge-banner.jpg" alt="RouterForge project banner" width="100%"></a>

# RouterForge Portal

**One place for Keenetic / Netcraze web applications. Right inside your browser.**

Put AWG Manager, RouterForge Core, nfqws and other web panels into your router's familiar navigation — without installing extra components on the router.

[**🇷🇺 Русский**](README.md) · [**🇬🇧 English**](README_EN.md)

[![Release](https://img.shields.io/github/v/release/Fifth-Ace/routerforge-portal?style=flat-square&label=release&color=38bdf8)](https://github.com/Fifth-Ace/routerforge-portal/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Fifth-Ace/routerforge-portal/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Fifth-Ace/routerforge-portal/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Fifth-Ace/routerforge-portal?style=flat-square)](LICENSE)
![Chrome / Edge / Opera](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Opera-MV3-24313d?style=flat-square)
![Firefox](https://img.shields.io/badge/Firefox-userscript-24313d?style=flat-square)
![Tampermonkey / Violentmonkey](https://img.shields.io/badge/Tampermonkey%20%7C%20Violentmonkey-v0.10.2-24313d?style=flat-square)

### [⬇ Chrome / Edge / Opera](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal-chromium-v0.10.2.zip) · [⬇ Firefox / Userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal.user.js)

[📦 All downloads](https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.2) · [💬 Telegram](https://t.me/RouterForge)

[Features](#features) · [Install](#installation) · [Screenshots](#screenshots) · [FAQ](#faq)

</div>

---

## Installation

**RouterForge Portal v0.10.2** runs in your browser, not on the router. Choose a channel below. All installation methods are visible here, VOT-style, with direct release links.

| Browser | Recommended channel | Install |
|:--|:--|:--|
| **Google Chrome** | Native MV3 extension | **[⬇ Download for Chrome](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal-chromium-v0.10.2.zip)** |
| **Microsoft Edge** | Native MV3 extension | **[⬇ Download for Edge](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal-chromium-v0.10.2.zip)** |
| **Opera** | Native MV3 extension | **[⬇ Download for Opera](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal-chromium-v0.10.2.zip)** |
| **Mozilla Firefox** | Userscript with a manager | **[⬇ Install for Firefox](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal.user.js)** |
| **Chromium / Firefox with Tampermonkey** | Userscript | **[⬇ Install userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal.user.js)** |
| **Opera / other browsers with Violentmonkey** | Userscript | **[⬇ Install userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal.user.js)** |

### Chrome, Edge, Opera — native extension

1. Download the ZIP above and **extract** it to a permanent directory. `manifest.json` must be at the root.
2. Open `chrome://extensions`, `edge://extensions` or `opera://extensions`; enable **Developer Mode**, then **Load unpacked** and select the extracted folder, not the ZIP.
3. Sign in to Keenetic / NETCRAZE and grant the browser permission for your router address. After JSON import, if prompted, use **Grant access and reload tab** in the popup. There is no need to recreate the router profile.

### Firefox, Tampermonkey, Violentmonkey — userscript

1. Install **[Tampermonkey](https://www.tampermonkey.net/)** or **[Violentmonkey](https://violentmonkey.github.io/)**. Violentmonkey is recommended for Opera.
2. Choose **[Install RouterForge Portal userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal.user.js)** and confirm in your userscript manager. If the browser downloads the `.user.js` file instead, import the file through the manager's UI.
3. Open the router WebUI and configure Portal. Tampermonkey 5.2+ on Chromium may require Developer Mode; Chromium 138+ may also require enabling user scripts in the extension details.

> [!WARNING]
> **The Firefox XPI is unsigned and not a permanent-install release.** The [routerforge-portal-firefox-UNSIGNED-DEV-v0.10.2.xpi](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/routerforge-portal-firefox-UNSIGNED-DEV-v0.10.2.xpi) asset is only for temporary testing on an appropriate Firefox configuration. For normal Firefox use the userscript. No browser-store listing is available.

> [!IMPORTANT]
> Use **only one channel** on the same router page. Running native extension and userscript together creates duplicate navigation. Export JSON before updating; keep the same unpacked extension folder to preserve the browser extension ID and local data. Native ZIP updates are manual; userscript managers may check for updates using their own mechanisms.

**[📦 All v0.10.2 assets](https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.2)** · **[🔐 SHA256SUMS.txt](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.2/SHA256SUMS.txt)** · [English installation guide](docs/INSTALL-EN.md) · [Русская версия](README.md)

**Tampermonkey:** after connecting a router, Portal settings open inside the Keenetic WebUI; backup and advanced options remain available from the dedicated settings button.

## What is it?

**RouterForge Portal** brings the web interfaces of existing router services together. It adds an Applications section to the Keenetic interface, offers a catalog of known integrations, and remembers hosts, ports and launch modes.

> [!IMPORTANT]
> Portal **does not install** services on your router and **does not replace** the Keenetic interface. Each web application must already be installed and reachable.

## Screenshots

<p align="center">
  <a href="docs/screenshots/portal-live-demo.gif"><img src="docs/screenshots/portal-live-demo.gif" alt="RouterForge Portal inside NETCRAZE/Keenetic: RouterForge Core, nfqws2 and AWG Manager" width="100%"></a>
</p>
<p align="center"><sub>Ten real NETCRAZE Ultra screenshots supplied by a user: Portal settings, nfqws2, AWG Manager, RouterForge Core and the app catalog, displayed inside the native NETCRAZE/Keenetic WebUI. The animation loops; click it for a larger view.</sub></p>

## Features

| | What it does |
|:---|:---|
| 🧩 **Unified menu** | Adds Applications navigation to the native Keenetic WebUI after login. |
| 📚 **Built-in catalog** | RouterForge Core, AWG Manager, nfqws-keenetic-web, nfqws2-ui, NeoFit, AdGuard Home and XKeen UI. |
| 🛠️ **Custom services** | Add any web panel by URL and port; configure multiple routers. |
| 🪟 **Two launch modes** | Embedded within Keenetic or a separate browser tab. When CSP/X-Frame-Options block embedding, use a tab. |
| 🎨 **Appearance** | Dark/light themes and Russian/English UI. |
| 💾 **Profiles** | Local settings, JSON import and export. |
| 🗂️ **Workspace** | Up to three live iframe tabs, favorites, groups, settings inside Keenetic. |
| 📐 **Responsive** | Respects the native WebUI boundaries when the browser window is resized. |
| 🔄 **Updates** | Manual updates for the native unpacked extension; no silent code installation. |

## FAQ

<details><summary><b>Is RouterForge Core required?</b></summary>

No. Portal is independent. The specific web service you want to open must already be installed and reachable.
</details>
<details><summary><b>Why does a service open in a separate tab?</b></summary>

Some services prevent iframe embedding through CSP or X-Frame-Options. Portal does not bypass these protections. Choose a separate tab instead.
</details>
<details><summary><b>Can I use the userscript and the native extension together?</b></summary>

Avoid doing so on the same router page: it will duplicate the menu. Choose one channel; JSON export/import can migrate settings between them.
</details>
<details><summary><b>Are updates secure and automatic?</b></summary>

Legacy v0.9.0 userscript managers could check GitHub Release update links, but they do **not** validate GitHub build attestations. Native extensions do not silently replace their executable code; verify release file hashes and update your unpacked extension manually. [Read the security policy](SECURITY.md).
</details>

## Privacy and development

Portal keeps router profiles in the browser, never requests Keenetic passwords, does not scan the network and sends no developer telemetry. The native extension contacts GitHub for updates only when you click the check button. **[Privacy](PRIVACY.md)** · **[Report a problem](https://github.com/Fifth-Ace/routerforge-portal/issues)**.

Open source · [MIT License](LICENSE) · [RouterForge project](https://github.com/Fifth-Ace/routerforge) · [Telegram](https://t.me/RouterForge)

<sub>RouterForge Portal is an independent, unofficial Keenetic / Netcraze companion and is not affiliated with the device manufacturers.</sub>
