# RouterForge Portal — P5.1 Keenetic-first launch (0.10.10)

Base commit: `0ea0838bcdb65094b174669b252b1cc5355f6fbd` (main).

- All new Core-catalog suggestions use `mode: 'auto'`, i.e. start within the Keenetic workspace.
- Manual applications and templates already default to `auto`; keep that behavior.
- Legacy `mode: 'external'` is an explicit user choice: NEVER silently overwrite or migrate it.
- The popup delegates embedded-app launches to the extension background. It locates an existing exact-router tab or opens the router WebUI (not the app URL), asks the bridge to show the app, then focuses Keenetic.
- If the user is logged out or the bridge cannot start, leave Keenetic visible with an error. Never silently open an external app tab. A user-selected external mode or the built-in “open separately” button remains available.
- For sites that refuse iframe embedding through CSP/X-Frame-Options, the user can explicitly open separately. Do not bypass these browser protections.
- Only the browser extension's local settings are written by users. No router, Core, firmware, marketplace or release writes.
- The Core catalog remains optional. Manual HTTP/HTTPS web services retain custom host, port and path.

## Chrome gate

1. Add a manual app through Keenetic; verify it opens inside the Keenetic content pane by default.
2. Use the Portal popup on a different browser tab: clicking a saved app must focus or create the **router WebUI** and launch it inside Keenetic, never navigate directly to the app's URL.
3. Import a Core catalog suggestion. It must have default embedded opening. Existing manually selected external apps stay external.
4. Log out of Keenetic and try the popup. It must not open the service URL in a new tab; Keenetic login remains available.
5. Check the explicit external launch button and CSP/X-Frame-Options fallback. Test at least one nonstandard port/path, multi-router selection and RU/EN.
