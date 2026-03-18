import { SoftphoneKonfiguration } from "../typen";

export const SOFTPHONE_TAB_KANAL = "browser-softphone-tab-kommunikation";

export type TabKommunikationsnachricht =
  | {
      typ: "konfiguration-anfordern";
    }
  | {
      typ: "konfiguration-bereit" | "konfiguration-aktualisiert";
      konfiguration: SoftphoneKonfiguration;
    };

export function browserUnterstuetztTabKommunikation(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

export function istVollstaendigeSoftphoneKonfiguration(
  konfiguration: unknown
): konfiguration is SoftphoneKonfiguration {
  if (!konfiguration || typeof konfiguration !== "object") {
    return false;
  }

  const kandidat = konfiguration as Partial<SoftphoneKonfiguration>;

  return Boolean(
    typeof kandidat.anzeigename === "string" &&
      typeof kandidat.sipBenutzername === "string" &&
      kandidat.sipBenutzername.trim() &&
      typeof kandidat.passwort === "string" &&
      kandidat.passwort &&
      typeof kandidat.sipDomainHost === "string" &&
      kandidat.sipDomainHost.trim() &&
      typeof kandidat.webSocketServerUrl === "string" &&
      kandidat.webSocketServerUrl.trim() &&
      (kandidat.stunServerUrl === undefined || typeof kandidat.stunServerUrl === "string")
  );
}
