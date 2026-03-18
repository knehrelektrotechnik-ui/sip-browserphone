import { Protokollspeicher } from "./utils/protokoll";

interface DebugFeld {
  bezeichnung: string;
  wert: string;
}

interface DebugKonsoleOptionen {
  protokollspeicher: Protokollspeicher;
  titel?: string;
  untertitel?: string;
  hinweis?: string;
  statusfelder?: () => DebugFeld[];
}

function maskiereHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatiereBooleschenStatus(wert: boolean): string {
  return wert ? "Ja" : "Nein";
}

function pruefeLocalStorageVerfuegbarkeit(): string {
  try {
    const schluessel = "__debug-konsole-test__";
    window.localStorage.setItem(schluessel, "1");
    window.localStorage.removeItem(schluessel);
    return "Verfuegbar";
  } catch {
    return "Blockiert";
  }
}

export class DebugKonsole {
  private wurzelElement?: HTMLDivElement;
  private schalterElement?: HTMLButtonElement;
  private panelElement?: HTMLDivElement;
  private statusrasterElement?: HTMLDivElement;
  private protokollListeElement?: HTMLDivElement;
  private istOffen = false;

  public constructor(private readonly optionen: DebugKonsoleOptionen) {}

  public einbinden(): void {
    if (this.wurzelElement) {
      return;
    }

    const wurzelElement = document.createElement("div");
    wurzelElement.className = "debug-konsole";
    wurzelElement.innerHTML = this.erzeugeMarkup();
    document.body.append(wurzelElement);

    this.wurzelElement = wurzelElement;
    this.schalterElement = this.finde<HTMLButtonElement>(".debug-konsole__schalter");
    this.panelElement = this.finde<HTMLDivElement>(".debug-konsole__panel");
    this.statusrasterElement = this.finde<HTMLDivElement>(".debug-konsole__statusraster");
    this.protokollListeElement = this.finde<HTMLDivElement>(".debug-konsole__protokollliste");

    this.schalterElement.addEventListener("click", () => {
      this.umschalten();
    });

    this.finde<HTMLButtonElement>(".debug-konsole__schliessen").addEventListener("click", () => {
      this.schliessen();
    });

    this.finde<HTMLButtonElement>(".debug-konsole__aktualisieren").addEventListener("click", () => {
      this.renderStatusraster();
      this.renderProtokoll();
    });

    this.finde<HTMLButtonElement>(".debug-konsole__export").addEventListener("click", () => {
      this.exportieren();
    });

    this.finde<HTMLButtonElement>(".debug-konsole__leeren").addEventListener("click", () => {
      this.optionen.protokollspeicher.leeren();
      this.renderProtokoll();
    });

    document.addEventListener("keydown", (ereignis) => {
      if (ereignis.key === "Escape" && this.istOffen) {
        this.schliessen();
      }
    });

    window.addEventListener("online", () => {
      this.renderStatusraster();
    });

    window.addEventListener("offline", () => {
      this.renderStatusraster();
    });

    window.addEventListener("hashchange", () => {
      this.renderStatusraster();
    });

    window.addEventListener("storage", () => {
      this.renderStatusraster();
    });

    document.addEventListener("visibilitychange", () => {
      this.renderStatusraster();
    });

    this.optionen.protokollspeicher.abonnieren(() => {
      this.renderProtokoll();
    });

    this.renderStatusraster();
    this.renderProtokoll();
  }

  private erzeugeMarkup(): string {
    return `
      <button type="button" class="debug-konsole__schalter sekundaer">Debug-Konsole</button>
      <div class="debug-konsole__panel" hidden>
        <div class="debug-konsole__kopf">
          <div>
            <p class="debug-konsole__ueberzeile">Support und Fehlersuche</p>
            <h2 class="debug-konsole__titel">${maskiereHtml(this.optionen.titel ?? "Debug-Konsole")}</h2>
            <p class="debug-konsole__untertitel">${maskiereHtml(
              this.optionen.untertitel ?? "Live-Protokoll, Browserstatus und Umgebungsdaten fuer die Diagnose."
            )}</p>
          </div>
          <div class="debug-konsole__kopfaktionen">
            <button type="button" class="debug-konsole__aktualisieren sekundaer">Aktualisieren</button>
            <button type="button" class="debug-konsole__export sekundaer">Exportieren</button>
            <button type="button" class="debug-konsole__schliessen sekundaer">Schliessen</button>
          </div>
        </div>
        <p class="debug-konsole__hinweis">${maskiereHtml(
          this.optionen.hinweis ??
            "Diese Konsole ist fuer Supportfaelle gedacht und zeigt bewusst keine Passwoerter im Klartext an."
        )}</p>
        <div class="debug-konsole__statusraster"></div>
        <div class="debug-konsole__protokollkopf">
          <strong>Live-Protokoll</strong>
          <button type="button" class="debug-konsole__leeren sekundaer">Protokoll leeren</button>
        </div>
        <div class="debug-konsole__protokollliste"></div>
      </div>
    `;
  }

  private finde<T extends Element>(selektor: string): T {
    const element = this.wurzelElement?.querySelector<T>(selektor);

    if (!element) {
      throw new Error(`Debug-Konsole konnte Element nicht finden: ${selektor}`);
    }

    return element;
  }

  private umschalten(): void {
    if (this.istOffen) {
      this.schliessen();
      return;
    }

    this.oeffnen();
  }

  private oeffnen(): void {
    if (!this.panelElement || !this.schalterElement) {
      return;
    }

    this.istOffen = true;
    this.panelElement.hidden = false;
    this.schalterElement.textContent = "Debug schliessen";
    this.renderStatusraster();
    this.renderProtokoll();
  }

  private schliessen(): void {
    if (!this.panelElement || !this.schalterElement) {
      return;
    }

    this.istOffen = false;
    this.panelElement.hidden = true;
    this.schalterElement.textContent = "Debug-Konsole";
  }

  private renderStatusraster(): void {
    if (!this.statusrasterElement) {
      return;
    }

    this.statusrasterElement.innerHTML = this.ermittleStatusfelder()
      .map(
        (eintrag) => `
          <article class="debug-konsole__statuskarte">
            <span class="debug-konsole__statuslabel">${maskiereHtml(eintrag.bezeichnung)}</span>
            <strong class="debug-konsole__statuswert">${maskiereHtml(eintrag.wert)}</strong>
          </article>
        `
      )
      .join("");
  }

  private renderProtokoll(): void {
    if (!this.protokollListeElement) {
      return;
    }

    const eintraege = this.optionen.protokollspeicher.alleEintraege();

    if (eintraege.length === 0) {
      this.protokollListeElement.innerHTML =
        '<div class="debug-konsole__leer">Noch keine Debug-Eintraege vorhanden.</div>';
      return;
    }

    this.protokollListeElement.innerHTML = eintraege
      .map(
        (eintrag) => `
          <article class="debug-konsole__eintrag" data-ebene="${maskiereHtml(eintrag.ebene)}">
            <div class="debug-konsole__eintragkopf">
              <span class="debug-konsole__eintragzeit">${maskiereHtml(eintrag.zeitstempel)}</span>
              <span class="debug-konsole__eintragbereich">${maskiereHtml(eintrag.bereich)}</span>
              <span class="debug-konsole__eintragebene">${maskiereHtml(eintrag.ebene.toUpperCase())}</span>
            </div>
            <p class="debug-konsole__eintragtext">${maskiereHtml(eintrag.nachricht)}</p>
            ${
              eintrag.details
                ? `<p class="debug-konsole__eintragdetails">${maskiereHtml(eintrag.details)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("");
  }

  private exportieren(): void {
    const inhalt = this.erstelleExporttext();
    const blob = new Blob([inhalt], { type: "text/plain;charset=utf-8" });
    const objektUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const zeitstempel = new Date().toISOString().replace(/[:.]/g, "-");

    link.href = objektUrl;
    link.download = `softphone-debug-${zeitstempel}.txt`;
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(objektUrl);
    }, 1000);
  }

  private erstelleExporttext(): string {
    const kopf = this.ermittleStatusfelder()
      .map((eintrag) => `${eintrag.bezeichnung}: ${eintrag.wert}`)
      .join("\n");

    const protokoll = this.optionen.protokollspeicher
      .alleEintraege()
      .map((eintrag) => {
        const details = eintrag.details ? ` | ${eintrag.details}` : "";
        return `[${eintrag.zeitstempel}] [${eintrag.bereich}] [${eintrag.ebene.toUpperCase()}] ${eintrag.nachricht}${details}`;
      })
      .join("\n");

    return `${this.optionen.titel ?? "Debug-Konsole"}\n\nStatus\n${kopf}\n\nProtokoll\n${protokoll}\n`;
  }

  private ermittleStatusfelder(): DebugFeld[] {
    const basisFelder: DebugFeld[] = [
      { bezeichnung: "Adresse", wert: window.location.href },
      { bezeichnung: "Sicherer Kontext", wert: formatiereBooleschenStatus(window.isSecureContext) },
      { bezeichnung: "Online", wert: formatiereBooleschenStatus(navigator.onLine) },
      { bezeichnung: "Sichtbarkeit", wert: document.visibilityState },
      { bezeichnung: "BroadcastChannel", wert: formatiereBooleschenStatus(typeof BroadcastChannel !== "undefined") },
      { bezeichnung: "localStorage", wert: pruefeLocalStorageVerfuegbarkeit() },
      {
        bezeichnung: "Mikrofon-API",
        wert: formatiereBooleschenStatus(Boolean(navigator.mediaDevices?.getUserMedia))
      },
      {
        bezeichnung: "WebRTC",
        wert: formatiereBooleschenStatus(typeof RTCPeerConnection !== "undefined")
      },
      {
        bezeichnung: "Audio-Ausgabe umschaltbar",
        wert: formatiereBooleschenStatus("setSinkId" in HTMLMediaElement.prototype)
      },
      { bezeichnung: "Browser", wert: navigator.userAgent }
    ];

    return [...basisFelder, ...(this.optionen.statusfelder?.() ?? [])];
  }
}
