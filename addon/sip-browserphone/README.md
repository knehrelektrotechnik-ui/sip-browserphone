# SIP Browserphone Add-on

Dieses Add-on liefert die Browserphone-Webanwendung per Home-Assistant-Ingress aus.

## Arbeitsweise

- Home Assistant zeigt die App ueber Ingress im eigenen UI an.
- Das Add-on erzeugt beim Start eine `runtime-konfiguration.json` aus den Add-on-Optionen.
- Die Webanwendung uebernimmt diese Daten automatisch und verbindet sich damit beim Start.
- Die kompakte Dashboard-Steuerung ist zusaetzlich ueber den Ingress-Pfad `/dashboard` erreichbar.
- Der Endpunkt `/ingress-info` liefert den aktuellen Ingress-Basispfad und den daraus abgeleiteten Dashboard-Pfad als JSON.

## Wichtige Dateien

- `config.yaml`: Add-on-Metadaten und Optionen
- `run.sh`: erzeugt die Laufzeit-Konfiguration
- `nginx.conf`: statische Auslieferung ueber Port `8099`
- `www/`: erzeugte Vite-Builddateien fuer das Add-on
