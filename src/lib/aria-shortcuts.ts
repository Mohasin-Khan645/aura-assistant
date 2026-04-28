// Generate desktop shortcut files for top actions on Windows / macOS / Linux.
export type ShortcutTarget = { name: string; url: string };

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9 _-]/g, "").trim().slice(0, 60) || "ARIA";

export function downloadWindowsShortcut(t: ShortcutTarget) {
  // Windows .url file (INI format)
  const content = `[InternetShortcut]\r\nURL=${t.url}\r\nIconIndex=0\r\n`;
  download(`${safe(t.name)}.url`, content, "application/internet-shortcut");
}

export function downloadMacShortcut(t: ShortcutTarget) {
  // macOS .webloc (XML plist)
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>URL</key><string>${t.url.replace(/&/g, "&amp;")}</string></dict></plist>`;
  download(`${safe(t.name)}.webloc`, content, "application/xml");
}

export function downloadLinuxShortcut(t: ShortcutTarget) {
  // Linux .desktop launcher
  const content = `[Desktop Entry]
Type=Link
Name=${safe(t.name)}
URL=${t.url}
Icon=text-html
`;
  download(`${safe(t.name)}.desktop`, content, "application/x-desktop");
}

export function downloadAllPlatforms(t: ShortcutTarget) {
  downloadWindowsShortcut(t);
  setTimeout(() => downloadMacShortcut(t), 200);
  setTimeout(() => downloadLinuxShortcut(t), 400);
}
