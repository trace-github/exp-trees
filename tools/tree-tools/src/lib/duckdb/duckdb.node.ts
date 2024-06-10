import { AsyncDuckDB, VoidLogger, selectBundle } from "@duckdb/duckdb-wasm";
import path from "path";
import Worker from "web-worker";

globalThis.Worker = Worker;

const DUCKDB_DIST = path.dirname(require.resolve("@duckdb/duckdb-wasm"));

export async function duckdb() {
  const DUCKDB_CONFIG = await selectBundle({
    mvp: {
      mainModule: path.resolve(DUCKDB_DIST, "./duckdb-mvp.wasm"),
      mainWorker: path.resolve(DUCKDB_DIST, "./duckdb-node-mvp.worker.cjs")
    },
    eh: {
      mainModule: path.resolve(DUCKDB_DIST, "./duckdb-eh.wasm"),
      mainWorker: path.resolve(DUCKDB_DIST, "./duckdb-node-eh.worker.cjs")
    }
  });

  const logger = new VoidLogger();
  const worker = new Worker(DUCKDB_CONFIG.mainWorker);

  const db = new AsyncDuckDB(logger, worker);
  await db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);

  return db;
}
