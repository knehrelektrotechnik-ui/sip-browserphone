# SIP-Browser-Softphone mit SIP.js

Eine vollstaendige Browser-Anwendung fuer SIP-/VoIP-Telefonie auf Basis von SIP.js, WebRTC und WebSocket/WSS. Die Oberflaeche, die Logmeldungen, die Kommentare und die Dokumentation sind komplett auf Deutsch gehalten.

## Ordnerstruktur

```text
.
|-- dashboard-steuerung.html
|-- index.html
|-- package.json
|-- package-lock.json
|-- README.md
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
`-- src
    |-- app.ts
    |-- dashboard-main.ts
    |-- dashboard-steuerung.ts
    |-- feste-startkonfiguration.ts
    |-- main.ts
    |-- style.css
    |-- typen.ts
    |-- sip
    |   `-- browser-softphone-dienst.ts
    `-- utils
        |-- diagnose.ts
        |-- protokoll.ts
        |-- speicher.ts
        `-- zeit.ts
```

## Funktionsumfang

- SIP-Anmeldung mit Anzeigename, Benutzername, Passwort, Domain/Host, WSS-URL und optionalem STUN-Server
- Registrierung und Trennung per Schaltflaeche
- Statusanzeigen fuer Transport, Registrierung, eingehende und ausgehende Gespraeche
- Rufnummernfeld fuer interne Nummern oder vollstaendige SIP-Ziele
- Annehmen, Ablehnen, Auflegen und Stummschalten
- HTML-Audio-Element fuer Remote-Audio und Gegensprechen
- Sichtbarer Debug-/Diagnosebereich mit Zeitstempeln
- Zusaetzliche Debug-Konsole als Overlay mit Exportfunktion fuer Supportfaelle
- Diagnose fuer WebSocket-Erreichbarkeit und Mikrofonzugriff
- Optionale Lautsprecherumschaltung per `setSinkId`, wenn der Browser das unterstuetzt
- Separate, schlanke Dashboard-Seite fuer die Einbettung per `iframe`
- Optionale feste Startkonfiguration mit automatischer Verbindung und Wiederholungsversuch

## Voraussetzungen

- Node.js 18 oder neuer
- Ein moderner Browser mit WebRTC-Unterstuetzung
- Eine SIP-Anlage mit WebRTC-/WSS-Unterstuetzung, zum Beispiel Asterisk, FreePBX oder eine kompatible Plattform
- Gueltige SIP-Zugangsdaten
- Fuer produktive Nutzung: HTTPS fuer die Webseite und WSS fuer SIP ueber WebSocket
- Fuer die lokale HTTPS-Entwicklung wird `vite-plugin-mkcert` verwendet

## Installation

```bash
npm install
```

## Start der Anwendung

### Entwicklung

```bash
npm run dev
```

Danach die im Terminal angezeigte lokale URL im Browser oeffnen, normalerweise:

```text
https://localhost:5173
```

Der Dev-Server startet nun bewusst per HTTPS. Beim ersten Start erzeugt `vite-plugin-mkcert` ein lokales Entwicklungszertifikat in `.zertifikate/`.

### Produktionsbuild

```bash
npm run build
```

Der fertige Build landet danach im Ordner `dist/`.

### Home-Assistant-Add-on Build

```bash
npm run build:addon
```

Dabei passiert Folgendes:

- TypeScript-Pruefung
- Vite-Produktionsbuild
- automatische Kopie des Builds nach `addon/sip-browserphone/www/`

Das Add-on-Geruest liegt unter:

```text
addon/sip-browserphone
```

## Dashboard-Steuerung

Zusatzlich zur Hauptoberflaeche gibt es eine zweite, sehr kompakte Seite fuer Dashboards:

```text
https://localhost:5173/dashboard-steuerung.html
```

Diese Seite zeigt nur:

- eine Schaltflaeche fuer eine fest hinterlegte Rufnummer
- `Annehmen`
- `Ablehnen`
- `Auflegen`
- die Gespraechsdauer

Die Seite verwendet die in der Hauptanwendung bereits gespeicherte SIP-Konfiguration und verbindet sich nach dem Laden automatisch mit Asterisk.

Wichtig:

- Die SIP-Daten muessen vorher mindestens einmal in der Hauptanwendung gespeichert worden sein.
- Die Standard-Rufnummer kann ueber die Laufzeit-Konfiguration bzw. im Home-Assistant-Add-on ueber die Option `dashboard_target` vorgegeben werden.
- Optional kann die Rufnummer auch direkt ueber die URL gesetzt werden, zum Beispiel `dashboard-steuerung.html?ziel=200`.

### Beispiel fuer die Einbettung in ein Dashboard

```html
<iframe
  src="https://localhost:5173/dashboard-steuerung.html?ziel=200"
  allow="microphone; autoplay"
  style="width: 100%; height: 120px; border: 0;"
></iframe>
```

Hinweise zur Einbettung:

- Fuer Audio und Mikrofonzugriff sollte das `iframe` mindestens `allow="microphone; autoplay"` erhalten.
- Wenn Dashboard und Softphone unter unterschiedlichen Hosts laufen, bleibt die SIP-Konfiguration trotzdem an die Softphone-URL gebunden, nicht an die Dashboard-URL.
- Die Dashboard-Seite ist bewusst minimal gehalten und zeigt keine Anmeldemaske; fuer Supportfaelle steht aber die einklappbare Debug-Konsole zur Verfuegung.
- Die Datei `dashboard-steuerung.html` nicht direkt per Doppelklick oeffnen, sondern immer ueber den HTTPS-Server bzw. die Build-URL laden, zum Beispiel `https://localhost:5173/dashboard-steuerung.html`.

## Debug-Konsole

Zusatzlich zum sichtbaren Debug-/Diagnosebereich in der Hauptanwendung gibt es nun eine einklappbare Debug-Konsole als Overlay.

Eigenschaften:

- verfuegbar in Hauptanwendung und Dashboard-Steuerung
- zeigt Browser- und Sicherheitsstatus wie sicherer Kontext, Online-Status, BroadcastChannel, `localStorage`, `getUserMedia` und WebRTC
- zeigt aktuelle SIP-/Verbindungsdaten ohne Passwoerter im Klartext
- zeigt das komplette Live-Protokoll der Anwendung
- kann das Protokoll als Textdatei fuer Supportfaelle exportieren

Die Konsole wird ueber die Schaltflaeche `Debug-Konsole` unten rechts geoeffnet.

## Einsatz als Home-Assistant-Add-on

Die Anwendung ist jetzt so vorbereitet, dass sie als Home-Assistant-Add-on mit Ingress ausgeliefert werden kann.

Eine konkrete Schritt-fuer-Schritt-Anleitung fuer Installation und Dashboard-Einbettung findest du in:

- `INSTALLATION-HOME-ASSISTANT.md`

Verhalten:

- Home Assistant zeigt die App ueber Ingress im eigenen UI an
- das Add-on erzeugt beim Start automatisch eine `runtime-konfiguration.json` aus den Add-on-Optionen
- die Webanwendung uebernimmt diese Konfiguration beim Laden automatisch
- die Dashboard-Steuerung nutzt ebenfalls diese Laufzeit-Konfiguration

Typischer Ablauf fuer einen Kundeneinsatz:

1. `npm run build:addon` ausfuehren
2. das Repository als Home-Assistant-Add-on-Repository bereitstellen
3. in Home Assistant das Repository hinzufuegen
4. Add-on `SIP Browserphone` installieren
5. SIP-Zugangsdaten in den Add-on-Optionen eintragen
6. Add-on starten
7. Hauptoberflaeche ueber den Add-on-Menuepunkt oeffnen
8. die Dashboard-Steuerung ueber dieselbe Add-on-/Ingress-Instanz verwenden

Wichtiger Hinweis:

- fuer Mikrofon und WebRTC sollte auch die Home-Assistant-Oberflaeche selbst per HTTPS mit vertrautem Zertifikat erreichbar sein

## Feste Startkonfiguration und Auto-Login

Wenn die Anwendung beim Start automatisch verbunden werden soll, kannst du die Datei `src/feste-startkonfiguration.ts` verwenden.

Dort lassen sich einstellen:

- ob eine feste Konfiguration aktiv ist
- ob beim Start automatisch verbunden werden soll
- nach wie vielen Sekunden ein fehlgeschlagener Verbindungsversuch wiederholt wird
- die festen SIP-Zugangsdaten

Wichtige Schalter:

- `aktiviert`
- `automatischVerbindenBeimStart`
- `wiederholungsintervallSekunden`

Verhalten:

- Wenn `aktiviert` auf `true` steht und die Konfiguration vollstaendig ist, wird diese Konfiguration beim Start bevorzugt verwendet.
- Wenn keine feste Konfiguration aktiv ist, aber bereits gespeicherte SIP-Daten vorhanden sind, kann die App ebenfalls automatisch damit starten.
- Wenn der Verbindungsversuch scheitert, wird automatisch alle 10 Sekunden erneut versucht, solange keine manuelle Trennung erfolgt.
- Ein manueller Klick auf `Trennen` stoppt die automatische Wiederverbindung bis zum naechsten Seitenstart.

## Beispielkonfiguration

```text
Anzeigename: Empfang Browser
SIP-Benutzername: 1001
Passwort: geheim
SIP-Domain / Host: pbx.beispiel.de
WebSocket-Server-URL: wss://pbx.beispiel.de:8089/ws
STUN-Server (optional): stun:stun.l.google.com:19302
```

Beispiel fuer ein Ziel im Waehlfeld:

```text
1002
```

Oder als vollstaendige SIP-Adresse:

```text
sip:1002@pbx.beispiel.de
```

## Annahmen der Anwendung

- Es wird genau ein gleichzeitiges Gespraech verwaltet. Das ist eine bewusste Vereinfachung der App-Struktur.
- Wenn kein STUN-Server eingetragen ist, verwendet die Anwendung die Standardkonfiguration von SIP.js bzw. dem Browser.
- Die Anwendung nutzt `Web.SimpleUser` aus SIP.js. Das ist fuer ein einzelnes Browser-Softphone sehr passend und reduziert den Implementierungsaufwand gegenueber einer vollstaendig manuellen Session-Verwaltung.
- Die Lautsprecherumschaltung ist optional und browserabhaengig.

## Typische Fehlerquellen bei SIP.js, WebRTC, Mikrofon und WSS

### 1. Die Registrierung klappt nicht

Moegliche Ursachen:

- Falscher SIP-Benutzername oder falsches Passwort
- Falscher SIP-Domain-/Hosteintrag
- Der WSS-Endpunkt der Telefonanlage ist nicht aktiv
- Zertifikatsprobleme bei `wss://`
- Die Anlage erlaubt keinen WebRTC-Transport fuer diesen Teilnehmer

Hinweis:
Im Debug-Bereich sieht man, ob die WebSocket-Verbindung aufgebaut wurde und ob der Server die Registrierung angenommen oder abgelehnt hat.

### 2. Der Browser fragt nicht nach dem Mikrofon oder blockiert es

Moegliche Ursachen:

- Die Seite laeuft nicht unter `https://` oder `http://localhost`
- Die Browserberechtigung wurde bereits abgelehnt
- Es ist kein Mikrofon verfuegbar
- Das Mikrofon ist durch ein anderes Programm blockiert

Hinweis:
Die Diagnose prueft den Mikrofonzugriff aktiv und schreibt das Ergebnis mit Details in den Debug-Bereich.

### 3. Es klingelt, aber es ist kein Ton zu hoeren

Moegliche Ursachen:

- Der Browser blockiert automatische Audiowiedergabe
- Das falsche Ausgabegeraet ist aktiv
- ICE/STUN/TURN bzw. NAT-Konfiguration ist unvollstaendig
- Die Telefonanlage bietet keinen passenden Codec an

Hinweis:
Die Schaltflaeche "Audiowiedergabe freischalten" hilft bei Browsern mit Autoplay-Sperren. Ausserdem kann die Audio-Ausgabe umgestellt werden, falls `setSinkId` verfuegbar ist.

### 4. WebSocket-/WSS-Probleme

Moegliche Ursachen:

- Falscher Pfad, Port oder Host fuer die WSS-URL
- Reverse Proxy leitet Upgrade-Requests nicht korrekt durch
- Das Zertifikat wird vom Browser nicht akzeptiert
- Firewall oder NAT blockiert den Port

Hinweis:
Die Diagnose versucht eine direkte WebSocket-Verbindung aufzubauen und zeigt einen Fehler frueh sichtbar an.

## Was an einer Telefonanlage wie Asterisk typischerweise vorhanden sein muss

Fuer eine Asterisk- oder Asterisk-kompatible Anlage sind ueblicherweise diese Punkte wichtig:

- Aktiviertes HTTP-/HTTPS-Modul fuer WebSocket-Zugriffe
- SIP ueber WebSocket oder Secure WebSocket (`ws`/`wss`)
- Ein WebRTC-faehiger SIP-Transport, oft `transport-wss`
- Ein Teilnehmer mit WebRTC-Unterstuetzung
- SRTP/DTLS und ICE-Unterstuetzung
- Passende Codecs wie mindestens Opus oder PCMU/PCMA
- Ein gueltiges Zertifikat fuer HTTPS/WSS, wenn nicht lokal auf `localhost` getestet wird

Bei Asterisk sieht das in der Praxis oft so aus:

- `http.conf` ist aktiv
- `pjsip.conf` enthaelt einen `transport-wss`
- Der Endpoint ist fuer WebRTC eingerichtet
- NAT-/RTP- und ICE-Einstellungen passen zur Netzstruktur

## Hinweise zum lokalen Testen

### Schnelltest lokal

1. `npm install`
2. `npm run dev`
3. Browser auf `https://localhost:5173` oeffnen
4. SIP-Daten eintragen
5. Auf "Diagnose pruefen" klicken
6. Dann auf "Verbinden" klicken

### Wichtige Browser-Hinweise

- `localhost` gilt im Browser meist als sicherer Kontext. Dadurch funktioniert `getUserMedia` auch ohne eigenes HTTPS-Zertifikat.
- Die Entwicklungsumgebung laeuft jetzt direkt per HTTPS und ist dadurch auch ueber das lokale Netzwerk nutzbar.
- Wenn die Anwendung von einem anderen Geraet im lokalen Netzwerk aufgerufen wird, verwende die HTTPS-Adresse des Laptops, zum Beispiel `https://192.168.x.x:5173` oder `https://RECHNERNAME:5173`.
- Auf weiteren Geraeten im LAN muss das lokale Entwicklungszertifikat bzw. die lokale CA gegebenenfalls ebenfalls vertraut werden, damit der Browser den Kontext als sicher akzeptiert.
- Fuer SIP ueber WebSocket sollte in realen Umgebungen in der Regel `wss://` verwendet werden.

### Sicherer Kontext und Browser-Mikrofon

Wenn die Seite nicht in einem sicheren Kontext laeuft, blockiert der Browser den Zugriff auf `navigator.mediaDevices.getUserMedia`. Die Anwendung zeigt dafuer nun im Diagnosebereich einen eigenen Eintrag "Sicherer Kontext" an.

Wichtig ist:

- `https://localhost:5173` ist fuer den lokalen Test der richtige Einstiegspunkt
- bei Zugriff ueber das LAN ebenfalls `https://...` verwenden
- bei einer HTTPS-Seite den SIP-WebSocket ebenfalls als `wss://...` konfigurieren

## Technische Erklaerung zur Medienverarbeitung

Die Anwendung uebergibt SIP.js ein HTML-Audio-Element. SIP.js baut intern die SIP-Signalisierung sowie die WebRTC-`RTCPeerConnection` auf. Sobald ein Gespraech angenommen wurde und die SDP-/ICE-Aushandlung erfolgreich abgeschlossen ist, wird der Remote-Medienstrom in das Audio-Element geleitet und dort abgespielt.

Wichtige Stellen im Code:

- `src/sip/browser-softphone-dienst.ts`
  - Initialisierung von SIP.js
  - Registrierung
  - Session- und Call-Handling
  - Audioeinbindung fuer den Remote-Stream
  - Fehlerbehandlung und SIP-Protokollierung
- `src/utils/diagnose.ts`
  - WebSocket-Erreichbarkeit
  - Mikrofonzugriff
  - Lautsprecherumschaltung
- `src/app.ts`
  - UI, Statusanzeige, Formularsteuerung und Debug-Bereich

## Bekannte Grenzen

- Die App ist bewusst fuer genau ein gleichzeitiges Gespraech ausgelegt.
- TURN-Server sind nicht separat konfigurierbar. Falls ein TURN-Server benoetigt wird, kann die `peerConnectionConfiguration` im SIP-Dienst leicht erweitert werden.
- Eingehende Rufnummern oder Display-Namen werden mit `SimpleUser` nicht so detailliert exponiert wie bei einer vollstaendig manuellen SIP.js-Session-Verwaltung.

## Weiterer Ausbau

Wenn spaeter gewuenscht, kann die Anwendung relativ einfach um diese Punkte erweitert werden:

- Halten und Fortsetzen
- DTMF-Tastenfeld
- TURN-Server-Konfiguration
- Ruflisten und lokale Verlaufsspeicherung
- Mehrere Leitungen oder Vermittlungsfunktionen
