// Textpile client-side utilities
// Shared functions for configuration and formatting
import { TEXTPILE_VERSION } from "./version.js";
import { formatDate as formatDateICU, formatTime as formatTimeICU, formatDateTime as formatDateTimeICU } from "./date-formatter.js";

// Global config (loaded on page load)
let CONFIG = {
  instanceName: "Textpile",
  communityName: "the community",
  adminEmail: null,
  defaultRetention: "1month",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "HH:mm",
  textpileVersion: TEXTPILE_VERSION,
  publicSourceZip: false,
  softwareName: "Textpile",
};

// Load configuration from API
export async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        CONFIG = data.config;
      }
    }
  } catch (err) {
    console.warn("Failed to load config, using defaults", err);
  }
  return CONFIG;
}

// Get config value
export function getConfig(key) {
  return CONFIG[key];
}

// Format date according to config
export function formatDate(dateString) {
  return formatDateICU(dateString, CONFIG.dateFormat, 'en-US');
}

// Format time according to config
export function formatTime(dateString) {
  return formatTimeICU(dateString, CONFIG.timeFormat, 'en-US');
}

// Format date and time together
export function formatDateTime(dateString) {
  return formatDateTimeICU(dateString, CONFIG.dateFormat, CONFIG.timeFormat, 'en-US');
}

// Apply community name to page
export function applyCommunityName() {
  const elements = document.querySelectorAll('[id="community-name"]');
  elements.forEach(el => {
    el.textContent = CONFIG.communityName;
  });
}

// Update page title with instance name
export function updatePageTitle(pageTitle) {
  if (pageTitle) {
    document.title = `${pageTitle} - ${CONFIG.instanceName}`;
  } else {
    document.title = CONFIG.instanceName;
  }
}

// Update instance identity link text
export function updateInstanceName() {
  const instanceLink = document.getElementById("instance-name");
  if (instanceLink) {
    instanceLink.textContent = CONFIG.instanceName;
  }
}

// Add footer to page
export function addFooter() {
  const footer = document.createElement("footer");
  footer.className = "small";

  let footerHTML = '<hr />';

  // Footer format: "{instance_name} · operated by {email}\nThis site runs Textpile {version} · source"
  footerHTML += `<strong>${escapeHtml(CONFIG.instanceName)}</strong>`;

  if (CONFIG.adminEmail) {
    footerHTML += ` &middot; operated by <a href="mailto:${escapeHtml(CONFIG.adminEmail)}">${escapeHtml(CONFIG.adminEmail)}</a>`;
  }

  footerHTML += '<br>';
  footerHTML += 'This site runs ';
  footerHTML += `${escapeHtml(CONFIG.softwareName)} ${escapeHtml(CONFIG.textpileVersion)}`;
  footerHTML += ` &middot; <a href="https://github.com/peterkaminski/textpile">GitHub repo</a>`;

  // Add source zip link if enabled
  if (CONFIG.publicSourceZip) {
    const zipUrl = `/assets/textpile-${escapeHtml(CONFIG.textpileVersion)}-source.zip`;
    footerHTML += ` &middot; <a href="${zipUrl}">Download source zip from this instance</a>`;
  }

  footer.innerHTML = footerHTML;
  document.body.appendChild(footer);
}

// HTML escape helper
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

// Initialize page with config
// Options:
//   pageTitle: string - page title to append to instance name (e.g., "Add Post")
export async function initPage(options = {}) {
  await loadConfig();
  applyCommunityName();
  updateInstanceName();
  updatePageTitle(options.pageTitle);

  addFooter();
}
