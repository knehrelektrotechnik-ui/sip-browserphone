import "./style.css";
import { DashboardSteuerungAnwendung } from "./dashboard-steuerung";
import { FESTE_STARTANMELDUNG } from "./feste-startkonfiguration";
import { initialisiereLaufzeitkonfiguration } from "./laufzeitkonfiguration";

const wurzelElement = document.querySelector<HTMLDivElement>("#app");

if (!wurzelElement) {
  throw new Error("Das Wurzelelement der Dashboard-Steuerung wurde nicht gefunden.");
}

void (async () => {
  await initialisiereLaufzeitkonfiguration(FESTE_STARTANMELDUNG.konfiguration);
  const anwendung = new DashboardSteuerungAnwendung(wurzelElement);
  anwendung.starten();
})();
