# Installation in Home Assistant OS

Diese Anleitung beschreibt den praktischen Einsatz des Add-ons auf einem Kunden-System mit Home Assistant OS.

## 1. Add-on-Repository bereitstellen

Dieses Projekt ist als Home-Assistant-App-Repository vorbereitet. Vor dem Kundeneinsatz:

1. `npm run build:addon` ausfuehren.
2. Das Projekt in ein Git-Repository legen, zum Beispiel auf GitHub.
3. Sicherstellen, dass diese Dateien im Repository enthalten sind:
   - `repository.yaml`
   - `addon/sip-browserphone/config.yaml`
   - `addon/sip-browserphone/Dockerfile`
   - `addon/sip-browserphone/run.sh`
   - `addon/sip-browserphone/www/`

## 2. Repository in Home Assistant hinzufuegen

Laut Home-Assistant-Developer-Doku kann ein Repository ueber die App-/Add-on-Verwaltung hinzugefuegt werden.

Vorgehen:

1. In Home Assistant `Settings > Apps` oeffnen.
2. Oben rechts das Menue fuer Repositories/App-Store oeffnen.
3. Die Git-URL deines Repositories einfuegen.
4. Speichern.

Danach sollte das Add-on `SIP Browserphone` im Store sichtbar sein.

## 3. Add-on installieren

1. `SIP Browserphone` oeffnen.
2. `Install` waehlen.
3. Nach der Installation die Konfiguration setzen.

Empfohlene Optionen:

- `auto_connect`: `true`
- `retry_interval_seconds`: `10`
- `display_name`: z. B. `Empfang`
- `sip_username`: SIP-Benutzer
- `sip_password`: SIP-Passwort
- `sip_domain_host`: Host oder Domain deiner Asterisk-Instanz
- `websocket_server_url`: z. B. `wss://pbx.kunde.de:8089/ws`
- `stun_server_url`: z. B. `stun:stun.l.google.com:19302`
- `dashboard_target`: Standard-Ziel fuer die Dashboard-Steuerung, z. B. `200`

Dann:

1. `Save`
2. `Start`
3. `Open Web UI`

## 4. Erster Funktionstest

Nach `Open Web UI` sollte die Hauptanwendung erscheinen und sich automatisch mit den Add-on-Optionen verbinden.

Pruefen:

1. Transportstatus wird `Verbunden`
2. Registrierungsstatus wird `Registriert`
3. `Diagnose pruefen` meldet sicheren Kontext und Mikrofonzugriff
4. Debug-Konsole unten rechts zeigt die Laufzeitdaten und das Live-Protokoll

Wenn etwas nicht funktioniert:

- Add-on-Logs in Home Assistant pruefen
- Debug-Konsole der App exportieren
- kontrollieren, ob Home Assistant selbst per HTTPS mit vertrautem Zertifikat geoeffnet wurde
- kontrollieren, ob Asterisk per `wss://` mit gueltigem Zertifikat erreichbar ist

## 5. Dashboard-Steuerung einbetten

Home Assistant dokumentiert fuer Dashboards die `Webpage card` mit `allow`-Attribut, unter anderem fuer `microphone`.

Die Dashboard-Seite deiner App liegt innerhalb des Add-ons unter:

```text
dashboard-steuerung.html
```

Wichtig:

- Die Ingress-Basis-URL wird von Home Assistant erzeugt.
- Sie ist nicht einfach eine feste lokale URL wie `/local/...`.
- Deshalb muss zuerst die Add-on-Weboberflaeche einmal ueber `Open Web UI` geoeffnet werden.

## 6. Ingress-Basis-URL ermitteln

1. Im Add-on auf `Open Web UI` klicken.
2. Die im Browser geoeffnete Add-on-URL kopieren.
3. Diese URL ist die Basis der Hauptanwendung.
4. Fuer die Dashboard-Steuerung einfach `dashboard-steuerung.html` daran anhaengen.

Beispiel:

Wenn `Open Web UI` auf etwas in dieser Art zeigt:

```text
https://ha-kunde.example.com/api/hassio_ingress/abc123def456/
```

dann ist die Dashboard-URL:

```text
https://ha-kunde.example.com/api/hassio_ingress/abc123def456/dashboard-steuerung.html
```

Optional mit Zielnummer:

```text
https://ha-kunde.example.com/api/hassio_ingress/abc123def456/dashboard-steuerung.html?ziel=200
```

Hinweis:

- Der genaue Ingress-Pfad wird von Home Assistant verwaltet.
- Falls sich dieser Pfad nach Updates oder neuer Anmeldung aendert, muss die Dashboard-URL erneut geprueft werden.

## 7. Lovelace-Webpage-Card

Offizielle Home-Assistant-Doku:

- `type: iframe`
- `url`
- `allow`
- `disable_sandbox` optional

Beispiel fuer die Karte:

```yaml
type: iframe
title: SIP Dashboard
url: https://ha-kunde.example.com/api/hassio_ingress/abc123def456/dashboard-steuerung.html?ziel=200
aspect_ratio: 35%
allow: microphone; autoplay
```

Wenn die Darstellung moeglichst kompakt sein soll:

```yaml
type: iframe
url: https://ha-kunde.example.com/api/hassio_ingress/abc123def456/dashboard-steuerung.html?ziel=200
aspect_ratio: 25%
allow: microphone; autoplay
hide_background: true
```

## 8. Wichtige Hinweise fuer das Dashboard

- Die Home-Assistant-Doku weist darauf hin, dass bei einer HTTPS-Instanz keine HTTP-Seiten eingebettet werden koennen.
- Fuer Mikrofon und WebRTC muss die Seite in einem sicheren Kontext laufen.
- Darum sollte auch Home Assistant selbst per HTTPS mit vertrautem Zertifikat laufen.
- Falls der Browser im `iframe` das Mikrofon blockiert, zuerst die Hauptoberflaeche des Add-ons direkt oeffnen und dort testen.
- Die Debug-Konsole ist auch in der Dashboard-Steuerung verfuegbar.

## 9. Empfohlener Rollout-Ablauf bei Kunden

1. Add-on installieren
2. SIP-Daten in den Optionen eintragen
3. Add-on starten
4. Hauptoberflaeche testen
5. Debug-Konsole pruefen
6. Dashboard-URL aus der laufenden Ingress-URL ableiten
7. Webpage-Card im Dashboard anlegen
8. Anruf, Audio und Mikrofon direkt im Kundensystem testen

## Quellen

- Home Assistant Apps / Add-ons: https://www.home-assistant.io/apps/
- Home Assistant Webpage Card: https://www.home-assistant.io/dashboards/iframe/
- Home Assistant Developer Docs, App repository: https://developers.home-assistant.io/docs/add-ons/repository
- Home Assistant Developer Docs, App configuration: https://developers.home-assistant.io/docs/add-ons/configuration/
- Home Assistant Developer Docs, Ingress: https://developers.home-assistant.io/docs/add-ons/presentation
