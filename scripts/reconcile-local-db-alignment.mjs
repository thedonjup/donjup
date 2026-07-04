import {
  dbPool,
  fetchDbIdSet,
  jsonlWriter,
  kindFile,
  loadAlignmentState,
  loadExtendedManifest,
  loadLocalEnv,
  manifestScope,
  minimalDbRow,
  minimalLocalRow,
  monthsFromOptions,
  outputRunDir,
  parseArgs,
  parseBoolean,
  parseCsvSet,
  rowId,
  rowMatchesBasicFilters,
  localRowScopeKey,
  sha256File,
  streamDbRows,
  streamJsonLines,
  summarizeExtendedManifest,
  writeAlignmentState,
  writeJson,
} from "./lib/local-db-alignment.mjs";

const DEFAULT_PAGE_SIZE = 5000;

function usage() {
  console.log(`Usage:
  node scripts/reconcile-local-db-alignment.mjs --kind=sale --status=fetched --run-id=extended-period-...
  node scripts/reconcile-local-db-alignment.mjs --kind=rent --mode=db-first-export --write-state=true

Options:
  --kind=sale|rent|both
  --mode=alignment|db-first-export
  --run-id=<id>[,<id>]
  --status=fetched|uploaded|empty
  --ym=202604[,202605] or --months=...
  --from-ym=202604 --to-ym=202606
  --region=11110[,11140]
  --run-dir=.donjup-local-data/runs/...
  --write-state=true`);
}

function kindList(value) {
  if (!value || value === "both") return ["sale", "rent"];
  if (!["sale", "rent"].includes(value)) throw new Error(`Invalid --kind: ${value}`);
  return [value];
}

function filtersFromOptions(options, scope) {
  const optionMonths = monthsFromOptions(options);
  const optionRegions = parseCsvSet(options.region || options.regions);
  const scopeMonths = new Set(scope.items.map((item) => item.dealYearMonth).filter(Boolean));
  const scopeRegions = new Set(scope.items.map((item) => item.regionCode).filter(Boolean));
  return {
    months: optionMonths ?? (scopeMonths.size ? scopeMonths : null),
    regions: optionRegions ?? (scopeRegions.size ? scopeRegions : null),
  };
}

function makeOutputs(runDir, kind) {
  return {
    localOnly: jsonlWriter(`${runDir}/local-only-${kind}.jsonl`),
    dbOnly: jsonlWriter(`${runDir}/db-only-${kind}.jsonl`),
    overlap: jsonlWriter(`${runDir}/db-overlap-${kind}.jsonl`),
    outOfScope: jsonlWriter(`${runDir}/out-of-scope-${kind}.jsonl`),
  };
}

async function closeOutputs(outputs) {
  await Promise.all(Object.values(outputs).map((writer) => writer.end()));
}

function candidateMatcher(kind, options, scope) {
  const useManifestScope = Boolean(options.status || options.statuses);
  return (row) => {
    if (!rowMatchesBasicFilters(kind, row, options)) return { source: false, candidate: false };
    if (!useManifestScope) return { source: true, candidate: true };
    const inManifestScope = scope.keys.has(localRowScopeKey(kind, row));
    return { source: true, candidate: inManifestScope };
  };
}

async function runAlignmentForKind({ kind, options, runDir, manifest }) {
  const scope = manifestScope(options, manifest, kind);
  const filters = filtersFromOptions(options, scope);
  const pool = dbPool();
  const outputs = makeOutputs(runDir, kind);
  const matcher = candidateMatcher(kind, options, scope);
  const dbIds = await fetchDbIdSet(pool, kind, filters);
  const localIds = new Set();
  const summary = {
    kind,
    mode: "alignment",
    manifestScope: {
      itemCount: scope.items.length,
      statuses: [...(scope.statuses ?? [])],
      runIds: [...(scope.runIds ?? [])],
      months: filters.months ? [...filters.months] : [],
      regions: filters.regions ? [...filters.regions] : [],
    },
    dbRowsInScope: dbIds.size,
    localRowsRead: 0,
    candidateRows: 0,
    uniqueCandidateRows: 0,
    duplicateCandidateRows: 0,
    localOnlyRows: 0,
    overlapRows: 0,
    outOfScopeRows: 0,
    invalidLocalRows: 0,
    dbOnlyRows: 0,
    samples: {
      localOnly: [],
      dbOnly: [],
      outOfScope: [],
    },
  };

  try {
    const localStats = await streamJsonLines(kindFile(kind), async (row) => {
      summary.localRowsRead += 1;
      const match = matcher(row);
      if (!match.source) return;
      if (!match.candidate) {
        summary.outOfScopeRows += 1;
        const minimal = minimalLocalRow(kind, row);
        outputs.outOfScope.write(minimal);
        if (summary.samples.outOfScope.length < 10) summary.samples.outOfScope.push(minimal);
        return;
      }

      const id = rowId(kind, row);
      if (localIds.has(id)) {
        summary.duplicateCandidateRows += 1;
        return;
      }
      localIds.add(id);
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
    summary.invalidLocalRows = localStats.invalidRows;
    summary.uniqueCandidateRows = localIds.size;

    await streamDbRows(pool, kind, filters, async (row) => {
      const id = String(row.id);
      if (!localIds.has(id)) {
        summary.dbOnlyRows += 1;
        const minimal = minimalDbRow(kind, row);
        outputs.dbOnly.write(minimal);
        if (summary.samples.dbOnly.length < 10) summary.samples.dbOnly.push(minimal);
      }
    }, Number(options["page-size"] || DEFAULT_PAGE_SIZE));
  } finally {
    await closeOutputs(outputs);
    await pool.end();
  }

  summary.artifacts = Object.fromEntries(
    Object.entries(outputs).map(([key, writer]) => [key, writer.path]),
  );
  summary.checksums = Object.fromEntries(
    Object.entries(outputs).map(([key, writer]) => [key, sha256File(writer.path)]),
  );
  return summary;
}

async function runDbFirstExportForKind({ kind, options, runDir }) {
  if (kind !== "rent") {
    throw new Error("db-first-export is only supported for --kind=rent");
  }

  const filters = {
    months: monthsFromOptions(options),
    regions: parseCsvSet(options.region || options.regions),
  };
  const pool = dbPool();
  const writer = jsonlWriter(`${runDir}/db-first-exported-rent.jsonl`);
  const localIds = new Set();
  const summary = {
    kind,
    mode: "db-first-export",
    filters: {
      months: filters.months ? [...filters.months] : [],
      regions: filters.regions ? [...filters.regions] : [],
    },
    localRowsRead: 0,
    uniqueLocalRows: 0,
    duplicateLocalRows: 0,
    invalidLocalRows: 0,
    dbRowsScanned: 0,
    dbFirstExportedRows: 0,
    samples: [],
  };

  try {
    const localStats = await streamJsonLines(kindFile(kind), async (row) => {
      if (!rowMatchesBasicFilters(kind, row, options)) return;
      summary.localRowsRead += 1;
      const id = rowId(kind, row);
      if (localIds.has(id)) {
        summary.duplicateLocalRows += 1;
        return;
      }
      localIds.add(id);
    });
    summary.invalidLocalRows = localStats.invalidRows;
    summary.uniqueLocalRows = localIds.size;

    await streamDbRows(pool, kind, filters, async (row) => {
      summary.dbRowsScanned += 1;
      const id = String(row.id);
      if (localIds.has(id)) return;
      const minimal = minimalDbRow(kind, row);
      writer.write(minimal);
      summary.dbFirstExportedRows += 1;
      if (summary.samples.length < 10) summary.samples.push(minimal);
    }, Number(options["page-size"] || DEFAULT_PAGE_SIZE));
  } finally {
    await writer.end();
    await pool.end();
  }

  summary.artifacts = {
    dbFirstExport: writer.path,
  };
  summary.checksums = {
    dbFirstExport: sha256File(writer.path),
  };
  return summary;
}

function updateState(runDir, summaries) {
  const state = loadAlignmentState();
  const runKey = runDir.split("/").pop();
  state.runs[runKey] = {
    runDir,
    updatedAt: new Date().toISOString(),
    summaries: summaries.map((summary) => ({
      kind: summary.kind,
      mode: summary.mode,
      localOnlyRows: summary.localOnlyRows,
      dbOnlyRows: summary.dbOnlyRows,
      dbFirstExportedRows: summary.dbFirstExportedRows,
      outOfScopeRows: summary.outOfScopeRows,
      artifacts: summary.artifacts,
      checksums: summary.checksums,
    })),
  };

  for (const summary of summaries) {
    if (summary.kind === "rent" && summary.mode === "db-first-export") {
      state.rent.dbFirstExportedRows = summary.dbFirstExportedRows;
      state.rent.dbFirstExportRunDir = runDir;
      state.rent.dbFirstExportArtifact = summary.artifacts.dbFirstExport;
      state.rent.dbFirstExportChecksum = summary.checksums.dbFirstExport;
      state.rent.dbFirstExportedAt = new Date().toISOString();
    }
  }
  writeAlignmentState(state);
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const mode = options.mode || "alignment";
  const runDir = outputRunDir("local-db-reconcile", options["run-dir"]);
  const manifest = loadExtendedManifest();
  const kinds = kindList(options.kind);
  const summaries = [];

  writeJson(`${runDir}/manifest-summary.json`, summarizeExtendedManifest(manifest));

  for (const kind of kinds) {
    if (mode === "db-first-export") {
      summaries.push(await runDbFirstExportForKind({ kind, options, runDir }));
    } else if (mode === "alignment") {
      summaries.push(await runAlignmentForKind({ kind, options, runDir, manifest }));
    } else {
      throw new Error(`Invalid --mode: ${mode}`);
    }
  }

  const review = {
    mode,
    checkedAt: new Date().toISOString(),
    runDir,
    writeState: parseBoolean(options["write-state"], false),
    summaries,
  };
  writeJson(`${runDir}/alignment-review.json`, review);
  if (review.writeState) updateState(runDir, summaries);

  console.log(JSON.stringify({
    mode,
    runDir,
    writeState: review.writeState,
    summaries: summaries.map((summary) => ({
      kind: summary.kind,
      localOnlyRows: summary.localOnlyRows,
      dbOnlyRows: summary.dbOnlyRows,
      dbFirstExportedRows: summary.dbFirstExportedRows,
      outOfScopeRows: summary.outOfScopeRows,
      artifacts: summary.artifacts,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

