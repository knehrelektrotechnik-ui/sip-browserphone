import "./style.css";
import { DashboardSteuerungAnwendung } from "./dashboard-steuerung";
import {
  FESTE_STARTANMELDUNG,
  ermittleFesteStartkonfiguration,
  istSoftphoneKonfigurationVollstaendig
} from "./feste-startkonfiguration";
import { initialisiereLaufzeitkonfiguration } from "./laufzeitkonfiguration";
import { speichereKonfiguration } from "./utils/speicher";

const wurzelElement = document.querySelector<HTMLDivElement>("#app");

if (!wurzelElement) {
  throw new Error("Das Wurzelelement der Dashboard-Steuerung wurde nicht gefunden.");
}

void (async () => {
  await initialisiereLaufzeitkonfiguration(FESTE_STARTANMELDUNG.konfiguration);
  const startkonfiguration = ermittleFesteStartkonfiguration();

  if (istSoftphoneKonfigurationVollstaendig(startkonfiguration)) {
    speichereKonfiguration(startkonfiguration);
  }

  const anwendung = new DashboardSteuerungAnwendung(wurzelElement);
  anwendung.starten();
})();
