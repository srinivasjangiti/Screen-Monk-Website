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
    // Hosted on Vercel Blob (same origin, served from Vercel's CDN edge).
    // Same-origin download means Chrome's cross-origin / Safe Browsing
    // download policies can't interfere with the binary fetch — this
    // fixes the "File wasn't available on site" error some Chrome
    // installs threw at the previous GitHub-Releases URL.
    //   - To publish a new version:
    //     1. vercel blob put ./Screen Monk-Setup-X.Y.Z.exe Screen Monk-Setup-X.Y.Z.exe --access public
    //     2. bump the two URLs below + the version field
    //     3. push the website
    //   - Free tier: 1 GB storage, 10K reads, 2K writes, 10 GB transfer
    //   - Store: screen-monk-installers (store_YERjXft9MG2rZKcW)
    installer: "https://yerjxft9mg2rzkcw.public.blob.vercel-storage.com/Screen%20Monk-Setup-3.0.4.exe",
    // Portable build is in progress; for now both buttons point at the
    // installer. Replace with the portable URL + size when ready.
    portable:  "https://yerjxft9mg2rzkcw.public.blob.vercel-storage.com/Screen%20Monk-Setup-3.0.4.exe",
    // Release page (used as a fallback link if the direct download fails).
    releasePage: "https://github.com/srinivasjangiti/Screen-Monk-Website/releases/tag/v3.0.4",
    // What the browser should name the file when the user saves it
    // (overrides the URL-derived name).
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
  var ctaCol = installer ? installer.closest(".scene__col--cta") : null;

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

    // Fallback: a quiet text link below the CTA that opens the GitHub
    // release page in a new tab. Shown only on Windows so non-Windows
    // visitors still see the on-brand "not yet visited" note. The
    // release page lists the asset with a single-click download button
    // that bypasses any cross-origin / Safe-Browsing interference some
    // Chrome installs throw at direct binary downloads from a third
    // party.
    if (ctaCol) {
      var fb = ctaCol.querySelector(".cta__fallback");
      if (!fb && isWindows && CONFIG.releasePage) {
        fb = document.createElement("p");
        fb.className = "cta__fallback";
        fb.innerHTML =
          'If the download doesn\u2019t start, ' +
          '<a href="' + CONFIG.releasePage + '" target="_blank" rel="noopener noreferrer">' +
          'grab it from the GitHub release page</a>.';
        ctaCol.querySelector(".cta").appendChild(fb);
      } else if (fb && !isWindows) {
        fb.parentNode && fb.parentNode.removeChild(fb);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLinks);
  } else {
    applyLinks();
  }
})();
