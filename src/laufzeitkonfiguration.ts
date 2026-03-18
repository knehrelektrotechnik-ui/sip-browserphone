import { SoftphoneKonfiguration } from "./typen";

export interface FesteStartanmeldungKonfiguration {
  aktiviert: boolean;
  automatischVerbindenBeimStart: boolean;
  wiederholungsintervallSekunden: number;
  konfiguration: SoftphoneKonfiguration;
}

export interface Laufzeitkonfiguration {
  bereitstellungsmodus: "standard" | "home-assistant-addon";
  dashboard: {
    standardRufnummer: string;
  };
  festeStartanmeldung?: Partial<FesteStartanmeldungKonfiguration>;
}

const STANDARD_LAUFZEITKONFIGURATION: Laufzeitkonfiguration = {
  bereitstellungsmodus: "standard",
  dashboard: {
    standardRufnummer: "200"
  }
};

let aktuelleLaufzeitkonfiguration: Laufzeitkonfiguration = { ...STANDARD_LAUFZEITKONFIGURATION };

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return Boolean(wert) && typeof wert === "object" && !Array.isArray(wert);
}

function istTeilweiseSoftphoneKonfiguration(wert: unknown): wert is Partial<SoftphoneKonfiguration> {
  return istObjekt(wert);
}

function vereinigeSoftphoneKonfiguration(
  basis: SoftphoneKonfiguration,
  ueberschreibung?: Partial<SoftphoneKonfiguration>
): SoftphoneKonfiguration {
  if (!ueberschreibung) {
    return { ...basis };
  }

  return {
    anzeigename:
      typeof ueberschreibung.anzeigename === "string" ? ueberschreibung.anzeigename : basis.anzeigename,
    sipBenutzername:
      typeof ueberschreibung.sipBenutzername === "string"
        ? ueberschreibung.sipBenutzername
        : basis.sipBenutzername,
    passwort: typeof ueberschreibung.passwort === "string" ? ueberschreibung.passwort : basis.passwort,
    sipDomainHost:
      typeof ueberschreibung.sipDomainHost === "string"
        ? ueberschreibung.sipDomainHost
        : basis.sipDomainHost,
    webSocketServerUrl:
      typeof ueberschreibung.webSocketServerUrl === "string"
        ? ueberschreibung.webSocketServerUrl
        : basis.webSocketServerUrl,
    stunServerUrl:
      typeof ueberschreibung.stunServerUrl === "string"
        ? ueberschreibung.stunServerUrl
        : basis.stunServerUrl
  };
}

export function initialisiereLaufzeitkonfiguration(
  basisKonfiguration: SoftphoneKonfiguration
): Promise<Laufzeitkonfiguration> {
  return fetch("./runtime-konfiguration.json", {
    cache: "no-store"
  })
    .then(async (antwort) => {
      if (!antwort.ok) {
        throw new Error(`HTTP ${antwort.status}`);
      }

      const inhalt = (await antwort.json()) as unknown;

      if (!istObjekt(inhalt)) {
        return holeLaufzeitkonfiguration();
      }

      const festeStartanmeldung = istObjekt(inhalt.festeStartanmeldung) ? inhalt.festeStartanmeldung : undefined;
      const dashboard = istObjekt(inhalt.dashboard) ? inhalt.dashboard : undefined;
      const konfigurationUeberschreibung =
        festeStartanmeldung && istTeilweiseSoftphoneKonfiguration(festeStartanmeldung.konfiguration)
          ? festeStartanmeldung.konfiguration
          : undefined;

      aktuelleLaufzeitkonfiguration = {
        bereitstellungsmodus:
          inhalt.bereitstellungsmodus === "home-assistant-addon" ? "home-assistant-addon" : "standard",
        dashboard: {
          standardRufnummer:
            typeof dashboard?.standardRufnummer === "string" && dashboard.standardRufnummer.trim()
              ? dashboard.standardRufnummer.trim()
              : STANDARD_LAUFZEITKONFIGURATION.dashboard.standardRufnummer
        },
        festeStartanmeldung: festeStartanmeldung
          ? {
              aktiviert:
                typeof festeStartanmeldung.aktiviert === "boolean" ? festeStartanmeldung.aktiviert : undefined,
              automatischVerbindenBeimStart:
                typeof festeStartanmeldung.automatischVerbindenBeimStart === "boolean"
                  ? festeStartanmeldung.automatischVerbindenBeimStart
                  : undefined,
              wiederholungsintervallSekunden:
                typeof festeStartanmeldung.wiederholungsintervallSekunden === "number"
                  ? festeStartanmeldung.wiederholungsintervallSekunden
                  : undefined,
              konfiguration: vereinigeSoftphoneKonfiguration(basisKonfiguration, konfigurationUeberschreibung)
            }
          : undefined
      };

      return holeLaufzeitkonfiguration();
    })
    .catch(() => holeLaufzeitkonfiguration());
}

export function holeLaufzeitkonfiguration(): Laufzeitkonfiguration {
  return {
    ...aktuelleLaufzeitkonfiguration,
    dashboard: { ...aktuelleLaufzeitkonfiguration.dashboard },
    festeStartanmeldung: aktuelleLaufzeitkonfiguration.festeStartanmeldung
      ? {
          ...aktuelleLaufzeitkonfiguration.festeStartanmeldung,
          konfiguration: aktuelleLaufzeitkonfiguration.festeStartanmeldung.konfiguration
            ? { ...aktuelleLaufzeitkonfiguration.festeStartanmeldung.konfiguration }
            : undefined
        }
      : undefined
  };
}
