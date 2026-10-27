/* =========================================================
   SCREEN MONK — download.js
   The website directs Windows visitors to the official
   Microsoft Store listing instead of downloading an EXE.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    storeUrl: "https://apps.microsoft.com/detail/9p0zb405dsfr?hl=en-GB&gl=IN",
    version: "3.0.4",
    notWindowsNote: "Screen Monk is built for Windows. The mountain keeps its records on your own machine, so other platforms are not yet visited."
  };

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

  function configureStoreLink(link) {
    if (!link) return;
    link.setAttribute("href", CONFIG.storeUrl);
    link.removeAttribute("download");
    link.removeAttribute("aria-disabled");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("data-ready", "true");
  }

  function applyLinks() {
    var isWindows = detectOS() === "windows";

    // Both existing download CTAs now lead to the official Store listing.
    // Keep their existing markup/styles and avoid downloading any EXE.
    configureStoreLink(installer);
    configureStoreLink(portable);

    if (installerSub) {
      installerSub.textContent = "Official Microsoft Store · v" + CONFIG.version;
    }

    if (note) {
      note.hidden = isWindows;
      if (!isWindows) note.textContent = CONFIG.notWindowsNote;
    }

    // Replace the old GitHub release fallback with a Store reassurance note.
    if (ctaCol) {
      var fb = ctaCol.querySelector(".cta__fallback");
      if (!fb) {
        fb = document.createElement("p");
        fb.className = "cta__fallback";
        ctaCol.querySelector(".cta").appendChild(fb);
      }
      fb.textContent = isWindows
        ? "Installation opens the official Microsoft Store listing. No direct EXE download."
        : "Screen Monk is available for Windows through the Microsoft Store.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyLinks);
  } else {
    applyLinks();
  }
})();
