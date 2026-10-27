/* =========================================================
   SCREEN MONK — download.js
   Directs users to the official Microsoft Store listing
   and provides a gentle note for non-Windows visitors.
   ========================================================= */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // CONFIG — Microsoft Store destination and platform messaging.
  // ---------------------------------------------------------------------------
  var CONFIG = {
    storeUrl: "https://apps.microsoft.com/detail/9p0zb405dsfr?hl=en-GB&gl=IN",
    supportingText: "Official Microsoft Store",
    // Fallback for non-Windows OS — gentle, on-brand, no exclamation energy.
    // The Store link remains functional so visitors can view or save the listing.
    notWindowsNote: "Screen Monk is built for Windows. The mountain keeps its records on your own machine, so other platforms are not yet visited."
  };

  // Allow override via a global, if needed.
  if (window.SCREEN_MONK_DOWNLOADS) {
    try {
      var o = window.SCREEN_MONK_DOWNLOADS;
      if (o.storeUrl) CONFIG.storeUrl = o.storeUrl;
    } catch (e) {}
  }
  // ---------------------------------------------------------------------------

  var installer = document.getElementById("ctaInstaller");
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
      installer.setAttribute("href", CONFIG.storeUrl);
      installer.setAttribute("target", "_blank");
      installer.setAttribute("rel", "noopener noreferrer");
      installer.removeAttribute("download");
      installer.removeAttribute("aria-disabled");
      installer.setAttribute("data-ready", "true");

      if (installerSub) {
        installerSub.textContent = CONFIG.supportingText;
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
