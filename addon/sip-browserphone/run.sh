#!/bin/sh
set -eu

CONFIG_PATH="/data/options.json"
WWW_DIR="/www"
RUNTIME_KONFIGURATION_PATH="${WWW_DIR}/runtime-konfiguration.json"

mkdir -p "${WWW_DIR}"

if [ ! -f "${CONFIG_PATH}" ]; then
  echo "Add-on-Optionen fehlen unter ${CONFIG_PATH}."
  exit 1
fi

AUTO_CONNECT="$(jq '.auto_connect // true' "${CONFIG_PATH}")"
RETRY_INTERVAL_SECONDS="$(jq '.retry_interval_seconds // 10' "${CONFIG_PATH}")"
DISPLAY_NAME="$(jq -r '.display_name // "Browserphone"' "${CONFIG_PATH}")"
SIP_USERNAME="$(jq -r '.sip_username // ""' "${CONFIG_PATH}")"
SIP_PASSWORD="$(jq -r '.sip_password // ""' "${CONFIG_PATH}")"
SIP_DOMAIN_HOST="$(jq -r '.sip_domain_host // ""' "${CONFIG_PATH}")"
WEBSOCKET_SERVER_URL="$(jq -r '.websocket_server_url // ""' "${CONFIG_PATH}")"
STUN_SERVER_URL="$(jq -r '.stun_server_url // ""' "${CONFIG_PATH}")"
DASHBOARD_TARGET="$(jq -r '.dashboard_target // "200"' "${CONFIG_PATH}")"

jq -n \
  --arg displayName "${DISPLAY_NAME}" \
  --arg sipUsername "${SIP_USERNAME}" \
  --arg sipPassword "${SIP_PASSWORD}" \
  --arg sipDomainHost "${SIP_DOMAIN_HOST}" \
  --arg websocketServerUrl "${WEBSOCKET_SERVER_URL}" \
  --arg stunServerUrl "${STUN_SERVER_URL}" \
  --arg dashboardTarget "${DASHBOARD_TARGET}" \
  --argjson autoConnect "${AUTO_CONNECT}" \
  --argjson retryIntervalSeconds "${RETRY_INTERVAL_SECONDS}" \
  '{
    bereitstellungsmodus: "home-assistant-addon",
    dashboard: {
      standardRufnummer: $dashboardTarget
    },
    festeStartanmeldung: {
      aktiviert: true,
      automatischVerbindenBeimStart: $autoConnect,
      wiederholungsintervallSekunden: $retryIntervalSeconds,
      konfiguration: {
        anzeigename: $displayName,
        sipBenutzername: $sipUsername,
        passwort: $sipPassword,
        sipDomainHost: $sipDomainHost,
        webSocketServerUrl: $websocketServerUrl,
        stunServerUrl: $stunServerUrl
      }
    }
  }' > "${RUNTIME_KONFIGURATION_PATH}"

echo "SIP Browserphone Add-on startet auf Port 8099."
echo "Runtime-Konfiguration geschrieben nach ${RUNTIME_KONFIGURATION_PATH}."

exec nginx -g "daemon off;"
