import { build } from "esbuild";
import { wasmLoader } from "esbuild-plugin-wasm";

export const buildNode = async ({ ...args }) => {
  await build({
    entryPoints: ["src/main.ts"],
    platform: "node",
    target: "node20",
    format: "cjs",
    outdir: "./dist",
    bundle: true,
    logLevel: "error",
    tsconfig: "tsconfig.build.json",
    plugins: [wasmLoader()],
    ...args
  })
};

await buildNode({});