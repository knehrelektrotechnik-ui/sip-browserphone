import { BrowserSoftphoneDienst } from "./sip/browser-softphone-dienst";
import { DebugKonsole } from "./debug-konsole";
import { holeLaufzeitkonfiguration } from "./laufzeitkonfiguration";
import { pruefeSicherenKontext } from "./utils/diagnose";
import { Protokollspeicher } from "./utils/protokoll";
import {
  KONFIGURATIONSSCHLUESSEL,
  ladeGespeicherteKonfiguration,
  speichereKonfiguration
} from "./utils/speicher";
import {
  SOFTPHONE_TAB_KANAL,
  TabKommunikationsnachricht,
  browserUnterstuetztTabKommunikation,
  istVollstaendigeSoftphoneKonfiguration
} from "./utils/tab-kommunikation";
import { formatiereGespraechsdauer } from "./utils/zeit";
import {
  ProtokollEintrag,
  SoftphoneKonfiguration,
  Statuszustand,
  erstelleInitialenStatuszustand
} from "./typen";

interface DashboardElemente {
  steuerung: HTMLDivElement;
  festeRufnummerSchaltflaeche: HTMLButtonElement;
  annehmenSchaltflaeche: HTMLButtonElement;
  ablehnenSchaltflaeche: HTMLButtonElement;
  auflegenSchaltflaeche: HTMLButtonElement;
  gespraechsdauerWert: HTMLSpanElement;
  statusHinweis: HTMLParagraphElement;
  fernAudioElement: HTMLAudioElement;
}

function maskiereHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ermittleFesteRufnummer(): string {
  const parameterWert = new URLSearchParams(window.location.search).get("ziel")?.trim();
  return parameterWert || holeLaufzeitkonfiguration().dashboard.standardRufnummer || "200";
}

function istKonfigurationVollstaendig(konfiguration: SoftphoneKonfiguration): boolean {
  return Boolean(
    konfiguration.sipBenutzername.trim() &&
      konfiguration.passwort &&
      konfiguration.sipDomainHost.trim() &&
      konfiguration.webSocketServerUrl.trim()
  );
}

function normalisiereStatusKennung(status: string): string {
  return status
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export class DashboardSteuerungAnwendung {
  private readonly elemente: DashboardElemente;
  private readonly festeRufnummer = ermittleFesteRufnummer();
  private readonly protokollspeicher = new Protokollspeicher();
  private readonly debugKonsole: DebugKonsole;
  private softphoneDienst?: BrowserSoftphoneDienst;
  private tabKommunikationskanal?: BroadcastChannel;
  private statuszustand: Statuszustand = erstelleInitialenStatuszustand();
  private bedienhinweis = "Die Dashboard-Steuerung wird vorbereitet.";
  private verbindungWirdAufgebaut = false;
  private hatVollstaendigeKonfiguration = false;

  public constructor(private readonly wurzelElement: HTMLDivElement) {
    this.wurzelElement.innerHTML = this.erzeugeAnwendungsMarkup();
    this.elemente = this.ermittleElemente();
    this.debugKonsole = new DebugKonsole({
      protokollspeicher: this.protokollspeicher,
      titel: "Dashboard Debug-Konsole",
      untertitel: "Diagnose fuer die eingebettete Dashboard-Steuerung inkl. SIP-Status und Browserumgebung.",
      statusfelder: () => this.ermittleDebugStatusfelder()
    });
  }

  public starten(): void {
    this.bindeEreignisse();
    this.initialisiereTabKommunikation();
    this.aktualisiereKonfigurationsstatus();
    this.renderSteuerung();
    this.debugKonsole.einbinden();
    void this.starteAutomatischeVerbindung();
  }

  private erzeugeAnwendungsMarkup(): string {
    return `
      <div id="dashboard-steuerung" class="dashboard-steuerung" data-transportstatus="getrennt">
        <button
          id="dashboard-rufnummer-schaltflaeche"
          type="button"
          class="dashboard-steuerung__aktion dashboard-steuerung__aktion--direktruf"
        >
          ${maskiereHtml(this.festeRufnummer)} anrufen
        </button>
        <button
          id="dashboard-annehmen-schaltflaeche"
          type="button"
          class="dashboard-steuerung__aktion"
        >
          Annehmen
        </button>
        <button
          id="dashboard-ablehnen-schaltflaeche"
          type="button"
          class="dashboard-steuerung__aktion warnung"
        >
          Ablehnen
        </button>
        <button
          id="dashboard-auflegen-schaltflaeche"
          type="button"
          class="dashboard-steuerung__aktion fehler"
        >
          Auflegen
        </button>
        <div class="dashboard-steuerung__dauer" aria-live="polite">
          <span class="dashboard-steuerung__dauer-label">Gespraechsdauer</span>
          <strong id="dashboard-gespraechsdauer">00:00</strong>
        </div>
        <p id="dashboard-statushinweis" class="dashboard-steuerung__hinweis" aria-live="polite"></p>
        <audio id="dashboard-fern-audio" class="dashboard-steuerung__audio" autoplay playsinline></audio>
      </div>
    `;
  }

  private ermittleElemente(): DashboardElemente {
    const finde = <T extends Element>(selektor: string): T => {
      const element = this.wurzelElement.querySelector<T>(selektor);

      if (!element) {
        throw new Error(`Oberflaechenelement fehlt: ${selektor}`);
      }

      return element;
    };

    return {
      steuerung: finde<HTMLDivElement>("#dashboard-steuerung"),
      festeRufnummerSchaltflaeche: finde<HTMLButtonElement>("#dashboard-rufnummer-schaltflaeche"),
      annehmenSchaltflaeche: finde<HTMLButtonElement>("#dashboard-annehmen-schaltflaeche"),
      ablehnenSchaltflaeche: finde<HTMLButtonElement>("#dashboard-ablehnen-schaltflaeche"),
      auflegenSchaltflaeche: finde<HTMLButtonElement>("#dashboard-auflegen-schaltflaeche"),
      gespraechsdauerWert: finde<HTMLSpanElement>("#dashboard-gespraechsdauer"),
      statusHinweis: finde<HTMLParagraphElement>("#dashboard-statushinweis"),
      fernAudioElement: finde<HTMLAudioElement>("#dashboard-fern-audio")
    };
  }

  private bindeEreignisse(): void {
    this.elemente.festeRufnummerSchaltflaeche.addEventListener("click", () => {
      void this.starteDirektruf();
    });

    this.elemente.annehmenSchaltflaeche.addEventListener("click", () => {
      void this.nehmeAnrufAn();
    });

    this.elemente.ablehnenSchaltflaeche.addEventListener("click", () => {
      void this.lehneAnrufAb();
    });

    this.elemente.auflegenSchaltflaeche.addEventListener("click", () => {
      void this.legeAuf();
    });

    window.addEventListener("pagehide", () => {
      if (!this.softphoneDienst) {
        return;
      }

      void this.softphoneDienst.trennen(true);
    });

    window.addEventListener("storage", (ereignis) => {
      if (ereignis.key !== KONFIGURATIONSSCHLUESSEL) {
        return;
      }

      this.protokolliere("Gespeicherte SIP-Konfiguration wurde aktualisiert. Dashboard prueft die Verbindung neu.");
      this.reagiereAufKonfigurationsaenderung();
    });

    window.addEventListener("focus", () => {
      this.reagiereAufKonfigurationsaenderung();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      this.reagiereAufKonfigurationsaenderung();
    });
  }

  private initialisiereTabKommunikation(): void {
    if (!browserUnterstuetztTabKommunikation()) {
      return;
    }

    this.tabKommunikationskanal = new BroadcastChannel(SOFTPHONE_TAB_KANAL);
    this.tabKommunikationskanal.addEventListener(
      "message",
      (ereignis: MessageEvent<TabKommunikationsnachricht>) => {
        const nachricht = ereignis.data;

        if (
          (nachricht?.typ !== "konfiguration-bereit" && nachricht?.typ !== "konfiguration-aktualisiert") ||
          !istVollstaendigeSoftphoneKonfiguration(nachricht.konfiguration)
        ) {
          return;
        }

        speichereKonfiguration(nachricht.konfiguration);
        this.protokolliere("SIP-Konfiguration wurde aus einem anderen App-Tab uebernommen.");
        this.reagiereAufKonfigurationsaenderung();
      }
    );
  }

  private fordereKonfigurationAusAnderenTabsAn(): void {
    this.tabKommunikationskanal?.postMessage({
      typ: "konfiguration-anfordern"
    } satisfies TabKommunikationsnachricht);
  }

  private aktualisiereKonfigurationsstatus(): SoftphoneKonfiguration | undefined {
    const konfiguration = ladeGespeicherteKonfiguration();
    this.hatVollstaendigeKonfiguration = istKonfigurationVollstaendig(konfiguration);
    return this.hatVollstaendigeKonfiguration ? konfiguration : undefined;
  }

  private holeOderErzeugeSoftphoneDienst(): BrowserSoftphoneDienst {
    if (this.softphoneDienst) {
      return this.softphoneDienst;
    }

    this.softphoneDienst = new BrowserSoftphoneDienst(this.elemente.fernAudioElement, {
      protokolliere: (bereich, nachricht, ebene = "info", details) => {
        this.protokolliere(nachricht, details, ebene, bereich);
      },
      statusGeaendert: (zustand) => {
        this.statuszustand = zustand;
        this.renderSteuerung();
      }
    });

    return this.softphoneDienst;
  }

  private reagiereAufKonfigurationsaenderung(): void {
    const hatteVorherKonfiguration = this.hatVollstaendigeKonfiguration;
    const konfiguration = this.aktualisiereKonfigurationsstatus();

    if (!konfiguration) {
      if (hatteVorherKonfiguration) {
        this.setzeBedienhinweis(
          "Die gespeicherte SIP-Konfiguration ist nicht mehr vollstaendig. Bitte die Hauptanwendung erneut verbinden."
        );
      } else {
        this.fordereKonfigurationAusAnderenTabsAn();
        this.renderSteuerung();
      }
      return;
    }

    if (this.statuszustand.registrierungsstatus === "Registriert" || this.verbindungWirdAufgebaut) {
      this.renderSteuerung();
      return;
    }

    void this.starteAutomatischeVerbindung();
  }

  private async stelleSicherDassVerbunden(): Promise<boolean> {
    if (this.statuszustand.registrierungsstatus === "Registriert") {
      return true;
    }

    if (this.verbindungWirdAufgebaut) {
      this.setzeBedienhinweis("SIP-Verbindung wird bereits aufgebaut.");
      return false;
    }

    const konfiguration = this.aktualisiereKonfigurationsstatus();

    if (!konfiguration) {
      const hinweis =
        "Es wurde noch keine gespeicherte SIP-Konfiguration gefunden. Bitte die Hauptanwendung zuerst ueber https://localhost:5173 oeffnen und dort verbinden.";
      this.setzeBedienhinweis(hinweis);
      this.protokolliere(hinweis);
      return false;
    }

    const sicherheitsErgebnis = pruefeSicherenKontext();

    if (!sicherheitsErgebnis.erfolgreich) {
      this.protokolliere(
        `Warnung zum sicheren Kontext: ${sicherheitsErgebnis.zusammenfassung}`,
        sicherheitsErgebnis.details
      );
    }

    this.verbindungWirdAufgebaut = true;
    this.setzeBedienhinweis("SIP-Verbindung wird automatisch aufgebaut.");

    try {
      const softphoneDienst = this.holeOderErzeugeSoftphoneDienst();
      await softphoneDienst.verbindenUndRegistrieren(konfiguration);
      this.setzeBedienhinweis("Dashboard-Steuerung ist verbunden.");
      return true;
    } catch (fehler) {
      const details = fehler instanceof Error ? fehler.message : "Unbekannter Verbindungsfehler";
      this.setzeBedienhinweis("Die Dashboard-Steuerung konnte keine SIP-Verbindung aufbauen.");
      this.protokolliere("Automatische SIP-Verbindung fehlgeschlagen.", details);
      return false;
    } finally {
      this.verbindungWirdAufgebaut = false;
      this.renderSteuerung();
    }
  }

  private async starteAutomatischeVerbindung(): Promise<void> {
    if (!this.aktualisiereKonfigurationsstatus()) {
      this.setzeBedienhinweis(
        "Es wurde noch keine vollstaendige SIP-Konfiguration gefunden. Dashboard fragt die Hauptanwendung nach den Daten."
      );
      this.protokolliere("Automatische SIP-Verbindung uebersprungen, weil keine gespeicherte Konfiguration vorhanden ist.");
      this.fordereKonfigurationAusAnderenTabsAn();
      return;
    }

    await this.stelleSicherDassVerbunden();
  }

  private async starteDirektruf(): Promise<void> {
    const istVerbunden = await this.stelleSicherDassVerbunden();

    if (!istVerbunden || !this.softphoneDienst) {
      this.protokolliere("Direktruf ist noch nicht verfuegbar, weil keine SIP-Verbindung besteht.");
      return;
    }

    try {
      await this.softphoneDienst.starteAnruf(this.festeRufnummer);
    } catch (fehler) {
      this.protokolliere(
        "Der Direktruf konnte nicht gestartet werden.",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async nehmeAnrufAn(): Promise<void> {
    if (!this.softphoneDienst) {
      return;
    }

    try {
      await this.softphoneDienst.nehmeEingehendenAnrufAn();
    } catch (fehler) {
      this.protokolliere(
        "Der eingehende Anruf konnte nicht angenommen werden.",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async lehneAnrufAb(): Promise<void> {
    if (!this.softphoneDienst) {
      return;
    }

    try {
      await this.softphoneDienst.lehneEingehendenAnrufAb();
    } catch (fehler) {
      this.protokolliere(
        "Der eingehende Anruf konnte nicht abgelehnt werden.",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async legeAuf(): Promise<void> {
    if (!this.softphoneDienst) {
      return;
    }

    try {
      await this.softphoneDienst.legeAuf();
    } catch (fehler) {
      this.protokolliere(
        "Das Gespraech konnte nicht beendet werden.",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private renderSteuerung(): void {
    this.aktualisiereKonfigurationsstatus();

    const transportstatus = this.statuszustand.transportstatus;
    const istRegistriert = this.statuszustand.registrierungsstatus === "Registriert";
    const hatEingehendenAnruf = this.statuszustand.eingehenderAnruf;
    const kannDirektrufStarten =
      !this.verbindungWirdAufgebaut &&
      this.hatVollstaendigeKonfiguration &&
      !this.statuszustand.aktiveVerbindung &&
      !this.statuszustand.ausgehenderAnruf &&
      !hatEingehendenAnruf;
    const kannAuflegen =
      this.statuszustand.aktiveVerbindung ||
      this.statuszustand.ausgehenderAnruf ||
      this.statuszustand.gespraechsstatus === "Gespraech wird beendet";

    this.elemente.steuerung.dataset.transportstatus = normalisiereStatusKennung(transportstatus);
    this.elemente.steuerung.title = this.erstelleTiteltext();
    this.elemente.gespraechsdauerWert.textContent = formatiereGespraechsdauer(
      this.statuszustand.gespraechsdauerSekunden
    );

    this.elemente.festeRufnummerSchaltflaeche.disabled = !kannDirektrufStarten;
    this.elemente.annehmenSchaltflaeche.disabled = !hatEingehendenAnruf;
    this.elemente.ablehnenSchaltflaeche.disabled = !hatEingehendenAnruf;
    this.elemente.auflegenSchaltflaeche.disabled = !kannAuflegen;

    if (!this.hatVollstaendigeKonfiguration) {
      this.elemente.festeRufnummerSchaltflaeche.textContent = "SIP-Konfiguration fehlt";
    } else if (this.verbindungWirdAufgebaut && !istRegistriert) {
      this.elemente.festeRufnummerSchaltflaeche.textContent = "Verbinde...";
    } else {
      this.elemente.festeRufnummerSchaltflaeche.textContent = `${this.festeRufnummer} anrufen`;
    }

    const hinweis = this.erstelleTiteltext();
    this.elemente.festeRufnummerSchaltflaeche.title = hinweis;
    this.elemente.annehmenSchaltflaeche.title = hinweis;
    this.elemente.ablehnenSchaltflaeche.title = hinweis;
    this.elemente.auflegenSchaltflaeche.title = hinweis;
    this.elemente.statusHinweis.textContent = this.erstelleSichtbarenHinweis();
    this.elemente.statusHinweis.dataset.hinweisart = this.ermittleHinweisart();
  }

  private erstelleSichtbarenHinweis(): string {
    if (this.statuszustand.letzteFehlermeldung) {
      return this.statuszustand.letzteFehlermeldung;
    }

    if (!this.hatVollstaendigeKonfiguration) {
      return "SIP-Konfiguration fehlt noch. Falls die Hauptanwendung bereits offen ist, wird die Konfiguration automatisch aus dem anderen Tab angefragt.";
    }

    if (this.verbindungWirdAufgebaut) {
      return "SIP-Verbindung wird aufgebaut.";
    }

    if (this.statuszustand.eingehenderAnruf) {
      return "Eingehender Anruf liegt an.";
    }

    if (this.statuszustand.aktiveVerbindung) {
      return "Gespraech aktiv.";
    }

    if (this.statuszustand.registrierungsstatus === "Registriert") {
      return "Verbunden und bereit.";
    }

    return this.bedienhinweis;
  }

  private ermittleHinweisart(): "fehler" | "warnung" | "info" | "erfolg" {
    if (this.statuszustand.letzteFehlermeldung || !this.hatVollstaendigeKonfiguration) {
      return "fehler";
    }

    if (this.verbindungWirdAufgebaut || this.statuszustand.eingehenderAnruf) {
      return "warnung";
    }

    if (this.statuszustand.registrierungsstatus === "Registriert") {
      return "erfolg";
    }

    return "info";
  }

  private erstelleTiteltext(): string {
    const teile = [
      `Transport: ${this.statuszustand.transportstatus}`,
      `Registrierung: ${this.statuszustand.registrierungsstatus}`,
      `Gespraech: ${this.statuszustand.gespraechsstatus}`
    ];

    if (this.statuszustand.letzteFehlermeldung) {
      teile.push(`Letzter Fehler: ${this.statuszustand.letzteFehlermeldung}`);
    } else if (this.bedienhinweis) {
      teile.push(this.bedienhinweis);
    }

    return teile.join(" | ");
  }

  private setzeBedienhinweis(hinweis: string): void {
    this.bedienhinweis = hinweis;
    this.renderSteuerung();
  }

  private protokolliere(
    nachricht: string,
    details?: string,
    ebene: ProtokollEintrag["ebene"] = "info",
    bereich: ProtokollEintrag["bereich"] = "Dashboard"
  ): void {
    const zeitstempel = new Date().toLocaleTimeString("de-DE");
    const praefix = `[Dashboard ${zeitstempel}] ${nachricht}`;
    this.protokollspeicher.hinzufuegen(bereich, nachricht, ebene, details);

    if (details) {
      console.info(praefix, details);
      return;
    }

    console.info(praefix);
  }

  private ermittleDebugStatusfelder(): Array<{ bezeichnung: string; wert: string }> {
    const konfiguration = ladeGespeicherteKonfiguration();

    return [
      { bezeichnung: "Build-Modus", wert: import.meta.env.MODE },
      { bezeichnung: "Transport", wert: this.statuszustand.transportstatus },
      { bezeichnung: "Registrierung", wert: this.statuszustand.registrierungsstatus },
      { bezeichnung: "Gespraech", wert: this.statuszustand.gespraechsstatus },
      { bezeichnung: "Feste Rufnummer", wert: this.festeRufnummer },
      { bezeichnung: "Konfiguration vorhanden", wert: this.hatVollstaendigeKonfiguration ? "Ja" : "Nein" },
      { bezeichnung: "SIP-Benutzer", wert: konfiguration.sipBenutzername || "Nicht gesetzt" },
      { bezeichnung: "SIP-Domain", wert: konfiguration.sipDomainHost || "Nicht gesetzt" },
      { bezeichnung: "WSS-URL", wert: konfiguration.webSocketServerUrl || "Nicht gesetzt" },
      { bezeichnung: "Aktuelle Fehlermeldung", wert: this.statuszustand.letzteFehlermeldung || "Keine" }
    ];
  }
}
