import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }

    const relative = specifier.slice(2);
    const extension = path.extname(relative) ? "" : ".ts";
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(root, `${relative}${extension}`)).href,
    };
  },
});
