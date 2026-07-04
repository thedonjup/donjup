import {
  dbPool,
  fetchDbIdSet,
  jsonlWriter,
  kindFile,
  loadAlignmentState,
  loadExtendedManifest,
  loadLocalEnv,
  localRowScopeKey,
  manifestScope,
  minimalLocalRow,
  outputRunDir,
  parseArgs,
  parseBoolean,
  readJson,
  rowId,
  sha256File,
  streamJsonLines,
  summarizeExtendedManifest,
  writeAlignmentState,
  writeJson,
  dataPath,
} from "./lib/local-db-alignment.mjs";

function usage() {
  console.log(`Usage:
  node scripts/quarantine-local-only-rows.mjs --kind=sale --status=fetched
  node scripts/quarantine-local-only-rows.mjs --kind=sale --status=fetched --apply=true

Options:
  --kind=sale
  --run-id=<id>[,<id>]
  --status=fetched
  --ym=202604[,202605] or --months=...
  --region=11110[,11140]
  --run-dir=.donjup-local-data/runs/...
  --apply=true`);
}

function mergeQuarantineManifest(nextEntry) {
  const path = dataPath("quarantine/local-db-alignment/quarantine-manifest.json");
  const current = readJson(path, { version: 1, entries: [] });
  const entries = [
    ...(current.entries ?? []).filter((entry) => entry.runDir !== nextEntry.runDir),
    nextEntry,
  ];
  writeJson(path, {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  });
  return path;
}

function updateAlignmentState(entry) {
  const state = loadAlignmentState();
  state.sale.quarantinedRows = entry.localOnlyRows;
  state.sale.collectedOnlyRows = entry.candidateRows;
  state.sale.quarantineRunDir = entry.runDir;
  state.sale.quarantineManifest = entry.quarantineManifest;
  state.sale.quarantineArtifact = entry.artifacts.localOnly;
  state.sale.quarantineChecksum = entry.checksums.localOnly;
  state.sale.quarantinedAt = new Date().toISOString();
  state.runs[entry.runDir.split("/").pop()] = {
    runDir: entry.runDir,
    updatedAt: new Date().toISOString(),
    summaries: [{
      kind: "sale",
      mode: "quarantine",
      candidateRows: entry.candidateRows,
      localOnlyRows: entry.localOnlyRows,
      overlapRows: entry.overlapRows,
      outOfScopeRows: entry.outOfScopeRows,
      artifacts: entry.artifacts,
      checksums: entry.checksums,
    }],
  };
  writeAlignmentState(state);
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const kind = options.kind || "sale";
  if (kind !== "sale") throw new Error("quarantine-local-only-rows currently supports --kind=sale only");
  if (!options.status && !options.statuses) options.status = "fetched";

  const runDir = outputRunDir("local-only-quarantine", options["run-dir"]);
  const manifest = loadExtendedManifest();
  const scope = manifestScope(options, manifest, kind);
  const scopeItemsByKey = new Map(scope.items.map((item) => [item.key, item]));
  const filters = {
    months: new Set(scope.items.map((item) => item.dealYearMonth).filter(Boolean)),
    regions: new Set(scope.items.map((item) => item.regionCode).filter(Boolean)),
  };
  const db = dbPool();
  const outputs = {
    localOnly: jsonlWriter(`${runDir}/local-only-sale.jsonl`),
    overlap: jsonlWriter(`${runDir}/db-overlap-sale.jsonl`),
    outOfScope: jsonlWriter(`${runDir}/out-of-scope-sale.jsonl`),
  };
  const dbIds = await fetchDbIdSet(db, kind, filters);
  const seen = new Set();
  const selectedRunIds = new Set(scope.items.map((item) => item.runId).filter(Boolean));
  const summary = {
    mode: parseBoolean(options.apply, false) ? "apply" : "dry-run",
    kind,
    checkedAt: new Date().toISOString(),
    runDir,
    manifestScope: {
      itemCount: scope.items.length,
      rows: scope.items.reduce((sum, item) => sum + Number(item.rowCount || 0), 0),
      statuses: [...(scope.statuses ?? [])],
      runIds: [...selectedRunIds],
      months: [...filters.months],
      regions: [...filters.regions],
    },
    dbRowsInScope: dbIds.size,
    localRowsRead: 0,
    candidateRows: 0,
    duplicateCandidateRows: 0,
    localOnlyRows: 0,
    overlapRows: 0,
    outOfScopeRows: 0,
    invalidLocalRows: 0,
    samples: {
      localOnly: [],
      outOfScope: [],
    },
  };

  try {
    const stats = await streamJsonLines(kindFile(kind), async (row) => {
      summary.localRowsRead += 1;
      const rowRunId = row.extendedRunId || row.collectionRunId || "";
      if (selectedRunIds.size && !selectedRunIds.has(rowRunId)) return;

      const item = scopeItemsByKey.get(localRowScopeKey(kind, row));
      const inScope = Boolean(item && item.runId === rowRunId);
      if (!inScope) {
        summary.outOfScopeRows += 1;
        const minimal = minimalLocalRow(kind, row);
        outputs.outOfScope.write(minimal);
        if (summary.samples.outOfScope.length < 10) summary.samples.outOfScope.push(minimal);
        return;
      }

      const id = rowId(kind, row);
      if (seen.has(id)) {
        summary.duplicateCandidateRows += 1;
        return;
      }
      seen.add(id);
      summary.candidateRows += 1;
      const minimal = minimalLocalRow(kind, row);
      if (dbIds.has(id)) {
        summary.overlapRows += 1;
        outputs.overlap.write({ id, kind });
      } else {
        summary.localOnlyRows += 1;
        outputs.localOnly.write(minimal);
        if (summary.samples.localOnly.length < 10) summary.samples.localOnly.push(minimal);
      }
    });
    summary.invalidLocalRows = stats.invalidRows;
  } finally {
    await Promise.all(Object.values(outputs).map((writer) => writer.end()));
    await db.end();
  }

  summary.artifacts = {
    localOnly: outputs.localOnly.path,
    dbOverlap: outputs.overlap.path,
    outOfScope: outputs.outOfScope.path,
    review: `${runDir}/local-only-sale-review.json`,
  };
  summary.checksums = {
    localOnly: sha256File(outputs.localOnly.path),
    dbOverlap: sha256File(outputs.overlap.path),
    outOfScope: sha256File(outputs.outOfScope.path),
  };
  summary.manifestSummary = summarizeExtendedManifest(manifest);

  if (summary.mode === "apply") {
    if (summary.outOfScopeRows > 0) {
      throw new Error(`Refusing quarantine apply because outOfScopeRows=${summary.outOfScopeRows}`);
    }
    const quarantineEntry = {
      runDir,
      createdAt: new Date().toISOString(),
      kind,
      manifestScope: summary.manifestScope,
      candidateRows: summary.candidateRows,
      localOnlyRows: summary.localOnlyRows,
      overlapRows: summary.overlapRows,
      outOfScopeRows: summary.outOfScopeRows,
      artifacts: summary.artifacts,
      checksums: summary.checksums,
    };
    summary.quarantineManifest = mergeQuarantineManifest(quarantineEntry);
    quarantineEntry.quarantineManifest = summary.quarantineManifest;
    updateAlignmentState(quarantineEntry);
  }

  writeJson(summary.artifacts.review, summary);
  writeJson(`${runDir}/manifest-summary.json`, summary.manifestSummary);

  console.log(JSON.stringify({
    mode: summary.mode,
    runDir,
    candidateRows: summary.candidateRows,
    localOnlyRows: summary.localOnlyRows,
    overlapRows: summary.overlapRows,
    outOfScopeRows: summary.outOfScopeRows,
    quarantineManifest: summary.quarantineManifest ?? null,
    artifacts: summary.artifacts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
