import { SoftphoneKonfiguration } from "./typen";
import { holeLaufzeitkonfiguration } from "./laufzeitkonfiguration";

export const FESTE_STARTANMELDUNG = {
  aktiviert: true,
  automatischVerbindenBeimStart: true,
  wiederholungsintervallSekunden: 10,
  konfiguration: {
    anzeigename: "Browserphone",
    sipBenutzername: "701",
    passwort: "701pass",
    sipDomainHost: "192.168.1.105",
    webSocketServerUrl: "wss://192.168.1.105:8089/ws",
    stunServerUrl: "stun:stun.l.google.com:19302"
  } satisfies SoftphoneKonfiguration
} as const;

function ermittleEffektiveStartanmeldung() {
  const laufzeitkonfiguration = holeLaufzeitkonfiguration().festeStartanmeldung;

  if (!laufzeitkonfiguration) {
    return FESTE_STARTANMELDUNG;
  }

  return {
    aktiviert: laufzeitkonfiguration.aktiviert ?? FESTE_STARTANMELDUNG.aktiviert,
    automatischVerbindenBeimStart:
      laufzeitkonfiguration.automatischVerbindenBeimStart ?? FESTE_STARTANMELDUNG.automatischVerbindenBeimStart,
    wiederholungsintervallSekunden:
      laufzeitkonfiguration.wiederholungsintervallSekunden ?? FESTE_STARTANMELDUNG.wiederholungsintervallSekunden,
    konfiguration: {
      ...FESTE_STARTANMELDUNG.konfiguration,
      ...laufzeitkonfiguration.konfiguration
    }
  } as const;
}

export function istSoftphoneKonfigurationVollstaendig(
  konfiguration: SoftphoneKonfiguration | undefined
): konfiguration is SoftphoneKonfiguration {
  if (!konfiguration) {
    return false;
  }

  return Boolean(
    konfiguration.sipBenutzername.trim() &&
      konfiguration.passwort &&
      konfiguration.sipDomainHost.trim() &&
      konfiguration.webSocketServerUrl.trim()
  );
}

export function ermittleFesteStartkonfiguration(): SoftphoneKonfiguration | undefined {
  const startanmeldung = ermittleEffektiveStartanmeldung();

  if (!startanmeldung.aktiviert) {
    return undefined;
  }

  return {
    ...startanmeldung.konfiguration
  };
}

export function istAutomatischeStartverbindungAktiviert(): boolean {
  return ermittleEffektiveStartanmeldung().automatischVerbindenBeimStart;
}

export function ermittleWiederholungsintervallMillisekunden(): number {
  return Math.max(1000, ermittleEffektiveStartanmeldung().wiederholungsintervallSekunden * 1000);
}
