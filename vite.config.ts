import { hostname } from "node:os";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

function ermittleZusatzHosts(): string[] {
  return [hostname()].filter(Boolean);
}

export default defineConfig({
  base: "./",
  // mkcert erzeugt fuer die lokale Entwicklung ein vertrauenswuerdiges Zertifikat.
  // Damit funktioniert navigator.mediaDevices.getUserMedia auch ausserhalb von localhost
  // im lokalen Netzwerk, solange das Zertifikat vom jeweiligen Geraet vertraut wird.
  plugins: [
    mkcert({
      hosts: ermittleZusatzHosts(),
      savePath: resolve(__dirname, ".zertifikate")
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        hauptanwendung: resolve(__dirname, "index.html"),
        dashboardSteuerung: resolve(__dirname, "dashboard-steuerung.html")
      }
    }
  },
  preview: {
    host: true,
    port: 4173
  }
});
