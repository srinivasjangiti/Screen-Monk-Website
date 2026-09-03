/* =========================================================
   SCREEN MONK — download.js
   Points the CTA at the real builds and adapts the message
   for non-Windows visitors. The builds live in the project's
   parent folder; for a hosted deployment you'd put them on a
   CDN and set the URLs in CONFIG below (or via a global).

   CONFIG notes:
   - For local/file use: relative paths into ../the final exe file/
   - For web hosting:    absolute URLs to your CDN/download host.
   ========================================================= */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIG — edit these two URLs when deploying to a real host.
  // They are intentionally data-driven so no other code needs to change.
  // ---------------------------------------------------------------------------
  var CONFIG = {
    // Hosted as a GitHub Release asset (not committed to this repo).
    // Vercel does not fetch Git LFS files at deploy time, so committing
    // the EXE resulted in a 134-byte LFS pointer being served instead
    // of the actual 123 MB installer. The release URL is version-pinned
    // via the /releases/latest/ alias — bumping the version on a new
    // release is enough to update the download, no website change needed.
    //   - For each new version: `gh release create vX.Y.Z ./installer.exe`
    //   - The user-facing filename on save is overridden by the
    //     `download` attribute set in applyLinks() below.
    installer: "https://github.com/srinivasjangiti/Screen-Monk-Website/releases/latest/download/Screen.Monk-Setup-3.0.4.exe",
    // Portable build is in progress; for now both buttons point at the
    // installer. Replace with the portable URL + size when ready.
    portable:  "https://github.com/srinivasjangiti/Screen-Monk-Website/releases/latest/download/Screen.Monk-Setup-3.0.4.exe",
    // What the browser should name the file when the user saves it
    // (overrides the URL-derived name, which has a dot where the
    // original filename has a space — GitHub release storage normalizes
    // spaces to dots on upload).
    saveAs: "Screen Monk-Setup-3.0.4.exe",
    version: "3.0.4",
    sizeInstaller: "~123 MB",
    sizePortable:  "~123 MB",
    // Fallback for non-Windows OS — gentle, on-brand, no exclamation energy.
    notWindowsNote: "Screen Monk is built for Windows. The mountain keeps its records on your own machine, so other platforms are not yet visited."
  };

  // Allow override via a global, if a host wants to inject CDN URLs.
  if (window.SCREEN_MONK_DOWNLOADS) {
    try {
      var o = window.SCREEN_MONK_DOWNLOADS;
      if (o.installer) CONFIG.installer = o.installer;
      if (o.portable)  CONFIG.portable  = o.portable;
      if (o.version)   CONFIG.version   = o.version;
    } catch (e) {}
  }
  // ---------------------------------------------------------------------------

  var installer = document.getElementById("ctaInstaller");
  var portable = document.getElementById("ctaPortable");
  var installerSub = document.getElementById("ctaInstallerSub");
  var note = document.getElementById("ctaNote");

  function detectOS() {
    var ua = (navigator.userAgent || "").toLowerCase();
    var platform = (navigator.platform || "").toLowerCase();
    if (/win/.test(platform) || /windows/.test(ua)) return "windows";
    if (/mac/.test(platform) || /macintosh|mac os x|iphone|ipad|ipod/.test(ua)) return "mac";
    if (/linux/.test(platform) || /linux|android/.test(ua)) return "linux";
    return "unknown";
  }

  function applyLinks() {
    var os = detectOS();
    var isWindows = (os === "windows");

    if (installer) {
      if (isWindows) {
        installer.setAttribute("href", CONFIG.installer);
        installer.setAttribute("download", CONFIG.saveAs || "");
        installer.removeAttribute("aria-disabled");
        installer.setAttribute("data-ready", "true");
      } else {
        installer.removeAttribute("href");
        installer.removeAttribute("download");
        installer.setAttribute("aria-disabled", "true");
        installer.setAttribute("data-ready", "true");
      }
      if (installerSub) {
        installerSub.textContent = "installer " + String.fromCharCode(183) +
          " v" + CONFIG.version + " " + String.fromCharCode(183) + " " + CONFIG.sizeInstaller;
      }
    }
    if (portable) {
      if (isWindows) {
        portable.setAttribute("href", CONFIG.portable);
        portable.setAttribute("download", CONFIG.saveAs || "");
        portable.removeAttribute("aria-disabled");
        portable.setAttribute("data-ready", "true");
      } else {
        portable.removeAttribute("href");
        portable.removeAttribute("download");
        portable.setAttribute("aria-disabled", "true");
        portable.setAttribute("data-ready", "true");
      }
    }

    if (!isWindows && note) {
      note.hidden = false;
      note.textContent = CONFIG.notWindowsNote;
    } else if (note) {
      note.hidden = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLinks);
  } else {
    applyLinks();
  }
})();
