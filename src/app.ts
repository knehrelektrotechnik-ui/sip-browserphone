import { BrowserSoftphoneDienst } from "./sip/browser-softphone-dienst";
import { DebugKonsole } from "./debug-konsole";
import {
  ermittleFesteStartkonfiguration,
  ermittleWiederholungsintervallMillisekunden,
  istAutomatischeStartverbindungAktiviert,
  istSoftphoneKonfigurationVollstaendig
} from "./feste-startkonfiguration";
import {
  browserUnterstuetztLautsprecherUmschaltung,
  ermittleAudioAusgabegeraete,
  pruefeMikrofonzugriff,
  pruefeSicherenKontext,
  pruefeWebSocketServerKonfiguration,
  setzeAudioAusgabegeraet
} from "./utils/diagnose";
import { Protokollspeicher } from "./utils/protokoll";
import {
  ermittleStandardKonfiguration,
  ladeGespeicherteKonfiguration,
  speichereKonfiguration
} from "./utils/speicher";
import {
  SOFTPHONE_TAB_KANAL,
  TabKommunikationsnachricht,
  browserUnterstuetztTabKommunikation
} from "./utils/tab-kommunikation";
import { formatiereGespraechsdauer } from "./utils/zeit";
import {
  DiagnoseErgebnis,
  ProtokollEintrag,
  SoftphoneKonfiguration,
  Statuszustand,
  VerfuegbaresAudioAusgabegeraet,
  erstelleInitialenStatuszustand
} from "./typen";

interface OberflaechenElemente {
  anmeldungFormular: HTMLFormElement;
  anzeigenameEingabe: HTMLInputElement;
  sipBenutzernameEingabe: HTMLInputElement;
  passwortEingabe: HTMLInputElement;
  sipDomainHostEingabe: HTMLInputElement;
  webSocketServerUrlEingabe: HTMLInputElement;
  stunServerUrlEingabe: HTMLInputElement;
  verbindenSchaltflaeche: HTMLButtonElement;
  trennenSchaltflaeche: HTMLButtonElement;
  diagnoseSchaltflaeche: HTMLButtonElement;
  rufnummerEingabe: HTMLInputElement;
  anrufenSchaltflaeche: HTMLButtonElement;
  annehmenSchaltflaeche: HTMLButtonElement;
  ablehnenSchaltflaeche: HTMLButtonElement;
  auflegenSchaltflaeche: HTMLButtonElement;
  stummSchaltflaeche: HTMLButtonElement;
  audioFreischaltenSchaltflaeche: HTMLButtonElement;
  lautsprecherAuswahl: HTMLSelectElement;
  lautsprecherHinweis: HTMLParagraphElement;
  fernAudioElement: HTMLAudioElement;
  diagnoseUebersicht: HTMLDivElement;
  protokollListe: HTMLDivElement;
  protokollLeerenSchaltflaeche: HTMLButtonElement;
  transportPlakette: HTMLSpanElement;
  registrierungPlakette: HTMLSpanElement;
  gespraechPlakette: HTMLSpanElement;
  aktiveLeitungWert: HTMLParagraphElement;
  gespraechsdauerWert: HTMLParagraphElement;
  registrierteAdresseWert: HTMLParagraphElement;
  aktuellesGespraechszielWert: HTMLParagraphElement;
  letzteFehlermeldungWert: HTMLParagraphElement;
}

function maskiereHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bildePlakettenart(text: string): string {
  if (text.includes("Fehler")) {
    return "plakette plakette--fehler";
  }

  if (text.includes("Registriert") || text.includes("Aktive Verbindung") || text === "Verbunden") {
    return "plakette plakette--erfolg";
  }

  if (text.includes("Eingehender") || text.includes("Ausgehender") || text.includes("aufgebaut")) {
    return "plakette plakette--warnung";
  }

  if (text.includes("Bereit")) {
    return "plakette plakette--aktiv";
  }

  return "plakette plakette--neutral";
}

export class BrowserSoftphoneAnwendung {
  private readonly protokollspeicher = new Protokollspeicher();
  private readonly elemente: OberflaechenElemente;
  private readonly debugKonsole: DebugKonsole;
  private softphoneDienst?: BrowserSoftphoneDienst;
  private tabKommunikationskanal?: BroadcastChannel;
  private automatischerVerbindungsversuchTimerId?: number;
  private automatischeWiederverbindungAktiv = false;
  private verbindungsversuchLaeuft = false;
  private letzteAutomatischeKonfiguration?: SoftphoneKonfiguration;
  private statuszustand: Statuszustand = erstelleInitialenStatuszustand();
  private diagnoseErgebnisse: DiagnoseErgebnis[] = [];
  private audioAusgabegeraete: VerfuegbaresAudioAusgabegeraet[] = [];
  private ausgewaehltesAudioAusgabegeraetId = "default";

  public constructor(private readonly wurzelElement: HTMLDivElement) {
    this.wurzelElement.innerHTML = this.erzeugeAnwendungsMarkup();
    this.elemente = this.ermittleElemente();
    this.debugKonsole = new DebugKonsole({
      protokollspeicher: this.protokollspeicher,
      titel: "Softphone Debug-Konsole",
      untertitel: "Live-Protokoll, Browserstatus und Verbindungsdaten fuer die Fehlersuche beim Kunden.",
      statusfelder: () => this.ermittleDebugStatusfelder()
    });
  }

  public starten(): void {
    const festeStartkonfiguration = ermittleFesteStartkonfiguration();
    const gespeicherteKonfiguration = ladeGespeicherteKonfiguration();
    const startkonfiguration = festeStartkonfiguration ?? gespeicherteKonfiguration;

    this.setzeFormularwerte(startkonfiguration);
    this.diagnoseErgebnisse = [pruefeSicherenKontext()];
    this.initialisiereTabKommunikation();
    this.bindeEreignisse();
    this.protokollspeicher.abonnieren(() => {
      this.renderProtokoll();
    });
    this.renderStatus();
    this.renderDiagnose();
    this.renderProtokoll();
    this.aktualisiereSchaltflaechenZustaende();
    this.debugKonsole.einbinden();
    void this.aktualisiereAudioAusgabegeraete();
    this.protokolliere("App", "Start der Anwendung.", "info");
    if (!this.diagnoseErgebnisse[0]?.erfolgreich) {
      this.protokolliere(
        "Diagnose",
        `${this.diagnoseErgebnisse[0].titel}: ${this.diagnoseErgebnisse[0].zusammenfassung}`,
        "fehler",
        this.diagnoseErgebnisse[0].details
      );
    }

    if (istAutomatischeStartverbindungAktiviert() && istSoftphoneKonfigurationVollstaendig(startkonfiguration)) {
      this.automatischeWiederverbindungAktiv = true;
      this.letzteAutomatischeKonfiguration = startkonfiguration;
      speichereKonfiguration(startkonfiguration);
      this.sendeKonfigurationAnAndereTabs(startkonfiguration);
      this.protokolliere("App", "Automatische Startverbindung ist aktiviert.", "info");
      void this.verbinden(true, startkonfiguration);
    }
  }

  private initialisiereTabKommunikation(): void {
    if (!browserUnterstuetztTabKommunikation()) {
      return;
    }

    this.tabKommunikationskanal = new BroadcastChannel(SOFTPHONE_TAB_KANAL);
    this.tabKommunikationskanal.addEventListener(
      "message",
      (ereignis: MessageEvent<TabKommunikationsnachricht>) => {
        if (ereignis.data?.typ !== "konfiguration-anfordern") {
          return;
        }

        const konfiguration = this.ermittleTeilbareKonfiguration();

        if (!konfiguration) {
          return;
        }

        this.tabKommunikationskanal?.postMessage({
          typ: "konfiguration-bereit",
          konfiguration
        } satisfies TabKommunikationsnachricht);
      }
    );
  }

  private ermittleTeilbareKonfiguration(): SoftphoneKonfiguration | undefined {
    const gespeicherteKonfiguration = ladeGespeicherteKonfiguration();

    if (
      gespeicherteKonfiguration.sipBenutzername.trim() &&
      gespeicherteKonfiguration.passwort &&
      gespeicherteKonfiguration.sipDomainHost.trim() &&
      gespeicherteKonfiguration.webSocketServerUrl.trim()
    ) {
      return gespeicherteKonfiguration;
    }

    if (!this.elemente.anmeldungFormular.checkValidity()) {
      return undefined;
    }

    const formularKonfiguration = this.liesKonfigurationAusFormular();

    if (
      !formularKonfiguration.sipBenutzername.trim() ||
      !formularKonfiguration.passwort ||
      !formularKonfiguration.sipDomainHost.trim() ||
      !formularKonfiguration.webSocketServerUrl.trim()
    ) {
      return undefined;
    }

    return formularKonfiguration;
  }

  private sendeKonfigurationAnAndereTabs(konfiguration: SoftphoneKonfiguration): void {
    this.tabKommunikationskanal?.postMessage({
      typ: "konfiguration-aktualisiert",
      konfiguration
    } satisfies TabKommunikationsnachricht);
  }

  private stoppeAutomatischeWiederverbindung(): void {
    if (this.automatischerVerbindungsversuchTimerId) {
      window.clearTimeout(this.automatischerVerbindungsversuchTimerId);
      this.automatischerVerbindungsversuchTimerId = undefined;
    }
  }

  private planeAutomatischeWiederverbindung(): void {
    if (!this.automatischeWiederverbindungAktiv || !this.letzteAutomatischeKonfiguration) {
      return;
    }

    this.stoppeAutomatischeWiederverbindung();

    const intervallMillisekunden = ermittleWiederholungsintervallMillisekunden();
    const intervallSekunden = Math.round(intervallMillisekunden / 1000);

    this.protokolliere(
      "App",
      `Automatischer Verbindungsversuch wird in ${intervallSekunden} Sekunden wiederholt.`,
      "warnung"
    );

    this.automatischerVerbindungsversuchTimerId = window.setTimeout(() => {
      this.automatischerVerbindungsversuchTimerId = undefined;

      if (!this.letzteAutomatischeKonfiguration) {
        return;
      }

      void this.verbinden(true, this.letzteAutomatischeKonfiguration);
    }, intervallMillisekunden);
  }

  private erzeugeAnwendungsMarkup(): string {
    return `
      <div class="seitenrahmen">
        <header class="kopfbereich">
          <div>
            <p class="ueberzeile">SIP.js Browser-Softphone</p>
            <h1 class="titel">Telefonie im Browser mit klarer Diagnose</h1>
            <p class="untertitel">
              Anmeldung, Registrierung, Waehlfeld, Gespraechssteuerung und ein sichtbarer Debug-Bereich
              fuer SIP-, WebSocket- und Audiofehler in einer kompakten Oberflaeche.
            </p>
          </div>
          <div class="signalgruppe">
            <article class="signalkarte">
              <p class="signalkarte__label">Transport</p>
              <p class="signalkarte__wert"><span id="transport-plakette" class="plakette plakette--neutral">Getrennt</span></p>
            </article>
            <article class="signalkarte">
              <p class="signalkarte__label">Registrierung</p>
              <p class="signalkarte__wert"><span id="registrierung-plakette" class="plakette plakette--neutral">Nicht registriert</span></p>
            </article>
            <article class="signalkarte">
              <p class="signalkarte__label">Gespraech</p>
              <p class="signalkarte__wert"><span id="gespraech-plakette" class="plakette plakette--aktiv">Bereit</span></p>
            </article>
          </div>
        </header>

        <main class="inhalt">
          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Anmeldung</h2>
                <p>SIP-Zugangsdaten und WebRTC-/WSS-Konfiguration fuer die Verbindung zur Telefonanlage.</p>
              </div>
            </div>

            <form id="anmeldung-form" autocomplete="on">
              <div class="formularraster">
                <div class="feldgruppe">
                  <label for="anzeigename">Anzeigename</label>
                  <input id="anzeigename" name="anzeigename" type="text" placeholder="z. B. Empfang Browser" />
                </div>

                <div class="feldgruppe">
                  <label for="sip-benutzername">SIP-Benutzername</label>
                  <input id="sip-benutzername" name="sip-benutzername" type="text" required placeholder="1001" />
                </div>

                <div class="feldgruppe">
                  <label for="passwort">Passwort</label>
                  <input id="passwort" name="passwort" type="password" required placeholder="SIP-Passwort" />
                </div>

                <div class="feldgruppe">
                  <label for="sip-domain-host">SIP-Domain / Host</label>
                  <input id="sip-domain-host" name="sip-domain-host" type="text" required placeholder="pbx.beispiel.de" />
                </div>

                <div class="feldgruppe feldgruppe--voll">
                  <label for="websocket-server-url">WebSocket-Server-URL</label>
                  <input
                    id="websocket-server-url"
                    name="websocket-server-url"
                    type="url"
                    required
                    placeholder="wss://pbx.beispiel.de:8089/ws"
                  />
                </div>

                <div class="feldgruppe feldgruppe--voll">
                  <label for="stun-server-url">STUN-Server (optional)</label>
                  <input
                    id="stun-server-url"
                    name="stun-server-url"
                    type="text"
                    placeholder="stun:stun.l.google.com:19302"
                  />
                  <p class="hinweistext">Wenn leer, verwendet SIP.js die Standardkonfiguration des Browsers bzw. der Bibliothek.</p>
                </div>
              </div>

              <div class="aktionsleiste">
                <button id="verbinden-schaltflaeche" type="button">Verbinden</button>
                <button id="trennen-schaltflaeche" type="button" class="sekundaer">Trennen</button>
                <button id="diagnose-schaltflaeche" type="button" class="sekundaer">Diagnose pruefen</button>
              </div>
            </form>
          </section>

          <div class="zwei-spalten">
            <section class="karte">
              <div class="kartenkopf">
                <div>
                  <h2>Status</h2>
                  <p>Aktuelle Zustaende fuer Registrierung, Verbindung und laufendes Gespraech.</p>
                </div>
              </div>

              <div class="statusraster">
                <article class="statusfeld">
                  <p class="statusfeld__label">Aktive Leitung</p>
                  <p id="aktive-leitung-wert" class="statusfeld__wert">Nein</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Gespraechsdauer</p>
                  <p id="gespraechsdauer-wert" class="statusfeld__wert">00:00</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Registrierte Adresse</p>
                  <p id="registrierte-adresse-wert" class="statusfeld__wert statusfeld__wert--normal">Noch nicht verbunden</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Aktuelles Gespraechsziel</p>
                  <p id="aktuelles-gespraechsziel-wert" class="statusfeld__wert statusfeld__wert--normal">Kein aktives Ziel</p>
                </article>
                <article class="statusfeld" style="grid-column: 1 / -1;">
                  <p class="statusfeld__label">Letzte Fehlermeldung</p>
                  <p id="letzte-fehlermeldung-wert" class="statusfeld__wert statusfeld__wert--normal">Keine Fehler gemeldet</p>
                </article>
              </div>
            </section>

            <section class="karte">
              <div class="kartenkopf">
                <div>
                  <h2>Waehlfeld und Steuerung</h2>
                  <p>Anrufe starten, eingehende Gespraeche steuern und Mikrofon stummschalten.</p>
                </div>
              </div>

              <div class="wahlzeile">
                <div class="feldgruppe">
                  <label for="rufnummer">Rufnummer oder SIP-Ziel</label>
                  <input id="rufnummer" name="rufnummer" type="text" placeholder="z. B. 1002 oder sip:1002@pbx.beispiel.de" />
                </div>
                <button id="anrufen-schaltflaeche" type="button">Anruf starten</button>
              </div>

              <div class="steuerleiste">
                <button id="annehmen-schaltflaeche" type="button">Annehmen</button>
                <button id="ablehnen-schaltflaeche" type="button" class="warnung">Ablehnen</button>
                <button id="auflegen-schaltflaeche" type="button" class="fehler">Auflegen</button>
                <button id="stumm-schaltflaeche" type="button" class="sekundaer">Stummschalten</button>
              </div>

              <div class="feldgruppe" style="margin-top: 18px;">
                <label for="lautsprecher-auswahl">Audio-Ausgabe / Lautsprecher</label>
                <select id="lautsprecher-auswahl"></select>
                <p id="lautsprecher-hinweis" class="hinweistext">Die Lautsprecherumschaltung wird geprueft.</p>
              </div>
            </section>
          </div>

          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Audio / Gegensprechen</h2>
                <p>Das Remote-Audio wird in diesem HTML-Audio-Element abgespielt. Einige Browser verlangen dafuer eine aktive Benutzerinteraktion.</p>
              </div>
              <button id="audio-freischalten-schaltflaeche" type="button" class="sekundaer">Audiowiedergabe freischalten</button>
            </div>

            <p class="audiohinweis">
              Nach Gespraechsstart oder Gespraechsannahme bindet SIP.js den per WebRTC ausgehandelten Remote-Medienstrom
              an dieses Audio-Element. Falls der Browser Autoplay blockiert, hilft die Freischaltung per Klick.
            </p>
            <audio id="fern-audio-element" class="audioelement" controls autoplay playsinline></audio>
          </section>

          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Debug / Diagnose</h2>
                <p>Zeitgestempelte Meldungen fuer Transport, Registrierung, Medienfreigabe und SIP-Ablaeufe.</p>
              </div>
            </div>

            <div id="diagnose-uebersicht" class="diagnoseraster"></div>

            <div class="protokollkopf">
              <strong>Protokoll</strong>
              <button id="protokoll-leeren-schaltflaeche" type="button" class="sekundaer">Protokoll leeren</button>
            </div>
            <div id="protokoll-liste" class="protokollliste"></div>
          </section>
        </main>
      </div>
    `;
  }

  private ermittleElemente(): OberflaechenElemente {
    const finde = <T extends Element>(selektor: string): T => {
      const element = this.wurzelElement.querySelector<T>(selektor);

      if (!element) {
        throw new Error(`Oberflaechenelement fehlt: ${selektor}`);
      }

      return element;
    };

    return {
      anmeldungFormular: finde<HTMLFormElement>("#anmeldung-form"),
      anzeigenameEingabe: finde<HTMLInputElement>("#anzeigename"),
      sipBenutzernameEingabe: finde<HTMLInputElement>("#sip-benutzername"),
      passwortEingabe: finde<HTMLInputElement>("#passwort"),
      sipDomainHostEingabe: finde<HTMLInputElement>("#sip-domain-host"),
      webSocketServerUrlEingabe: finde<HTMLInputElement>("#websocket-server-url"),
      stunServerUrlEingabe: finde<HTMLInputElement>("#stun-server-url"),
      verbindenSchaltflaeche: finde<HTMLButtonElement>("#verbinden-schaltflaeche"),
      trennenSchaltflaeche: finde<HTMLButtonElement>("#trennen-schaltflaeche"),
      diagnoseSchaltflaeche: finde<HTMLButtonElement>("#diagnose-schaltflaeche"),
      rufnummerEingabe: finde<HTMLInputElement>("#rufnummer"),
      anrufenSchaltflaeche: finde<HTMLButtonElement>("#anrufen-schaltflaeche"),
      annehmenSchaltflaeche: finde<HTMLButtonElement>("#annehmen-schaltflaeche"),
      ablehnenSchaltflaeche: finde<HTMLButtonElement>("#ablehnen-schaltflaeche"),
      auflegenSchaltflaeche: finde<HTMLButtonElement>("#auflegen-schaltflaeche"),
      stummSchaltflaeche: finde<HTMLButtonElement>("#stumm-schaltflaeche"),
      audioFreischaltenSchaltflaeche: finde<HTMLButtonElement>("#audio-freischalten-schaltflaeche"),
      lautsprecherAuswahl: finde<HTMLSelectElement>("#lautsprecher-auswahl"),
      lautsprecherHinweis: finde<HTMLParagraphElement>("#lautsprecher-hinweis"),
      fernAudioElement: finde<HTMLAudioElement>("#fern-audio-element"),
      diagnoseUebersicht: finde<HTMLDivElement>("#diagnose-uebersicht"),
      protokollListe: finde<HTMLDivElement>("#protokoll-liste"),
      protokollLeerenSchaltflaeche: finde<HTMLButtonElement>("#protokoll-leeren-schaltflaeche"),
      transportPlakette: finde<HTMLSpanElement>("#transport-plakette"),
      registrierungPlakette: finde<HTMLSpanElement>("#registrierung-plakette"),
      gespraechPlakette: finde<HTMLSpanElement>("#gespraech-plakette"),
      aktiveLeitungWert: finde<HTMLParagraphElement>("#aktive-leitung-wert"),
      gespraechsdauerWert: finde<HTMLParagraphElement>("#gespraechsdauer-wert"),
      registrierteAdresseWert: finde<HTMLParagraphElement>("#registrierte-adresse-wert"),
      aktuellesGespraechszielWert: finde<HTMLParagraphElement>("#aktuelles-gespraechsziel-wert"),
      letzteFehlermeldungWert: finde<HTMLParagraphElement>("#letzte-fehlermeldung-wert")
    };
  }

  private bindeEreignisse(): void {
    this.elemente.verbindenSchaltflaeche.addEventListener("click", () => {
      void this.verbinden();
    });

    this.elemente.trennenSchaltflaeche.addEventListener("click", () => {
      void this.trennen();
    });

    this.elemente.diagnoseSchaltflaeche.addEventListener("click", () => {
      void this.fuehreDiagnoseAus();
    });

    this.elemente.anrufenSchaltflaeche.addEventListener("click", () => {
      void this.starteAnruf();
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

    this.elemente.stummSchaltflaeche.addEventListener("click", () => {
      this.softphoneDienst?.schalteStummUm();
      if (this.softphoneDienst) {
        this.statuszustand = this.softphoneDienst.aktuellerStatus();
        this.renderStatus();
        this.aktualisiereSchaltflaechenZustaende();
      }
    });

    this.elemente.audioFreischaltenSchaltflaeche.addEventListener("click", () => {
      void this.versucheAudioFreizuschalten();
    });

    this.elemente.lautsprecherAuswahl.addEventListener("change", () => {
      void this.wechsleAudioAusgabegeraet();
    });

    this.elemente.protokollLeerenSchaltflaeche.addEventListener("click", () => {
      this.protokollspeicher.leeren();
      this.renderProtokoll();
      this.protokolliere("App", "Protokoll wurde geleert.", "info");
    });

    this.elemente.rufnummerEingabe.addEventListener("keydown", (ereignis) => {
      if (ereignis.key === "Enter") {
        ereignis.preventDefault();
        void this.starteAnruf();
      }
    });

    navigator.mediaDevices?.addEventListener?.("devicechange", () => {
      void this.aktualisiereAudioAusgabegeraete();
    });
  }

  private async verbinden(
    istAutomatischerStartversuch: boolean = false,
    vorhandeneKonfiguration?: SoftphoneKonfiguration
  ): Promise<void> {
    if (this.verbindungsversuchLaeuft) {
      return;
    }

    if (!vorhandeneKonfiguration && !this.elemente.anmeldungFormular.reportValidity()) {
      return;
    }

    const konfiguration = vorhandeneKonfiguration ?? this.liesKonfigurationAusFormular();
    this.verbindungsversuchLaeuft = true;
    this.stoppeAutomatischeWiederverbindung();
    this.letzteAutomatischeKonfiguration = konfiguration;
    speichereKonfiguration(konfiguration);
    this.sendeKonfigurationAnAndereTabs(konfiguration);
    this.protokolliere(
      "App",
      istAutomatischerStartversuch
        ? "Automatischer Verbindungsversuch wurde ausgeloest."
        : "Versuch der Verbindung wurde ausgeloest.",
      "info"
    );

    if (this.softphoneDienst) {
      await this.softphoneDienst.trennen(true);
    }

    this.softphoneDienst = new BrowserSoftphoneDienst(this.elemente.fernAudioElement, {
      protokolliere: (bereich, nachricht, ebene = "info", details) => {
        this.protokolliere(bereich, nachricht, ebene, details);
      },
      statusGeaendert: (zustand) => {
        this.statuszustand = zustand;
        this.renderStatus();
        this.aktualisiereSchaltflaechenZustaende();
      }
    });

    try {
      await this.softphoneDienst.verbindenUndRegistrieren(konfiguration);
      speichereKonfiguration(konfiguration);
      this.sendeKonfigurationAnAndereTabs(konfiguration);
      await this.aktualisiereAudioAusgabegeraete();
    } catch (fehler) {
      this.protokolliere(
        "App",
        "Die Verbindung konnte nicht vollstaendig aufgebaut werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Verbindungsfehler"
      );
      if (this.automatischeWiederverbindungAktiv) {
        this.planeAutomatischeWiederverbindung();
      }
    } finally {
      this.verbindungsversuchLaeuft = false;
    }
  }

  private async trennen(): Promise<void> {
    this.automatischeWiederverbindungAktiv = false;
    this.letzteAutomatischeKonfiguration = undefined;
    this.stoppeAutomatischeWiederverbindung();

    if (!this.softphoneDienst) {
      this.protokolliere("App", "Es besteht derzeit keine aktive SIP-Verbindung.", "warnung");
      return;
    }

    await this.softphoneDienst.trennen();
    this.softphoneDienst = undefined;
    this.protokolliere("App", "Verbindung wurde getrennt.", "info");
  }

  private async starteAnruf(): Promise<void> {
    const rufnummer = this.elemente.rufnummerEingabe.value.trim();

    if (!rufnummer) {
      this.protokolliere("App", "Bitte zuerst eine Rufnummer oder SIP-Adresse eingeben.", "warnung");
      this.elemente.rufnummerEingabe.focus();
      return;
    }

    if (!this.softphoneDienst) {
      this.protokolliere("App", "Vor dem Anruf muss zuerst eine SIP-Verbindung aufgebaut werden.", "warnung");
      return;
    }

    try {
      await this.softphoneDienst.starteAnruf(rufnummer);
    } catch (fehler) {
      this.protokolliere(
        "SIP",
        "Anruf konnte nicht gestartet werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async nehmeAnrufAn(): Promise<void> {
    if (!this.softphoneDienst) {
      this.protokolliere("App", "Es liegt kein steuerbarer Anruf vor.", "warnung");
      return;
    }

    try {
      await this.softphoneDienst.nehmeEingehendenAnrufAn();
    } catch (fehler) {
      this.protokolliere(
        "Audio",
        "Eingehender Anruf konnte nicht angenommen werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async lehneAnrufAb(): Promise<void> {
    if (!this.softphoneDienst) {
      this.protokolliere("App", "Es liegt kein eingehender Anruf vor.", "warnung");
      return;
    }

    try {
      await this.softphoneDienst.lehneEingehendenAnrufAb();
    } catch (fehler) {
      this.protokolliere(
        "SIP",
        "Eingehender Anruf konnte nicht abgelehnt werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async legeAuf(): Promise<void> {
    if (!this.softphoneDienst) {
      this.protokolliere("App", "Es gibt aktuell kein Gespräch zum Auflegen.", "warnung");
      return;
    }

    try {
      await this.softphoneDienst.legeAuf();
    } catch (fehler) {
      this.protokolliere(
        "SIP",
        "Gespräch konnte nicht beendet werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async fuehreDiagnoseAus(vorhandeneKonfiguration?: SoftphoneKonfiguration): Promise<void> {
    const konfiguration = vorhandeneKonfiguration ?? this.liesKonfigurationAusFormular();
    const sicherheitsErgebnis = pruefeSicherenKontext();
    const mikrofonErgebnis = await pruefeMikrofonzugriff();
    this.diagnoseErgebnisse = [sicherheitsErgebnis, mikrofonErgebnis];
    this.renderDiagnose();
    this.protokolliere("Diagnose", "Diagnosepruefung gestartet.", "info");

    for (const ergebnis of [sicherheitsErgebnis, mikrofonErgebnis]) {
      this.protokolliere(
        ergebnis.titel === "Mikrofon" ? "Audio" : "Diagnose",
        `${ergebnis.titel}: ${ergebnis.zusammenfassung}`,
        ergebnis.erfolgreich ? "erfolg" : "fehler",
        ergebnis.details
      );
    }

    if (!konfiguration.webSocketServerUrl.trim()) {
      this.protokolliere("Diagnose", "Fuer den separaten WebSocket-Test wird eine WebSocket-Server-URL benoetigt.", "warnung");
      this.elemente.webSocketServerUrlEingabe.focus();
      await this.aktualisiereAudioAusgabegeraete();
      return;
    }

    const webSocketErgebnis = await pruefeWebSocketServerKonfiguration({
      webSocketServerUrl: konfiguration.webSocketServerUrl
    });
    this.protokolliere(
      "Diagnose",
      `Separater WebSocket-Test: ${webSocketErgebnis.zusammenfassung}`,
      webSocketErgebnis.erfolgreich ? "erfolg" : "warnung",
      webSocketErgebnis.details
    );

    await this.aktualisiereAudioAusgabegeraete();
  }

  private async aktualisiereAudioAusgabegeraete(): Promise<void> {
    const lautsprecherUmschaltungMoeglich = browserUnterstuetztLautsprecherUmschaltung(
      this.elemente.fernAudioElement
    );

    if (!lautsprecherUmschaltungMoeglich) {
      this.audioAusgabegeraete = [];
      this.elemente.lautsprecherAuswahl.innerHTML =
        '<option value="nicht-verfuegbar">Nicht vom Browser unterstützt</option>';
      this.elemente.lautsprecherAuswahl.disabled = true;
      this.elemente.lautsprecherHinweis.textContent =
        "Dieser Browser erlaubt keine direkte Umschaltung der Audio-Ausgabe. Meist ist dafür HTTPS und setSinkId-Unterstützung erforderlich.";
      return;
    }

    this.audioAusgabegeraete = await ermittleAudioAusgabegeraete();
    this.elemente.lautsprecherAuswahl.disabled = false;
    this.elemente.lautsprecherHinweis.textContent =
      "Wenn mehrere Ausgabegeräte sichtbar sind, kann das Remote-Audio direkt auf einen Lautsprecher gelegt werden.";

    const optionen = [
      '<option value="default">Standardausgabe des Browsers</option>',
      ...this.audioAusgabegeraete.map(
        (geraet) =>
          `<option value="${maskiereHtml(geraet.geraeteId)}">${maskiereHtml(geraet.bezeichnung)}</option>`
      )
    ];

    this.elemente.lautsprecherAuswahl.innerHTML = optionen.join("");
    this.elemente.lautsprecherAuswahl.value = this.ausgewaehltesAudioAusgabegeraetId;
  }

  private async wechsleAudioAusgabegeraet(): Promise<void> {
    const geraeteId = this.elemente.lautsprecherAuswahl.value;

    try {
      if (geraeteId === "default") {
        await setzeAudioAusgabegeraet(this.elemente.fernAudioElement, "default");
        this.ausgewaehltesAudioAusgabegeraetId = "default";
        this.protokolliere("Audio", "Standard-Audioausgabe wurde ausgewählt.", "erfolg");
        return;
      }

      await setzeAudioAusgabegeraet(this.elemente.fernAudioElement, geraeteId);
      this.ausgewaehltesAudioAusgabegeraetId = geraeteId;
      this.protokolliere("Audio", "Audio-Ausgabegerät wurde umgeschaltet.", "erfolg", geraeteId);
    } catch (fehler) {
      this.protokolliere(
        "Audio",
        "Audio-Ausgabegerät konnte nicht gesetzt werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private async versucheAudioFreizuschalten(): Promise<void> {
    try {
      if (!this.elemente.fernAudioElement.srcObject) {
        this.protokolliere(
          "Audio",
          "Audiowiedergabe wurde voraktiviert. Ein aktiver Remote-Stream liegt noch nicht an.",
          "info"
        );
        return;
      }

      await this.elemente.fernAudioElement.play();
      this.protokolliere("Audio", "Remote-Audio wurde manuell gestartet.", "erfolg");
    } catch (fehler) {
      this.protokolliere(
        "Audio",
        "Remote-Audio konnte nicht freigeschaltet werden.",
        "fehler",
        fehler instanceof Error ? fehler.message : "Unbekannter Fehler"
      );
    }
  }

  private renderStatus(): void {
    this.renderPlakette(this.elemente.transportPlakette, this.statuszustand.transportstatus);
    this.renderPlakette(this.elemente.registrierungPlakette, this.statuszustand.registrierungsstatus);
    this.renderPlakette(this.elemente.gespraechPlakette, this.statuszustand.gespraechsstatus);

    this.elemente.aktiveLeitungWert.textContent = this.statuszustand.aktiveVerbindung ? "Ja" : "Nein";
    this.elemente.gespraechsdauerWert.textContent = formatiereGespraechsdauer(
      this.statuszustand.gespraechsdauerSekunden
    );
    this.elemente.registrierteAdresseWert.textContent =
      this.statuszustand.registrierteAdresse || "Noch nicht verbunden";
    this.elemente.aktuellesGespraechszielWert.textContent =
      this.statuszustand.aktuellesGespraechsziel || "Kein aktives Ziel";
    this.elemente.letzteFehlermeldungWert.textContent =
      this.statuszustand.letzteFehlermeldung || "Keine Fehler gemeldet";
  }

  private renderDiagnose(): void {
    if (this.diagnoseErgebnisse.length === 0) {
      this.elemente.diagnoseUebersicht.innerHTML = `
        <article class="diagnosekarte">
          <h3>Noch keine Diagnose</h3>
          <p>Die Diagnose erscheint nach einem Klick auf "Diagnose pruefen".</p>
          <p class="diagnosekarte__details">Die Karten zeigen nur den aktuellen Sicherheits- und Mikrofonzustand der Seite.</p>
        </article>
      `;
      return;
    }

    this.elemente.diagnoseUebersicht.innerHTML = this.diagnoseErgebnisse
      .map((ergebnis) => {
        const plakettenklasse = ergebnis.erfolgreich ? "plakette plakette--erfolg" : "plakette plakette--fehler";
        return `
          <article class="diagnosekarte">
            <div class="protokolleintrag__kopf">
              <h3>${maskiereHtml(ergebnis.titel)}</h3>
              <span class="${plakettenklasse}">${ergebnis.erfolgreich ? "OK" : "Fehler"}</span>
            </div>
            <p>${maskiereHtml(ergebnis.zusammenfassung)}</p>
            <p class="diagnosekarte__details">${maskiereHtml(ergebnis.details ?? "Keine zusätzlichen Details.")}</p>
          </article>
        `;
      })
      .join("");
  }

  private renderProtokoll(): void {
    const eintraege = this.protokollspeicher.alleEintraege();

    if (eintraege.length === 0) {
      this.elemente.protokollListe.innerHTML =
        '<div class="protokolleer">Noch keine Protokolleinträge vorhanden.</div>';
      return;
    }

    this.elemente.protokollListe.innerHTML = eintraege
      .map((eintrag) => this.erzeugeProtokolleintragMarkup(eintrag))
      .join("");
  }

  private erzeugeProtokolleintragMarkup(eintrag: ProtokollEintrag): string {
    const plakettenklasse =
      eintrag.ebene === "erfolg"
        ? "plakette plakette--erfolg"
        : eintrag.ebene === "warnung"
          ? "plakette plakette--warnung"
          : eintrag.ebene === "fehler"
            ? "plakette plakette--fehler"
            : "plakette plakette--neutral";

    return `
      <article class="protokolleintrag">
        <div class="protokolleintrag__kopf">
          <span class="protokolleintrag__zeit">${maskiereHtml(eintrag.zeitstempel)}</span>
          <span class="protokolleintrag__bereich">${maskiereHtml(eintrag.bereich)}</span>
          <span class="${plakettenklasse}">${maskiereHtml(eintrag.ebene.toUpperCase())}</span>
        </div>
        <p class="protokolleintrag__text">${maskiereHtml(eintrag.nachricht)}</p>
        ${
          eintrag.details
            ? `<p class="protokolleintrag__details">${maskiereHtml(eintrag.details)}</p>`
            : ""
        }
      </article>
    `;
  }

  private renderPlakette(element: HTMLSpanElement, text: string): void {
    element.className = bildePlakettenart(text);
    element.textContent = text;
  }

  private aktualisiereSchaltflaechenZustaende(): void {
    const istVerbundenOderImAufbau =
      this.statuszustand.transportstatus === "Verbunden" ||
      this.statuszustand.transportstatus === "Verbindung wird aufgebaut";
    const registriert = this.statuszustand.registrierungsstatus === "Registriert";
    const aktivesOderLaufendesGespraech =
      this.statuszustand.aktiveVerbindung ||
      this.statuszustand.ausgehenderAnruf ||
      this.statuszustand.eingehenderAnruf;

    this.elemente.verbindenSchaltflaeche.disabled = istVerbundenOderImAufbau;
    this.elemente.trennenSchaltflaeche.disabled = !this.softphoneDienst && !istVerbundenOderImAufbau;
    this.elemente.anrufenSchaltflaeche.disabled = !registriert || aktivesOderLaufendesGespraech;
    this.elemente.annehmenSchaltflaeche.disabled = !this.statuszustand.eingehenderAnruf;
    this.elemente.ablehnenSchaltflaeche.disabled = !this.statuszustand.eingehenderAnruf;
    this.elemente.auflegenSchaltflaeche.disabled =
      !this.statuszustand.aktiveVerbindung && !this.statuszustand.ausgehenderAnruf;
    this.elemente.stummSchaltflaeche.disabled = !this.statuszustand.aktiveVerbindung;
    this.elemente.stummSchaltflaeche.textContent = this.statuszustand.stummgeschaltet
      ? "Stummschaltung aufheben"
      : "Stummschalten";
  }

  private liesKonfigurationAusFormular(): SoftphoneKonfiguration {
    return {
      anzeigename: this.elemente.anzeigenameEingabe.value.trim(),
      sipBenutzername: this.elemente.sipBenutzernameEingabe.value.trim(),
      passwort: this.elemente.passwortEingabe.value,
      sipDomainHost: this.elemente.sipDomainHostEingabe.value.trim(),
      webSocketServerUrl: this.elemente.webSocketServerUrlEingabe.value.trim(),
      stunServerUrl: this.elemente.stunServerUrlEingabe.value.trim() || undefined
    };
  }

  private setzeFormularwerte(konfiguration: SoftphoneKonfiguration): void {
    const basis = {
      ...ermittleStandardKonfiguration(),
      ...konfiguration
    };

    this.elemente.anzeigenameEingabe.value = basis.anzeigename;
    this.elemente.sipBenutzernameEingabe.value = basis.sipBenutzername;
    this.elemente.passwortEingabe.value = basis.passwort;
    this.elemente.sipDomainHostEingabe.value = basis.sipDomainHost;
    this.elemente.webSocketServerUrlEingabe.value = basis.webSocketServerUrl;
    this.elemente.stunServerUrlEingabe.value = basis.stunServerUrl ?? "";
  }

  private protokolliere(
    bereich: ProtokollEintrag["bereich"],
    nachricht: string,
    ebene: ProtokollEintrag["ebene"] = "info",
    details?: string
  ): void {
    this.protokollspeicher.hinzufuegen(bereich, nachricht, ebene, details);
  }

  private ermittleDebugStatusfelder(): Array<{ bezeichnung: string; wert: string }> {
    const konfiguration = this.liesKonfigurationAusFormular();

    return [
      { bezeichnung: "Build-Modus", wert: import.meta.env.MODE },
      { bezeichnung: "Transport", wert: this.statuszustand.transportstatus },
      { bezeichnung: "Registrierung", wert: this.statuszustand.registrierungsstatus },
      { bezeichnung: "Gespraech", wert: this.statuszustand.gespraechsstatus },
      { bezeichnung: "Aktive Verbindung", wert: this.statuszustand.aktiveVerbindung ? "Ja" : "Nein" },
      { bezeichnung: "Stummgeschaltet", wert: this.statuszustand.stummgeschaltet ? "Ja" : "Nein" },
      { bezeichnung: "SIP-Benutzer", wert: konfiguration.sipBenutzername || "Nicht gesetzt" },
      { bezeichnung: "SIP-Domain", wert: konfiguration.sipDomainHost || "Nicht gesetzt" },
      { bezeichnung: "WSS-URL", wert: konfiguration.webSocketServerUrl || "Nicht gesetzt" },
      { bezeichnung: "STUN", wert: konfiguration.stunServerUrl || "Nicht gesetzt" },
      {
        bezeichnung: "Aktuelles Ziel",
        wert: this.statuszustand.aktuellesGespraechsziel || this.elemente.rufnummerEingabe.value.trim() || "Keins"
      }
    ];
  }
}
