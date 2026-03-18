import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projektwurzel = resolve(__dirname, "..");
const distVerzeichnis = resolve(projektwurzel, "dist");
const addonWebVerzeichnis = resolve(projektwurzel, "addon", "sip-browserphone", "www");

await rm(addonWebVerzeichnis, {
  recursive: true,
  force: true
});

await mkdir(addonWebVerzeichnis, {
  recursive: true
});

await cp(distVerzeichnis, addonWebVerzeichnis, {
  recursive: true
});

console.info(`Add-on-Webdateien aktualisiert: ${addonWebVerzeichnis}`);
