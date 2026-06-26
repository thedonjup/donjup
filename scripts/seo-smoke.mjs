#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROUTES = [
  "/",
  "/rate",
  "/trend",
  "/market",
  "/rent",
  "/search?q=%EB%8B%B5%EC%8B%AD%EB%A6%AC%20%EB%91%90%EC%82%B0",
];

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildUrl(origin, route) {
  return new URL(route, origin).toString();
}

function extractCanonical(html) {
  const relFirst = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (relFirst?.[1]) return relFirst[1];

  const hrefFirst = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  return hrefFirst?.[1] ?? null;
}

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(regex)) {
    const raw = match[1]?.trim() ?? "";
    if (!raw) continue;
    blocks.push(JSON.parse(raw));
  }
  return blocks;
}

async function checkRoute(origin, route) {
  const startedAt = Date.now();
  const url = buildUrl(origin, route);
  const response = await fetch(url, {
    headers: {
      "user-agent": "DonJup SEO smoke (+https://donjup.com)",
    },
  });
  const html = await response.text();
  const canonical = extractCanonical(html);
  const jsonLd = extractJsonLd(html);

  return {
    route,
    url,
    status: response.status,
    ok: response.ok,
    elapsedMs: Date.now() - startedAt,
    canonical,
    jsonLdCount: jsonLd.length,
    jsonLdTypes: jsonLd.map((item) => item?.["@type"] ?? null).filter(Boolean),
    naverSiteVerificationConfigured: html.includes("naver-site-verification"),
  };
}

async function checkFeed(origin) {
  const startedAt = Date.now();
  const url = buildUrl(origin, "/feed.xml");
  const response = await fetch(url, {
    headers: {
      "user-agent": "DonJup SEO smoke (+https://donjup.com)",
    },
  });
  const body = await response.text();

  return {
    route: "/feed.xml",
    url,
    status: response.status,
    ok: response.ok,
    elapsedMs: Date.now() - startedAt,
    contentType: response.headers.get("content-type"),
    hasRss: body.includes("<rss") && body.includes("<channel>"),
    itemCount: [...body.matchAll(/<item>/g)].length,
  };
}

async function main() {
  const origin = argValue("origin", "https://donjup.com");
  const routes = argValue("routes")
    ?.split(",")
    .map((route) => route.trim())
    .filter(Boolean) ?? DEFAULT_ROUTES;
  const outPath = argValue(
    "out",
    path.join(
      ".donjup-local-data",
      "runs",
      `market-gap-seo-smoke-${timestamp()}.json`,
    ),
  );

  const feed = await checkFeed(origin);
  const routeResults = [];
  const errors = [];

  for (const route of routes) {
    try {
      routeResults.push(await checkRoute(origin, route));
    } catch (error) {
      errors.push({
        route,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const failures = [
    ...(!feed.ok || !feed.hasRss ? [`feed.xml invalid: ${feed.status}`] : []),
    ...routeResults
      .filter((route) => !route.ok || !route.canonical)
      .map((route) => `${route.route} invalid: ${route.status}, canonical=${route.canonical ?? "missing"}`),
    ...errors.map((error) => `${error.route}: ${error.message}`),
  ];

  const report = {
    checkedAt: new Date().toISOString(),
    origin,
    feed,
    routes: routeResults,
    errors,
    failures,
    ok: failures.length === 0,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    ok: report.ok,
    outPath,
    feedStatus: feed.status,
    routeCount: routeResults.length,
    failures: failures.length,
  }));

  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
