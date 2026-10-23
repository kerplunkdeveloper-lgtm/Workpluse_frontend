
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const THEME = process.env.THEME === "dark" ? "dark" : "light";
const WIDTHS = (process.env.WIDTHS || "375,1440").split(",").map(Number);
const SHOTS = Boolean(process.env.SHOTS);
const OUT = path.resolve(".ui-audit");

const ROUTES_BY_ROLE = {
  COMPANY_ADMIN: [
    "/dashboard", "/attendance", "/employees", "/leaves", "/payroll", "/reports", "/approvals", "/assets",
    "/branches", "/chat", "/departments", "/expenses", "/holidays", "/loans", "/offboarding", "/onboarding",
    "/overtime", "/audit", "/permissions", "/policy", "/profile", "/settings", "/shifts", "/statutory", "/appraisals",
    "/change-password", "/", "/login", "/register", "/forgot-password", "/verify-email", "/this-page-does-not-exist",
  ],
  EMPLOYEE: ["/dashboard", "/attendance", "/leaves", "/payroll", "/expenses", "/profile", "/chat"],
  SUPER_ADMIN: ["/platform/clients", "/platform/billing", "/platform/activity"],
};
const ROLES = (process.env.ROLES || Object.keys(ROUTES_BY_ROLE).join(",")).split(",");
const ONLY = (process.env.ROUTES || "").split(",").filter(Boolean);

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error("No Chrome/Edge found. Set CHROME_PATH.");
  return found;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const iso = (d) => new Date(d).toISOString();
const today = new Date();
const shift = { id: "s1", name: "General", startTime: "09:00", endTime: "18:00", workingDays: "1,2,3,4,5", graceMinutes: 10 };
const branch = { id: "b1", organizationId: "o1", name: "Puducherry HQ", address: "Kaveri Nagar, Oulgaret, Puducherry", latitude: 11.94, longitude: 79.8, radiusMeters: 1500 };
const department = { id: "d1", organizationId: "o1", name: "Engineering" };
const people = ["Ananya Raman", "Karthik Selvam", "Meera Iyer", "Arjun Prakash", "Divya Narayanan", "Rahul Venkatesh", "Sneha Krishnan", "Vikram Subramanian"];
const employees = people.map((n, i) => {
  const [first, last] = n.split(" ");
  return {
    id: `e${i}`, organizationId: "o1", userId: `u${i}`, employeeCode: `KM-${1040 + i}`, firstName: first, lastName: last,
    email: `${first.toLowerCase()}@kerplunk.example`, phone: `+91 98431 2${7000 + i * 37}`,
    designation: ["Frontend Engineer", "HR Generalist", "Product Designer", "Sales Lead"][i % 4], status: "ACTIVE",
    dateOfJoining: iso(Date.now() - (200 + i * 90) * 864e5), dateOfBirth: iso(new Date(1994, i, 3 + i)),
    branchId: "b1", departmentId: "d1", shiftId: "s1", branch, department, shift, salary: 42000 + i * 3500,
    user: { id: `u${i}`, email: `${first.toLowerCase()}@kerplunk.example`, role: i === 0 ? "MANAGER" : "EMPLOYEE", isActive: true },
  };
});
const meFor = (role) => ({
  id: "u-admin", email: "admin@kerplunk.example", role, organizationId: "o1",
  organization: { id: "o1", name: "Kerplunk Media", subscriptionPlan: "GROWTH", subscriptionStatus: "ACTIVE", maxEmployees: 100, planLocked: false, branches: [branch], departments: [department], timezone: "Asia/Kolkata", currency: "INR" },
  employee: { ...employees[0], id: "e-admin", firstName: "Vasanth", lastName: "Kumar", user: undefined },
  entitlement: { state: "ACTIVE", allowApp: true, code: null, daysRemaining: 240 },
  features: { maxEmployees: 100, maxBranches: 10, hasPayroll: true, hasApiAccess: true, hasGeofence: true, hasShiftPlanner: true },
});
const checkIn = new Date(today); checkIn.setHours(9, 4, 0, 0);
const attendanceToday = { id: "a-today", organizationId: "o1", employeeId: "e-admin", date: `${iso(today).slice(0, 10)}T00:00:00.000Z`, checkIn: iso(checkIn), status: "PRESENT", breakMinutes: 12, lateMinutes: 0, events: [] };
const history = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(today); d.setDate(d.getDate() - i - 1);
  const ci = new Date(d); ci.setHours(9, 2 + ((i * 7) % 25), 0, 0);
  const co = new Date(d); co.setHours(18, (i * 11) % 40, 0, 0);
  return { id: `h${i}`, organizationId: "o1", employeeId: employees[i % 8].id, employee: employees[i % 8], date: `${iso(d).slice(0, 10)}T00:00:00.000Z`, checkIn: iso(ci), checkOut: iso(co), status: i % 5 === 3 ? "LATE" : "PRESENT", workingMinutes: 512 - i * 3, breakMinutes: 30, lateMinutes: i % 5 === 3 ? 17 : 0 };
});

/** Lists for collection endpoints, objects for singular ones; anything unknown gets an empty page. */
function reply(url, method, role) {
  const p = new URL(url).pathname.replace(/^\/backend-api/, "");
  const ok = (data, extra = {}) => ({ success: true, data, ...extra });
  const page = (items) => ok(items, { pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 }, meta: { total: items.length, page: 1, totalPages: 1 } });
  if (p === "/auth/refresh") return ok({ accessToken: "mock-token", token: "mock-token" });
  if (p === "/auth/me") { const me = meFor(role); return { success: true, data: me, user: me }; }
  if (method !== "GET") return ok({});
  if (/attendance\/(today|status)/.test(p)) return ok({ attendance: attendanceToday, hasCheckedIn: true, hasCheckedOut: false, isOnBreak: false, shift, locationPolicy: { mode: "OFFICE_ONLY", allowWfh: true, branchName: branch.name, radiusMeters: 1500 } });
  if (/^\/employees\/?$/.test(p)) return page(employees);
  if (/^\/employees\/[^/]+$/.test(p)) return ok(employees[1]);
  if (/^\/attendance(\/history|\/my|\/records|\/team|\/all)?\/?$/.test(p)) return page(history);
  if (/branches\/?$/.test(p)) return ok([branch]);
  if (/departments\/?$/.test(p)) return ok([department]);
  if (/shifts\/?$/.test(p)) return ok([shift]);
  if (/(stats|summary|overview|dashboard|policy|settings|organization|profile|template|balance|count|config|entitlement|subscription|insights|attention)/.test(p)) return ok({});
  return page([]);
}

// ── In-page checks (run inside the browser) ──────────────────────────────────
function inspectPage() {
  const vw = document.documentElement.clientWidth;
  const problems = [];
  const text = document.body.innerText || "";
  if (/Unhandled Runtime Error|Application error: a client-side exception/.test(text)) problems.push("crash: error screen shown");

  const junk = text.match(/[^\n]{0,30}(\bNaN\b|\bundefined\b|\bnull\b|Invalid Date|\[object Object\])[^\n]{0,20}/g) || [];
  for (const j of [...new Set(junk)].slice(0, 3)) problems.push(`placeholder text: "${j.trim()}"`);

  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  const describe = (el) => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30)}"`;
  let cut = 0;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1 || clipped(el)) continue;
    if (getComputedStyle(el).position === "fixed" && r.left >= vw) continue;
    if (cut++ < 2) problems.push(`cut off at ${vw}px: ${describe(el)} (right edge ${Math.round(r.right)}px)`);
  }

  // Contrast: text colour against the nearest solid background (skipped when an
  // image or gradient sits in between, since the real backdrop is unknown).
  // Computed colours may be oklch()/lab()/color(); a 1×1 canvas converts any of them to sRGB.
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgb = (c) => {
    if (cache.has(c)) return cache.get(c);
    const alpha = /\/\s*([\d.]+%?)\s*\)$/.exec(c) || /^rgba\([^)]*,\s*([\d.]+)\)$/.exec(c);
    let a = alpha ? (alpha[1].endsWith("%") ? parseFloat(alpha[1]) / 100 : parseFloat(alpha[1])) : 1;
    if (c === "transparent") a = 0;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const out = a < 1 ? [r, g, b, a] : [r, g, b];
    cache.set(c, out);
    return out;
  };
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const backdrop = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== "none" || Number(s.opacity) < 1 || /blur/.test(s.backdropFilter || "")) return null;
      const c = rgb(s.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] >= 0.95)) return c;
      if (c.length === 4 && c[3] > 0.05) return null; // translucent layer: unknown result
    }
    return [255, 255, 255];
  };
  let low = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || seen.has(el) || !t.textContent.trim()) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || s.visibility === "hidden" || Number(s.opacity) < 1 || el.closest("[aria-hidden='true'],button:disabled,[disabled],input,select,textarea,option")) continue;
    const fg = rgb(s.color);
    if (fg.length === 4 && fg[3] < 1) continue;
    const bg = backdrop(el);
    if (!bg) continue;
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    if (ratio < 3 && low++ < 3) problems.push(`low contrast ${ratio.toFixed(2)}:1: ${describe(el)}`);
  }
  return { path: location.pathname, problems };
}

// ── Runner ───────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ["--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-sandbox"] });
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
let checks = 0;

for (const role of ROLES) {
  const routes = (ROUTES_BY_ROLE[role] || []).filter((r) => !ONLY.length || ONLY.includes(r));
  for (const route of routes) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900, isMobile: width < 640, hasTouch: width < 640 });
      await page.evaluateOnNewDocument((theme) => { try { localStorage.setItem("workpulse_theme", theme); } catch {} }, THEME);
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0].slice(0, 140)));
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const url = req.url();
        if (url.includes("/backend-api/")) return req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(reply(url, req.method(), role)) });
        if (!url.startsWith(BASE) && !url.startsWith("data:")) return req.abort();
        return req.continue();
      });
      try {
        await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 120000 });
      } catch (e) {
        errors.push(`navigation: ${e.message.slice(0, 100)}`);
      }
      await new Promise((r) => setTimeout(r, 900));
      const result = await page.evaluate(inspectPage);
      const problems = [...errors.map((e) => `runtime error: ${e}`), ...result.problems];
      if (SHOTS) await page.screenshot({ path: path.join(OUT, `${THEME}-${role}${route.replace(/\//g, "_") || "_root"}@${width}.png`), fullPage: true });
      checks++;
      if (problems.length) {
        failures++;
        console.log(`✖ ${role.padEnd(13)} ${route.padEnd(26)} ${String(width).padStart(4)}px`);
        for (const p of problems) console.log(`    · ${p}`);
      } else {
        console.log(`✓ ${role.padEnd(13)} ${route.padEnd(26)} ${String(width).padStart(4)}px`);
      }
      await page.close();
    }
  }
}
await browser.close();
console.log(`\n${checks - failures}/${checks} screens clean (${THEME} theme)${failures ? ` — ${failures} with problems` : ""}`);
process.exit(failures ? 1 : 0);
