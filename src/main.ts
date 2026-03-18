import "./style.css";
import { BrowserSoftphoneAnwendung } from "./app";
import { FESTE_STARTANMELDUNG } from "./feste-startkonfiguration";
import { initialisiereLaufzeitkonfiguration } from "./laufzeitkonfiguration";

const wurzelElement = document.querySelector<HTMLDivElement>("#app");

if (!wurzelElement) {
  throw new Error("Das Wurzelelement der Anwendung wurde nicht gefunden.");
}

void (async () => {
  await initialisiereLaufzeitkonfiguration(FESTE_STARTANMELDUNG.konfiguration);
  const anwendung = new BrowserSoftphoneAnwendung(wurzelElement);
  anwendung.starten();
})();
