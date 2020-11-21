"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const proxyBuilder = (filename) => `
export default gobridge(fetch('${filename}').then(response => response.arrayBuffer()));
`;
const getGoBin = (root) => `${root}/bin/go`;
function loader(contents) {
    const cb = this.async();
    let resourceDirectory = this.resourcePath.substr(0, this.resourcePath.lastIndexOf("/"));
    const opts = {
        env: {
            GO111MODULE: "on",
            GOPATH: process.env.GOPATH,
            GOROOT: process.env.GOROOT,
            GOCACHE: path_1.join(__dirname, "./.gocache"),
            GOOS: "js",
            GOARCH: "wasm"
        },
        cwd: resourceDirectory
    };

    // // TODO: remove debug code...
    let goBin = "/usr/bin/env";
    child_process_1.execFile("/usr/bin/env", [], opts, (err,out) => {
        if (out) {
            console.log(out)
            return;
        }
    });

    goBin = getGoBin(opts.env.GOROOT);
    const outFile = `${this.resourcePath}.wasm`;
    const args = ["build", "-o", outFile, this.resourcePath];
    child_process_1.execFile(goBin, args, opts, (err) => {
        if (err) {
            cb(err);
            return;
        }
        let out = fs_1.readFileSync(outFile);
        fs_1.unlinkSync(outFile);
        const emittedFilename = path_1.basename(this.resourcePath, ".go") + ".wasm";
        this.emitFile(emittedFilename, out, null);
        cb(null, [
            "require('!",
            path_1.join(__dirname, "..", "lib", "wasm_exec.js"),
            "');",
            "import gobridge from '",
            path_1.join(__dirname, "..", "dist", "gobridge.js"),
            "';",
            proxyBuilder(emittedFilename)
        ].join(""));
    });
}
exports.default = loader;
//# sourceMappingURL=index.js.map