import { execSync } from 'child_process';
import { build } from "esbuild";

export const buildNode = async ({ ...args }) => {
  await build({
    entryPoints: ["src/index.ts"],
    format: "cjs",
    outdir: "./dist",
    bundle: true,
    logLevel: "error",
    tsconfig: "tsconfig.build.json",
    ...args,

    plugins: [
      {
        name: 'TypeScriptDeclarationsPlugin',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length > 0) return
            execSync('tsc -p tsconfig.build.json --emitDeclarationOnly')
          })
        }
      }
    ]
  })
};

await buildNode({});