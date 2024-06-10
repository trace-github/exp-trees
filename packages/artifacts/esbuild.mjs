import { execSync } from 'child_process';
import { wasmLoader } from "esbuild-plugin-wasm";

import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outdir: "./dist",
  format: "cjs",
  logLevel: "error",
  tsconfig: "tsconfig.build.json",

  plugins: [
    wasmLoader({
      mode: 'embedded',
    }),
    {
      name: 'TypeScriptDeclarationsPlugin',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length > 0) return
          execSync('tsc -p tsconfig.build.json --emitDeclarationOnly')
        })
      }
    },

  ],
})
