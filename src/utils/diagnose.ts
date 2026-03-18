import { DiagnoseErgebnis, VerfuegbaresAudioAusgabegeraet } from "../typen";

export interface WebSocketDiagnoseOptionen {
  webSocketServerUrl: string;
  zeitlimitMillisekunden?: number;
}

function istWebSocketSchemaGueltig(webSocketServerUrl: string): boolean {
  try {
    const url = new URL(webSocketServerUrl);
    return url.protocol === "ws:" || url.protocol === "wss:";
  } catch {
    return false;
  }
}

function istLokalerHost(hostnameWert: string): boolean {
  return (
    hostnameWert === "localhost" ||
    hostnameWert === "127.0.0.1" ||
    hostnameWert === "::1" ||
    hostnameWert.endsWith(".localhost")
  );
}

export function pruefeSicherenKontext(): DiagnoseErgebnis {
  const aktuelleAdresse = window.location.href;
  const aktuelleOrigin = window.location.origin;

  if (window.isSecureContext) {
    return {
      titel: "Sicherer Kontext",
      erfolgreich: true,
      zusammenfassung: "Die Seite laeuft in einem sicheren Kontext.",
      details: `Aktuelle Adresse: ${aktuelleOrigin}`
    };
  }

  if (window.location.protocol === "https:") {
    return {
      titel: "Sicherer Kontext",
      erfolgreich: false,
      zusammenfassung: "Die Seite ist per HTTPS geladen, wird aber vom Browser nicht als sicher eingestuft.",
      details:
        `Aktuelle Adresse: ${aktuelleAdresse}. ` +
        "Haeufige Ursache ist ein nicht vertrautes oder fehlerhaftes Zertifikat. " +
        "Bitte das lokale Zertifikat bzw. die lokale CA des Dev-Servers vertrauen."
    };
  }

  const beispielHost = istLokalerHost(window.location.hostname)
    ? "localhost:5173"
    : `${window.location.hostname}:5173`;

  return {
    titel: "Sicherer Kontext",
    erfolgreich: false,
    zusammenfassung: "Die Seite laeuft nicht in einem sicheren Kontext.",
    details:
      `Aktuelle Adresse: ${aktuelleAdresse}. ` +
      `Bitte die Anwendung per HTTPS aufrufen, zum Beispiel ueber https://${beispielHost}. ` +
      "Ohne sicheren Kontext blockieren Browser navigator.mediaDevices.getUserMedia und damit Mikrofonzugriffe."
  };
}

export async function pruefeWebSocketServerKonfiguration(
  optionen: WebSocketDiagnoseOptionen
): Promise<DiagnoseErgebnis> {
  const { webSocketServerUrl, zeitlimitMillisekunden = 4500 } = optionen;

  if (!istWebSocketSchemaGueltig(webSocketServerUrl)) {
    return {
      titel: "WebSocket-Server",
      erfolgreich: false,
      zusammenfassung: "Die WebSocket-Server-URL ist ungueltig.",
      details: "Erwartet wird eine URL mit ws:// oder wss://."
    };
  }

  const url = new URL(webSocketServerUrl);

  if (window.location.protocol === "https:" && url.protocol !== "wss:") {
    return {
      titel: "WebSocket-Server",
      erfolgreich: false,
      zusammenfassung: "Bei einer HTTPS-Seite muss der SIP-WebSocket ebenfalls per WSS erreichbar sein.",
      details:
        `Aktuell ist ${url.protocol}// konfiguriert. ` +
        "Browser blockieren gemischte Inhalte, wenn eine HTTPS-Seite zu einem unverschluesselten ws://-Endpunkt verbinden soll."
    };
  }

  return new Promise<DiagnoseErgebnis>((resolve) => {
    let istAbgeschlossen = false;
    const webSocket = new WebSocket(webSocketServerUrl);
    const zeitlimit = window.setTimeout(() => {
      if (istAbgeschlossen) {
        return;
      }

      istAbgeschlossen = true;
      webSocket.close();
      resolve({
        titel: "WebSocket-Server",
        erfolgreich: false,
        zusammenfassung: "Der WebSocket-Server antwortet nicht rechtzeitig.",
        details: `Innerhalb von ${zeitlimitMillisekunden} ms konnte keine Verbindung aufgebaut werden.`
      });
    }, zeitlimitMillisekunden);

    const abschliessen = (ergebnis: DiagnoseErgebnis): void => {
      if (istAbgeschlossen) {
        return;
      }

      istAbgeschlossen = true;
      window.clearTimeout(zeitlimit);
      resolve(ergebnis);
    };

    webSocket.addEventListener("open", () => {
      abschliessen({
        titel: "WebSocket-Server",
        erfolgreich: true,
        zusammenfassung: "Der WebSocket-Server ist erreichbar.",
        details: `Verbindung zu ${webSocketServerUrl} konnte erfolgreich aufgebaut werden.`
      });
      webSocket.close();
    });

    webSocket.addEventListener("error", () => {
      abschliessen({
        titel: "WebSocket-Server",
        erfolgreich: false,
        zusammenfassung: "Die WebSocket-Verbindung konnte nicht aufgebaut werden.",
        details:
          "Bitte URL, Port, Zertifikat, Firewall und die WebRTC-/WSS-Konfiguration der Telefonanlage pruefen."
      });
    });

    webSocket.addEventListener("close", (ereignis) => {
      if (!istAbgeschlossen && ereignis.code !== 1000) {
        abschliessen({
          titel: "WebSocket-Server",
          erfolgreich: false,
          zusammenfassung: "Der WebSocket-Server hat die Verbindung sofort wieder geschlossen.",
          details: `Schliesscode ${ereignis.code}${ereignis.reason ? `, Grund: ${ereignis.reason}` : ""}.`
        });
      }
    });
  });
}

export async function pruefeMikrofonzugriff(): Promise<DiagnoseErgebnis> {
  const sicherheitsErgebnis = pruefeSicherenKontext();

  if (!sicherheitsErgebnis.erfolgreich) {
    return {
      titel: "Mikrofon",
      erfolgreich: false,
      zusammenfassung: "Der Mikrofonzugriff ist blockiert, weil die Seite nicht in einem sicheren Kontext laeuft.",
      details: sicherheitsErgebnis.details
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      titel: "Mikrofon",
      erfolgreich: false,
      zusammenfassung: "Der Browser unterstuetzt keinen Mikrofonzugriff ueber WebRTC.",
      details: "Erforderlich ist ein moderner Browser mit navigator.mediaDevices.getUserMedia."
    };
  }

  try {
    const medienstrom = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    for (const spur of medienstrom.getTracks()) {
      spur.stop();
    }

    return {
      titel: "Mikrofon",
      erfolgreich: true,
      zusammenfassung: "Der Mikrofonzugriff funktioniert grundsaetzlich.",
      details: "Die Browser-Berechtigung wurde erteilt und ein Audiostrom konnte geoeffnet werden."
    };
  } catch (fehler) {
    const meldung = formatiereMedienfehler(fehler);
    return {
      titel: "Mikrofon",
      erfolgreich: false,
      zusammenfassung: "Der Mikrofonzugriff ist aktuell nicht nutzbar.",
      details: meldung
    };
  }
}

export async function ermittleAudioAusgabegeraete(): Promise<VerfuegbaresAudioAusgabegeraet[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const geraete = await navigator.mediaDevices.enumerateDevices();
  return geraete
    .filter((geraet) => geraet.kind === "audiooutput")
    .map((geraet) => ({
      geraeteId: geraet.deviceId,
      bezeichnung: geraet.label || "Audio-Ausgabe ohne Bezeichnung"
    }));
}

export function browserUnterstuetztLautsprecherUmschaltung(audioElement: HTMLAudioElement): boolean {
  return typeof (audioElement as HTMLAudioElement & { setSinkId?: (geraeteId: string) => Promise<void> }).setSinkId === "function";
}

export async function setzeAudioAusgabegeraet(
  audioElement: HTMLAudioElement,
  geraeteId: string
): Promise<void> {
  const zielElement = audioElement as HTMLAudioElement & {
    setSinkId?: (geraeteId: string) => Promise<void>;
  };

  if (!zielElement.setSinkId) {
    throw new Error("Dieser Browser unterstuetzt keine Lautsprecherumschaltung per setSinkId.");
  }

  await zielElement.setSinkId(geraeteId);
}

export function formatiereMedienfehler(fehler: unknown): string {
  if (fehler instanceof DOMException) {
    switch (fehler.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Der Browser hat den Mikrofonzugriff blockiert. Bitte die Berechtigung freigeben.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Es wurde kein Mikrofon gefunden.";
      case "NotReadableError":
      case "TrackStartError":
        return "Das Mikrofon ist bereits belegt oder kann nicht gelesen werden.";
      case "SecurityError":
        return "Der Browser blockiert den Zugriff aus Sicherheitsgruenden. Bitte die Seite per HTTPS in einem sicheren Kontext oeffnen.";
      case "AbortError":
        return "Die Medienanfrage wurde vom Browser abgebrochen.";
      default:
        return `${fehler.name}: ${fehler.message || "Unbekannter Medienfehler."}`;
    }
  }

  if (fehler instanceof Error) {
    if (fehler.message.toLowerCase().includes("insecure context")) {
      return "Media devices not available in insecure contexts. Bitte die Seite per HTTPS mit vertrautem Zertifikat aufrufen.";
    }

    return fehler.message;
  }

  return "Unbekannter Fehler beim Zugriff auf Audio-/Medienfunktionen.";
}
