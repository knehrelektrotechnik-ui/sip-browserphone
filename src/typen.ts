export type ProtokollEbene = "info" | "erfolg" | "warnung" | "fehler";

export interface ProtokollEintrag {
  id: number;
  zeitstempel: string;
  bereich: "App" | "Diagnose" | "SIP" | "Audio" | "Dashboard" | "System";
  ebene: ProtokollEbene;
  nachricht: string;
  details?: string;
}

export interface SoftphoneKonfiguration {
  anzeigename: string;
  sipBenutzername: string;
  passwort: string;
  sipDomainHost: string;
  webSocketServerUrl: string;
  stunServerUrl?: string;
}

export interface Statuszustand {
  registrierungsstatus: "Nicht registriert" | "Verbindung wird aufgebaut" | "Registriert" | "Fehlerzustand";
  transportstatus: "Getrennt" | "Verbunden" | "Verbindung wird aufgebaut" | "Fehler";
  gespraechsstatus:
    | "Bereit"
    | "Eingehender Anruf"
    | "Ausgehender Anruf"
    | "Aktive Verbindung"
    | "Gespraech wird beendet"
    | "Fehlerzustand";
  aktiveVerbindung: boolean;
  eingehenderAnruf: boolean;
  ausgehenderAnruf: boolean;
  stummgeschaltet: boolean;
  gespraechsdauerSekunden: number;
  letzteFehlermeldung: string;
  registrierteAdresse: string;
  aktuellesGespraechsziel: string;
}

export interface DiagnoseErgebnis {
  titel: string;
  erfolgreich: boolean;
  zusammenfassung: string;
  details?: string;
}

export interface VerfuegbaresAudioAusgabegeraet {
  geraeteId: string;
  bezeichnung: string;
}

export interface SoftphoneEreignisse {
  protokolliere: (
    bereich: ProtokollEintrag["bereich"],
    nachricht: string,
    ebene?: ProtokollEbene,
    details?: string
  ) => void;
  statusGeaendert: (zustand: Statuszustand) => void;
}

export function erstelleInitialenStatuszustand(): Statuszustand {
  return {
    registrierungsstatus: "Nicht registriert",
    transportstatus: "Getrennt",
    gespraechsstatus: "Bereit",
    aktiveVerbindung: false,
    eingehenderAnruf: false,
    ausgehenderAnruf: false,
    stummgeschaltet: false,
    gespraechsdauerSekunden: 0,
    letzteFehlermeldung: "",
    registrierteAdresse: "",
    aktuellesGespraechsziel: ""
  };
}
