import { build } from "esbuild";

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
    ...args
  })
};

await buildNode({});