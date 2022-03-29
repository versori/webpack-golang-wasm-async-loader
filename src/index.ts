import * as webpack from "webpack";
import {readFileSync, unlinkSync} from "fs";
import {basename, join} from "path";
import {execFile} from "child_process";

export const getGoBin = (root: string) => join(root, "bin", "go");

export const getGoWasmExec = (root: string) => join(root, "misc", "wasm", "wasm_exec.js");

function loader(this: webpack.LoaderContext<any>, contents: string) {
  const cb = this.async();

  let resourceDirectory = this.resourcePath.substr(0, this.resourcePath.lastIndexOf("/"));

  const opts = {
    env: {
      GO111MODULE: "on",
      GOPATH: process.env.GOPATH,
      GOROOT: process.env.GOROOT,
      GOCACHE: join(__dirname, "./.gocache"),
      GOOS: "js",
      GOARCH: "wasm"
    },
    cwd: resourceDirectory
  };
  const outFile = `${this.resourcePath}.wasm`;
  const args = ["build", "-o", outFile, this.resourcePath];

  const goBin = getGoBin(opts.env.GOROOT);
  // TODO: const libPath = getGoWasmExec(opts.env.GOROOT)
  const libPath = join(__dirname, "..", "lib", "wasm_exec.js");
  const bridgePath = join(__dirname, "..", "dist", "gobridge.js");

  execFile(goBin, args, opts, (err) => {
    if (err) {
      cb(err);
      return;
    }

    // TODO: only here for debugging; remove later or use env var!
    console.info("[Go WASM loader] debug info", { goBin, args, opts, err });

    const out = readFileSync(outFile);
    try {
      unlinkSync(outFile);
    } catch (e) {
      console.error("[Go WASM loader] unlinking encountered error:", { e });
    }

    const emitFileBasename = basename(this.resourcePath, ".go");
    const emittedFilename = `${emitFileBasename}.wasm`;
    this.emitFile(emittedFilename, out, null);

    const proxied = `
      require('!${libPath}');
      import gobridge from '${bridgePath}';
      let exportee = {}
      if (typeof window !== 'undefined') {
        const file = fetch(__webpack_public_path__ + '${emittedFilename}');
        const buffer = file.then(res => res.arrayBuffer());
        exportee= gobridge(buffer);
      }
      export default exportee;
    `;
    cb(null, proxied);
  });
}

export default loader;
