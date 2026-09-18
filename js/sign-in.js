/*
 * sign-in.js
 *
 * Secure loopback authentication handoff between Screen Monk desktop app and website.
 *
 * Flow:
 *   1. Screen Monk starts a temporary loopback HTTP server on 127.0.0.1:<port>
 *      and opens this page with ?state=<csrf>&port=<port>.
 *   2. We validate parameters and mount Clerk's sign-in widget.
 *   3. On successful sign-in, Clerk generates a session JWT.
 *   4. We HTTP POST the token and state directly to http://127.0.0.1:<port>/auth/callback.
 *   5. Screen Monk validates the CSRF state and JWT signature, persists the local lease,
 *      and unlocks the desktop application.
 *   6. This page displays a success confirmation.
 *
 * Security Guarantee:
 *   The Clerk JWT is NEVER placed in URLs, query strings, custom URI schemes,
 *   or browser redirects. It is transmitted solely via an HTTP POST body to
 *   the desktop app's loopback interface.
 */
(function () {
  "use strict";

  // -------- Read Clerk config from <meta> tags --------

  var pkMeta = document.querySelector('meta[name="clerk-publishable-key"]');
  var verMeta = document.querySelector('meta[name="clerk-js-version"]');
  var PUBLISHABLE_KEY = pkMeta ? pkMeta.getAttribute("content") : "";
  var CLERK_JS_VERSION = verMeta ? verMeta.getAttribute("content") : "5";

  // -------- Derive Clerk instance from publishable key --------

  function decodeClerkInstance(pk) {
    var m = /^pk_(test|live)_(.+)$/.exec(pk || "");
    if (!m) return null;
    try {
      var decoded = atob(m[2]);
      return decoded.replace(/\$$/, "");
    } catch (e) {
      return null;
    }
  }

  function clerkScriptUrl(instance, version) {
    return "https://" + instance + "/npm/@clerk/clerk-js@" + version + "/dist/clerk.browser.js";
  }

  var clerkInstance = decodeClerkInstance(PUBLISHABLE_KEY);

  // -------- Read handoff parameters from URL --------

  var params = new URLSearchParams(window.location.search);
  var state = params.get("state");
  var port = params.get("port");

  // -------- DOM elements --------

  var errorEl = document.getElementById("signinError");
  var retryBtn = document.getElementById("signinRetry");
  var successEl = document.getElementById("signinSuccess");
  var mountEl = document.getElementById("clerk-signin");

  function showError(message, showRetry) {
    if (successEl) successEl.classList.remove("is-visible");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    }
    if (retryBtn) {
      if (showRetry) {
        retryBtn.classList.add("is-visible");
      } else {
        retryBtn.classList.remove("is-visible");
      }
    }
  }

  function showSuccess(message) {
    if (errorEl) errorEl.classList.remove("is-visible");
    if (retryBtn) retryBtn.classList.remove("is-visible");
    if (successEl) {
      successEl.textContent = message;
      successEl.classList.add("is-visible");
    }
  }

  // -------- Early return: publishable key sanity --------
  if (!clerkInstance) {
    console.error("[Screen Monk sign-in] Publishable key is missing or malformed.");
    showError("Sign-in is not configured. Please contact support.", false);
    return;
  }

  // -------- Validate handoff parameters --------

  if (!state || !port) {
    showError(
      "This page was opened without the required sign-in parameters. " +
        "Please launch Screen Monk to start a sign-in.",
      false
    );
    return;
  }

  var portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
    showError("Invalid port parameter. Please retry from the Screen Monk app.", false);
    return;
  }

  if (state.length > 512 || !/^[A-Za-z0-9_\-]+$/.test(state)) {
    showError("Invalid state parameter. Please retry from the Screen Monk app.", false);
    return;
  }

  // -------- Load Clerk JS bundle --------

  var clerkScript = document.createElement("script");
  clerkScript.src = clerkScriptUrl(clerkInstance, CLERK_JS_VERSION);
  clerkScript.setAttribute("data-clerk-publishable-key", PUBLISHABLE_KEY);
  clerkScript.defer = true;
  clerkScript.onerror = function () {
    console.error("[Screen Monk sign-in] Failed to load Clerk JS from " + clerkScript.src);
    showError("Could not load the sign-in widget. Please try again.", false);
  };
  document.head.appendChild(clerkScript);

  // -------- Token handoff logic (Loopback POST only) --------

  var handedOff = false;
  var currentSession = null;

  async function deliverTokenToApp(session) {
    try {
      var token = await session.getToken();
      if (!token) {
        showError("Signed in, but could not get a session token. Please try again.", true);
        return;
      }

      var postBody = new URLSearchParams();
      postBody.append("state", state);
      postBody.append("token", token);

      var resp = await fetch("http://127.0.0.1:" + portNum + "/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: postBody.toString()
      });

      if (resp.ok) {
        handedOff = true;
        if (mountEl) mountEl.style.display = "none";
        showSuccess("Authenticated with Screen Monk. You may now return to the desktop application.");
      } else {
        var errData = await resp.json().catch(function () { return {}; });
        console.warn("Loopback callback returned error status:", errData);
        showError(
          errData.error || "Authentication handoff rejected by the desktop application. Please retry.",
          true
        );
      }
    } catch (err) {
      console.warn("Loopback POST to 127.0.0.1 failed:", err);
      showError(
        "Could not connect to the Screen Monk desktop application. " +
          "Please ensure Screen Monk is open and waiting for sign-in, then click Retry.",
        true
      );
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      if (currentSession) {
        deliverTokenToApp(currentSession);
      } else if (window.Clerk && window.Clerk.session) {
        deliverTokenToApp(window.Clerk.session);
      } else {
        showError("Session not found. Please sign in again.", false);
      }
    });
  }

  // -------- Initialise Clerk and mount sign-in widget --------

  window.addEventListener("load", async function () {
    if (!window.Clerk) {
      showError("Could not load the sign-in widget. Please try again.", false);
      return;
    }

    try {
      await window.Clerk.load();
    } catch (err) {
      console.error("Clerk load failed", err);
      showError("Could not load the sign-in widget. Please try again.", false);
      return;
    }

    // Clerk theme matching Screen Monk's cold dark aesthetic
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

    // Keep the user on this exact page after sign-in completes.
    // Without these, Clerk's mountSignIn auto-redirects to the Home URL
    // after authentication, destroying the JS context before the loopback
    // POST can execute — which is the entire point of this page.
    var currentUrl = window.location.href;
    window.Clerk.mountSignIn(mountEl, {
      appearance: appearance,
      afterSignInUrl: currentUrl,
      fallbackRedirectUrl: currentUrl,
    });

    // Handle the post-redirect case: if Clerk still reloaded the page
    // (e.g. due to session tasks or internal navigation), the state and
    // port params survive in the URL. Check immediately whether Clerk
    // already has an active session and attempt the handoff right away.
    if (window.Clerk.session && !handedOff) {
      currentSession = window.Clerk.session;
      deliverTokenToApp(window.Clerk.session);
    }

    // When signed in, perform loopback POST handoff
    window.Clerk.addListener(async function ({ user, session }) {
      if (!user || !session || handedOff) return;
      currentSession = session;
      await deliverTokenToApp(session);
    });
  });
})();
