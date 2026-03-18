import { SoftphoneKonfiguration } from "../typen";

export const KONFIGURATIONSSCHLUESSEL = "browser-softphone-konfiguration";

const STANDARD_KONFIGURATION: SoftphoneKonfiguration = {
  anzeigename: "",
  sipBenutzername: "",
  passwort: "",
  sipDomainHost: "",
  webSocketServerUrl: "",
  stunServerUrl: "stun:stun.l.google.com:19302"
};

export function ermittleStandardKonfiguration(): SoftphoneKonfiguration {
  return { ...STANDARD_KONFIGURATION };
}

export function ladeGespeicherteKonfiguration(): SoftphoneKonfiguration {
  try {
    const rohwert = window.localStorage.getItem(KONFIGURATIONSSCHLUESSEL);

    if (!rohwert) {
      return ermittleStandardKonfiguration();
    }

    const parsergebnis = JSON.parse(rohwert) as Partial<SoftphoneKonfiguration>;

    return {
      anzeigename: parsergebnis.anzeigename ?? STANDARD_KONFIGURATION.anzeigename,
      sipBenutzername: parsergebnis.sipBenutzername ?? STANDARD_KONFIGURATION.sipBenutzername,
      passwort: parsergebnis.passwort ?? STANDARD_KONFIGURATION.passwort,
      sipDomainHost: parsergebnis.sipDomainHost ?? STANDARD_KONFIGURATION.sipDomainHost,
      webSocketServerUrl: parsergebnis.webSocketServerUrl ?? STANDARD_KONFIGURATION.webSocketServerUrl,
      stunServerUrl: parsergebnis.stunServerUrl ?? STANDARD_KONFIGURATION.stunServerUrl
    };
  } catch {
    return ermittleStandardKonfiguration();
  }
}

export function speichereKonfiguration(konfiguration: SoftphoneKonfiguration): void {
  window.localStorage.setItem(KONFIGURATIONSSCHLUESSEL, JSON.stringify(konfiguration));
}
