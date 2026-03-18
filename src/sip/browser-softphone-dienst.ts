import { Web } from "sip.js";
import { formatiereMedienfehler } from "../utils/diagnose";
import {
  SoftphoneKonfiguration,
  SoftphoneEreignisse,
  Statuszustand,
  erstelleInitialenStatuszustand
} from "../typen";

interface SipAntwort {
  message: {
    statusCode?: number;
    reasonPhrase?: string;
  };
}

function baueAor(konfiguration: SoftphoneKonfiguration): string {
  return `sip:${konfiguration.sipBenutzername.trim()}@${konfiguration.sipDomainHost.trim()}`;
}

function baueZieladresse(rufnummer: string, sipDomainHost: string): string {
  const bereinigteRufnummer = rufnummer.trim();

  if (!bereinigteRufnummer) {
    throw new Error("Bitte zuerst eine Rufnummer oder SIP-Adresse eingeben.");
  }

  if (/^sips?:/i.test(bereinigteRufnummer)) {
    return bereinigteRufnummer;
  }

  return `sip:${bereinigteRufnummer}@${sipDomainHost.trim()}`;
}

function baueIceServerKonfiguration(stunServerUrl?: string): RTCConfiguration | undefined {
  const bereinigteStunServerUrl = stunServerUrl?.trim();

  if (!bereinigteStunServerUrl) {
    return undefined;
  }

  return {
    iceServers: [
      {
        urls: bereinigteStunServerUrl
      }
    ]
  };
}

function leseSipAntwort(response: SipAntwort): string {
  const statusCode = response.message.statusCode ?? "unbekannt";
  const grund = response.message.reasonPhrase ? ` ${response.message.reasonPhrase}` : "";
  return `${statusCode}${grund}`;
}

function mappeLogEbene(ebene: "debug" | "log" | "warn" | "error") {
  switch (ebene) {
    case "debug":
    case "log":
      return "info" as const;
    case "warn":
      return "warnung" as const;
    case "error":
      return "fehler" as const;
    default:
      return "info" as const;
  }
}

function formatiereUnbekanntenFehler(fehler: unknown): string {
  if (fehler instanceof DOMException) {
    return formatiereMedienfehler(fehler);
  }

  if (fehler instanceof Error) {
    return fehler.message;
  }

  return "Unbekannter Fehler";
}

export class BrowserSoftphoneDienst {
  private benutzer?: Web.SimpleUser;
  private konfiguration?: SoftphoneKonfiguration;
  private zustand: Statuszustand = erstelleInitialenStatuszustand();
  private gespraechsdauerIntervallId?: number;
  private gespraechsbeginnZeitstempel?: number;
  private wirdBewusstGetrennt = false;

  public constructor(
    private readonly fernAudioElement: HTMLAudioElement,
    private readonly ereignisse: SoftphoneEreignisse
  ) {
    this.fernAudioElement.autoplay = true;
  }

  public aktuellerStatus(): Statuszustand {
    return { ...this.zustand };
  }

  public async verbindenUndRegistrieren(konfiguration: SoftphoneKonfiguration): Promise<void> {
    if (this.benutzer) {
      await this.trennen(true);
    }

    this.wirdBewusstGetrennt = false;

    this.konfiguration = {
      ...konfiguration,
      anzeigename: konfiguration.anzeigename.trim(),
      sipBenutzername: konfiguration.sipBenutzername.trim(),
      sipDomainHost: konfiguration.sipDomainHost.trim(),
      webSocketServerUrl: konfiguration.webSocketServerUrl.trim(),
      stunServerUrl: konfiguration.stunServerUrl?.trim()
    };

    const aor = baueAor(this.konfiguration);
    const peerConnectionKonfiguration = baueIceServerKonfiguration(this.konfiguration.stunServerUrl);

    this.setzeStatus({
      registrierungsstatus: "Verbindung wird aufgebaut",
      transportstatus: "Verbindung wird aufgebaut",
      registrierteAdresse: aor,
      letzteFehlermeldung: "",
      aktuellesGespraechsziel: ""
    });

    this.protokolliere(
      "SIP",
      "Versuch der Verbindung zur SIP-Anlage.",
      "info",
      `${aor} über ${this.konfiguration.webSocketServerUrl}`
    );

    const optionen: Web.SimpleUserOptions = {
      aor,
      media: {
        constraints: {
          audio: true,
          video: false
        },
        remote: {
          audio: this.fernAudioElement
        }
      },
      delegate: this.erzeugeSimpleUserDelegate(),
      reconnectionAttempts: 3,
      reconnectionDelay: 4,
      userAgentOptions: {
        authorizationPassword: this.konfiguration.passwort,
        authorizationUsername: this.konfiguration.sipBenutzername,
        displayName: this.konfiguration.anzeigename || this.konfiguration.sipBenutzername,
        logBuiltinEnabled: false,
        logConfiguration: false,
        logConnector: (ebene, kategorie, kennzeichnung, inhalt) => {
          const quelle = kennzeichnung ? `${kategorie}/${kennzeichnung}` : kategorie;
          this.protokolliere("SIP", `SIP.js ${quelle}`, mappeLogEbene(ebene), inhalt);
        },
        logLevel: "debug",
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 3000,
          peerConnectionConfiguration: peerConnectionKonfiguration
        },
        transportOptions: {
          server: this.konfiguration.webSocketServerUrl
        }
      }
    };

    try {
      this.benutzer = new Web.SimpleUser(this.konfiguration.webSocketServerUrl, optionen);

      await this.benutzer.connect();

      await this.benutzer.register({
        requestDelegate: {
          onAccept: (response) => {
            this.protokolliere(
              "SIP",
              "Registrierung vom Server bestätigt.",
              "erfolg",
              `Antwort: ${leseSipAntwort(response)}`
            );
          },
          onReject: (response) => {
            const antwort = leseSipAntwort(response);
            this.protokolliere(
              "SIP",
              "Registrierung wurde vom SIP-Server abgelehnt.",
              "fehler",
              `Antwort: ${antwort}`
            );
            this.setzeStatus({
              registrierungsstatus: "Fehlerzustand",
              letzteFehlermeldung: `Registrierung fehlgeschlagen (${antwort}).`
            });
          },
          onTrying: () => {
            this.protokolliere("SIP", "REGISTER wurde an den Server gesendet.", "info");
          }
        }
      });
    } catch (fehler) {
      const fehlermeldung = formatiereUnbekanntenFehler(fehler);
      this.protokolliere(
        "SIP",
        "Verbindung oder Registrierung konnte nicht aufgebaut werden.",
        "fehler",
        fehlermeldung
      );
      this.setzeStatus({
        registrierungsstatus: "Fehlerzustand",
        transportstatus: "Fehler",
        letzteFehlermeldung: fehlermeldung
      });
      throw fehler;
    }
  }

  public async trennen(stumm: boolean = false): Promise<void> {
    const aktuellerBenutzer = this.benutzer;
    this.wirdBewusstGetrennt = true;

    if (!aktuellerBenutzer) {
      this.zuruecksetzenNachTrennung();
      this.wirdBewusstGetrennt = false;
      return;
    }

    if (!stumm) {
      this.protokolliere("SIP", "Verbindung wird getrennt.", "info");
    }

    try {
      if (this.zustand.eingehenderAnruf) {
        await aktuellerBenutzer.decline().catch(() => undefined);
      } else if (this.zustand.aktiveVerbindung || this.zustand.ausgehenderAnruf) {
        await aktuellerBenutzer.hangup().catch(() => undefined);
      }

      if (this.zustand.registrierungsstatus === "Registriert") {
        await aktuellerBenutzer.unregister().catch(() => undefined);
      }

      if (aktuellerBenutzer.isConnected()) {
        await aktuellerBenutzer.disconnect();
      }
    } finally {
      this.benutzer = undefined;
      this.zuruecksetzenNachTrennung();
      this.wirdBewusstGetrennt = false;
    }
  }

  public async starteAnruf(rufnummer: string): Promise<void> {
    if (!this.benutzer || !this.konfiguration) {
      throw new Error("Es besteht noch keine SIP-Verbindung.");
    }

    const zieladresse = baueZieladresse(rufnummer, this.konfiguration.sipDomainHost);

    this.setzeStatus({
      gespraechsstatus: "Ausgehender Anruf",
      ausgehenderAnruf: true,
      eingehenderAnruf: false,
      aktiveVerbindung: false,
      gespraechsdauerSekunden: 0,
      aktuellesGespraechsziel: zieladresse,
      letzteFehlermeldung: ""
    });

    this.protokolliere("SIP", "Ausgehender Anruf wird gestartet.", "info", zieladresse);

    try {
      await this.benutzer.call(zieladresse, undefined, {
        requestDelegate: {
          onTrying: () => {
            this.protokolliere("SIP", "INVITE wurde gesendet.", "info", zieladresse);
          },
          onProgress: (response) => {
            this.protokolliere(
              "SIP",
              "Gegenstelle signalisiert einen Zwischenstatus.",
              "info",
              `Antwort: ${leseSipAntwort(response)}`
            );
          },
          onAccept: (response) => {
            this.protokolliere(
              "SIP",
              "Gegenstelle hat den Anruf angenommen.",
              "erfolg",
              `Antwort: ${leseSipAntwort(response)}`
            );
          },
          onReject: (response) => {
            const antwort = leseSipAntwort(response);
            this.protokolliere(
              "SIP",
              "Ausgehender Anruf wurde abgelehnt.",
              "fehler",
              `Antwort: ${antwort}`
            );
            this.setzeStatus({
              gespraechsstatus: "Fehlerzustand",
              ausgehenderAnruf: false,
              aktiveVerbindung: false,
              letzteFehlermeldung: `Anruf fehlgeschlagen (${antwort}).`
            });
          }
        },
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });
    } catch (fehler) {
      const fehlermeldung = formatiereUnbekanntenFehler(fehler);
      this.protokolliere("SIP", "Ausgehender Anruf konnte nicht gestartet werden.", "fehler", fehlermeldung);
      this.setzeStatus({
        gespraechsstatus: "Fehlerzustand",
        ausgehenderAnruf: false,
        letzteFehlermeldung: fehlermeldung
      });
      throw fehler;
    }
  }

  public async nehmeEingehendenAnrufAn(): Promise<void> {
    if (!this.benutzer) {
      throw new Error("Es liegt kein eingehender Anruf vor.");
    }

    this.protokolliere("SIP", "Eingehender Anruf wird angenommen.", "info");

    try {
      await this.benutzer.answer({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });
    } catch (fehler) {
      const fehlermeldung = formatiereUnbekanntenFehler(fehler);
      this.protokolliere("Audio", "Anrufannahme mit Medienfreigabe fehlgeschlagen.", "fehler", fehlermeldung);
      this.setzeStatus({
        gespraechsstatus: "Fehlerzustand",
        eingehenderAnruf: false,
        letzteFehlermeldung: fehlermeldung
      });
      throw fehler;
    }
  }

  public async lehneEingehendenAnrufAb(): Promise<void> {
    if (!this.benutzer) {
      throw new Error("Es liegt kein eingehender Anruf vor.");
    }

    this.protokolliere("SIP", "Eingehender Anruf wird abgelehnt.", "warnung");

    try {
      await this.benutzer.decline();
    } catch (fehler) {
      const fehlermeldung = formatiereUnbekanntenFehler(fehler);
      this.protokolliere("SIP", "Eingehender Anruf konnte nicht abgelehnt werden.", "fehler", fehlermeldung);
      throw fehler;
    }
  }

  public async legeAuf(): Promise<void> {
    if (!this.benutzer) {
      throw new Error("Es gibt aktuell kein aktives Gespräch.");
    }

    this.setzeStatus({
      gespraechsstatus: "Gespraech wird beendet"
    });

    this.protokolliere("SIP", "Auflegen wurde ausgelöst.", "info");

    try {
      await this.benutzer.hangup();
    } catch (fehler) {
      const fehlermeldung = formatiereUnbekanntenFehler(fehler);
      this.protokolliere("SIP", "Auflegen ist fehlgeschlagen.", "fehler", fehlermeldung);
      this.setzeStatus({
        gespraechsstatus: "Fehlerzustand",
        letzteFehlermeldung: fehlermeldung
      });
      throw fehler;
    }
  }

  public schalteStummUm(): void {
    if (!this.benutzer) {
      return;
    }

    if (this.benutzer.isMuted()) {
      this.benutzer.unmute();
      this.protokolliere("Audio", "Mikrofon wurde wieder freigegeben.", "erfolg");
      this.setzeStatus({
        stummgeschaltet: false
      });
      return;
    }

    this.benutzer.mute();
    this.protokolliere("Audio", "Mikrofon wurde stummgeschaltet.", "warnung");
    this.setzeStatus({
      stummgeschaltet: true
    });
  }

  private erzeugeSimpleUserDelegate(): Web.SimpleUserDelegate {
    return {
      onCallAnswered: () => {
        this.protokolliere("SIP", "Gespräch angenommen.", "erfolg");
        this.setzeStatus({
          gespraechsstatus: "Aktive Verbindung",
          aktiveVerbindung: true,
          eingehenderAnruf: false,
          ausgehenderAnruf: false,
          stummgeschaltet: false,
          gespraechsdauerSekunden: 0,
          letzteFehlermeldung: ""
        });
        this.starteGespraechsdauer();
        this.bindeRemoteAudioEin();
        void this.versucheAudioWiedergabe();
      },
      onCallCreated: () => {
        this.protokolliere("SIP", "SIP-Sitzung wurde angelegt.", "info");
      },
      onCallHangup: () => {
        this.stoppeGespraechsdauer();
        this.loeseRemoteAudio();
        this.protokolliere("SIP", "Gespräch beendet.", "info");
        this.setzeStatus({
          gespraechsstatus: "Bereit",
          aktiveVerbindung: false,
          eingehenderAnruf: false,
          ausgehenderAnruf: false,
          stummgeschaltet: false,
          gespraechsdauerSekunden: 0,
          aktuellesGespraechsziel: "",
          letzteFehlermeldung: ""
        });
      },
      onCallReceived: () => {
        this.stoppeGespraechsdauer();
        this.loeseRemoteAudio();
        this.protokolliere("SIP", "Eingehender Anruf erkannt.", "warnung");
        this.setzeStatus({
          gespraechsstatus: "Eingehender Anruf",
          eingehenderAnruf: true,
          ausgehenderAnruf: false,
          aktiveVerbindung: false,
          stummgeschaltet: false,
          gespraechsdauerSekunden: 0,
          aktuellesGespraechsziel: "Eingehender Anruf",
          letzteFehlermeldung: ""
        });
      },
      onRegistered: () => {
        this.protokolliere("SIP", "Erfolgreiche Registrierung.", "erfolg");
        this.setzeStatus({
          registrierungsstatus: "Registriert",
          transportstatus: "Verbunden",
          letzteFehlermeldung: ""
        });
      },
      onServerConnect: () => {
        this.protokolliere("SIP", "WebSocket-Verbindung hergestellt.", "erfolg");
        this.setzeStatus({
          transportstatus: "Verbunden",
          registrierungsstatus: "Verbindung wird aufgebaut",
          letzteFehlermeldung: ""
        });
      },
      onServerDisconnect: () => {
        this.stoppeGespraechsdauer();
        this.loeseRemoteAudio();

        if (this.wirdBewusstGetrennt) {
          this.protokolliere("SIP", "WebSocket-Verbindung wurde kontrolliert getrennt.", "info");
          this.setzeStatus({
            transportstatus: "Getrennt",
            registrierungsstatus: "Nicht registriert",
            gespraechsstatus: "Bereit",
            aktiveVerbindung: false,
            eingehenderAnruf: false,
            ausgehenderAnruf: false,
            stummgeschaltet: false,
            gespraechsdauerSekunden: 0,
            aktuellesGespraechsziel: "",
            letzteFehlermeldung: ""
          });
          return;
        }

        this.protokolliere(
          "SIP",
          "WebSocket-Verbindung wurde getrennt oder vom Server beendet.",
          "fehler"
        );
        this.setzeStatus({
          transportstatus: "Fehler",
          registrierungsstatus: "Fehlerzustand",
          gespraechsstatus: "Bereit",
          aktiveVerbindung: false,
          eingehenderAnruf: false,
          ausgehenderAnruf: false,
          stummgeschaltet: false,
          gespraechsdauerSekunden: 0,
          letzteFehlermeldung:
            this.zustand.letzteFehlermeldung || "Die WebSocket-Verbindung wurde unerwartet getrennt."
        });
      },
      onUnregistered: () => {
        const transportIstVerbunden = this.benutzer?.isConnected() ?? false;

        this.protokolliere(
          "SIP",
          this.wirdBewusstGetrennt ? "Registrierung wurde kontrolliert aufgehoben." : "Registrierung wurde aufgehoben.",
          this.wirdBewusstGetrennt ? "info" : "warnung"
        );
        this.setzeStatus({
          transportstatus:
            this.zustand.transportstatus === "Fehler" ? "Fehler" : transportIstVerbunden ? "Verbunden" : "Getrennt",
          registrierungsstatus:
            this.zustand.transportstatus === "Fehler" ? "Fehlerzustand" : "Nicht registriert",
          letzteFehlermeldung: this.zustand.transportstatus === "Fehler" ? this.zustand.letzteFehlermeldung : ""
        });
      }
    };
  }

  private bindeRemoteAudioEin(): void {
    const remoteMediaStream = this.benutzer?.remoteMediaStream;

    if (!remoteMediaStream) {
      this.protokolliere(
        "Audio",
        "Noch kein Remote-Audiostrom vorhanden.",
        "warnung",
        "SIP.js erstellt die RTCPeerConnection intern. Nach der SDP-Aushandlung landet der Remote-Medienstrom am Audio-Element."
      );
      return;
    }

    this.fernAudioElement.srcObject = remoteMediaStream;
    this.protokolliere(
      "Audio",
      "Remote-Audio wurde an das HTML-Audio-Element gebunden.",
      "erfolg",
      "An dieser Stelle verarbeitet SIP.js die per WebRTC ausgehandelten Medien und weist den entfernten Stream dem Audio-Element zu."
    );
  }

  private loeseRemoteAudio(): void {
    this.fernAudioElement.pause();
    this.fernAudioElement.srcObject = null;
  }

  private async versucheAudioWiedergabe(): Promise<void> {
    try {
      await this.fernAudioElement.play();
      this.protokolliere("Audio", "Audiowiedergabe für den Remote-Stream wurde gestartet.", "erfolg");
    } catch (fehler) {
      this.protokolliere(
        "Audio",
        "Der Browser hat die automatische Audiowiedergabe blockiert.",
        "warnung",
        `${formatiereUnbekanntenFehler(fehler)}. Bitte die Schaltfläche "Audiowiedergabe freischalten" nutzen.`
      );
    }
  }

  private starteGespraechsdauer(): void {
    this.stoppeGespraechsdauer();
    this.gespraechsbeginnZeitstempel = Date.now();
    this.gespraechsdauerIntervallId = window.setInterval(() => {
      if (!this.gespraechsbeginnZeitstempel) {
        return;
      }

      const sekunden = Math.floor((Date.now() - this.gespraechsbeginnZeitstempel) / 1000);
      this.setzeStatus({
        gespraechsdauerSekunden: sekunden
      });
    }, 1000);
  }

  private stoppeGespraechsdauer(): void {
    if (this.gespraechsdauerIntervallId) {
      window.clearInterval(this.gespraechsdauerIntervallId);
      this.gespraechsdauerIntervallId = undefined;
    }

    this.gespraechsbeginnZeitstempel = undefined;
  }

  private zuruecksetzenNachTrennung(): void {
    this.stoppeGespraechsdauer();
    this.loeseRemoteAudio();
    this.konfiguration = undefined;
    this.setzeStatus(erstelleInitialenStatuszustand());
  }

  private protokolliere(
    bereich: "App" | "Diagnose" | "SIP" | "Audio",
    nachricht: string,
    ebene: "info" | "erfolg" | "warnung" | "fehler" = "info",
    details?: string
  ): void {
    this.ereignisse.protokolliere(bereich, nachricht, ebene, details);
  }

  private setzeStatus(aenderungen: Partial<Statuszustand>): void {
    this.zustand = {
      ...this.zustand,
      ...aenderungen
    };
    this.ereignisse.statusGeaendert({ ...this.zustand });
  }
}
