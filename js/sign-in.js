/*
 * sign-in.js
 *
 * The handoff between Screen Monk's desktop app and the website's auth.
 *
 * Flow:
 *   1. The desktop app opens this page in the user's default browser,
 *      with ?state=<csrf-token>&redirect_uri=screen-monk://auth-callback
 *   2. We mount Clerk's sign-in widget.
 *   3. On successful sign-in, we get a Clerk session JWT.
 *   4. We redirect the browser to <redirect_uri>?state=<same-state>&token=<JWT>.
 *   5. Windows asks the user "Open Screen Monk?", they accept, and the
 *      app receives the deep link, verifies the JWT, and stores it.
 *
 * We never store anything about the user ourselves — the only output is
 * the redirect to the deep link with the token attached.
 *
 * Single source of truth for Clerk config:
 *   The publishable key and the Clerk JS version live in <meta> tags in
 *   sign-in.html. The script URL is derived from the decoded key at
 *   load time — a hostname typo (the bug from the previous integration)
 *   is impossible by construction. If the key is missing or malformed,
 *   we fail loudly in the console and refuse to mount.
 */
(function () {
  "use strict";

  // -------- Read the Clerk config from the <meta> tags --------

  var pkMeta = document.querySelector('meta[name="clerk-publishable-key"]');
  var verMeta = document.querySelector('meta[name="clerk-js-version"]');
  var PUBLISHABLE_KEY = pkMeta ? pkMeta.getAttribute("content") : "";
  var CLERK_JS_VERSION = verMeta ? verMeta.getAttribute("content") : "5";

  // -------- Derive the Clerk instance hostname from the publishable key --------

  function decodeClerkInstance(pk) {
    // Clerk publishable keys look like pk_test_<base64-of-instance>$.
    // The base64 payload is the FQDN of the Clerk frontend API, e.g.
    //   "fresh-ghost-43.clerk.accounts.dev"
    // Decoding it gives us a single source of truth — no hand-typed
    // script URL, no chance of a hostname mismatch.
    var m = /^pk_(test|live)_(.+)$/.exec(pk || "");
    if (!m) return null;
    try {
      var decoded = atob(m[2]);
      // decoded looks like "<instance>.clerk.accounts.dev$"
      return decoded.replace(/\$$/, "");
    } catch (e) {
      return null;
    }
  }

  function clerkScriptUrl(instance, version) {
    return "https://" + instance + "/npm/@clerk/clerk-js@" + version + "/dist/clerk.browser.js";
  }

  var clerkInstance = decodeClerkInstance(PUBLISHABLE_KEY);

  // -------- Read the handoff parameters from the URL --------

  var params = new URLSearchParams(window.location.search);
  var state = params.get("state");
  var redirectUri = params.get("redirect_uri");

  // -------- DOM refs (must come before any early-return that calls showError) --------

  var errorEl = document.getElementById("signinError");
  var mountEl = document.getElementById("clerk-signin");

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.add("is-visible");
  }

  // -------- Early return: publishable key sanity --------
  // Must come AFTER errorEl is wired so the user sees a clear message
  // instead of a silent dead page.
  if (!clerkInstance) {
    console.error(
      "[Screen Monk sign-in] Publishable key is missing or malformed. " +
      "Set it in sign-in.html (meta[name='clerk-publishable-key']). " +
      "Expected format: pk_test_<base64> or pk_live_<base64>."
    );
    showError("Sign-in is not configured. Please contact support.");
    return;
  }

  // -------- Load the Clerk JS bundle (script src derived from the key) --------

  var clerkScript = document.createElement("script");
  clerkScript.src = clerkScriptUrl(clerkInstance, CLERK_JS_VERSION);
  clerkScript.setAttribute("data-clerk-publishable-key", PUBLISHABLE_KEY);
  clerkScript.defer = true;
  clerkScript.onerror = function () {
    console.error("[Screen Monk sign-in] Failed to load Clerk JS from " + clerkScript.src);
    showError("Could not load the sign-in widget. Please try again.");
  };
  document.head.appendChild(clerkScript);

  if (!state || !redirectUri) {
    showError(
      "This page was opened without the required sign-in parameters. " +
        "Please launch Screen Monk to start a sign-in."
    );
    return;
  }

  // Length cap — both values are URL-decoded by URLSearchParams; an
  // attacker could otherwise pass a multi-megabyte string and force
  // the page to encode it back into the deep link. Generous limits
  // (state is a CSRF token; redirectUri is a short scheme:// form).
  if (state.length > 512 || redirectUri.length > 1024) {
    showError("Sign-in parameters are too long. Please retry from the app.");
    return;
  }

  // Sanity-check the redirect URI:
  //   - must use the screen-monk:// scheme (prevents open-redirect
  //     to http(s) or javascript: from a forged URL)
  //   - no control characters / newlines (defense against
  //     header-splitting or OS URL-handler confusion)
  //   - no embedded credentials (@-userinfo trick)
  if (!/^screen-monk:\/\/[^@\s\x00-\x1f]+$/.test(redirectUri)) {
    showError("Invalid redirect URI. Sign-in cancelled.");
    return;
  }

  // state should look like a token — printable ASCII, no whitespace,
  // no URL-unsafe chars. A real CSRF token from the desktop app is
  // always a hex/base64url string, so this is a tight match.
  if (!/^[A-Za-z0-9_\-]+$/.test(state)) {
    showError("Invalid state parameter. Please retry from the app.");
    return;
  }

  // -------- Initialise Clerk and mount the sign-in widget --------

  window.addEventListener("load", async function () {
    if (!window.Clerk) {
      showError("Could not load the sign-in widget. Please try again.");
      return;
    }
    try {
      await window.Clerk.load();
    } catch (err) {
      console.error("Clerk load failed", err);
      showError("Could not load the sign-in widget. Please try again.");
      return;
    }

    // Theme Clerk's widget to match the rest of the site.
    // The site is dark, cold, restrained — so we hand Clerk a minimal
    // dark palette and keep its built-in component shapes.
    var appearance = {
      variables: {
        colorPrimary: "#c9d6e3",
        colorBackground: "#0c1119",
        colorInputBackground: "#0c1119",
        colorInputText: "#e7eef5",
        colorText: "#c9d6e3",
        colorTextSecondary: "#8d9bab",
        colorDanger: "#d3a3a3",
        borderRadius: "2px",
        fontFamily: '"Jost", sans-serif',
        fontSize: "14px"
      },
      elements: {
        card: {
          backgroundColor: "#0c1119",
          border: "1px solid #1a2230",
          boxShadow: "none"
        },
        formButtonPrimary: {
          backgroundColor: "#c9d6e3",
          color: "#05080f",
          fontWeight: "500",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "12px",
          "&:hover": { backgroundColor: "#e7eef5" }
        },
        socialButtonsBlockButton: {
          backgroundColor: "transparent",
          border: "1px solid #1a2230",
          color: "#c9d6e3",
          "&:hover": { backgroundColor: "#0c1119", borderColor: "#2a3445" }
        },
        footerActionLink: { color: "#c9d6e3" }
      }
    };

    window.Clerk.mountSignIn(mountEl, { appearance: appearance });

    // Once the user is signed in, hand the token off to the desktop app.
    window.Clerk.addListener(async function ({ user, session }) {
      if (!user || !session) return;

      try {
        // Default session JWT — the desktop app verifies it with
        // Clerk's public key, so the template name doesn't matter.
        var token = await session.getToken();
        if (!token) {
          showError("Signed in, but could not get a session token. Please try again.");
          return;
        }

        // Hand off. The deep link opens the desktop app, which validates
        // the state and stores the token. The session in the browser can
        // be closed after this.
        var url =
          redirectUri +
          "?state=" +
          encodeURIComponent(state) +
          "&token=" +
          encodeURIComponent(token);
        window.location.replace(url);
      } catch (err) {
        console.error("Token handoff failed", err);
        showError("Could not hand off to Screen Monk. Please try again.");
      }
    });
  });
})();
