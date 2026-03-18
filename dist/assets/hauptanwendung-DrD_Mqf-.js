var f=Object.defineProperty;var m=(n,e,t)=>e in n?f(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var r=(n,e,t)=>m(n,typeof e!="symbol"?e+"":e,t);import{D as b,P as k,e as v,a as w,l as h,p as d,i as A,b as S,s as u,c as z,S as E,d as D,B as _,f as K,g as y,h as L,j as P,k as c,m as T,n as U,o as W,F}from"./tab-kommunikation-D0Zxd_8_.js";function a(n){return n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function B(n){return n.includes("Fehler")?"plakette plakette--fehler":n.includes("Registriert")||n.includes("Aktive Verbindung")||n==="Verbunden"?"plakette plakette--erfolg":n.includes("Eingehender")||n.includes("Ausgehender")||n.includes("aufgebaut")?"plakette plakette--warnung":n.includes("Bereit")?"plakette plakette--aktiv":"plakette plakette--neutral"}class V{constructor(e){r(this,"protokollspeicher",new k);r(this,"elemente");r(this,"debugKonsole");r(this,"softphoneDienst");r(this,"tabKommunikationskanal");r(this,"automatischerVerbindungsversuchTimerId");r(this,"automatischeWiederverbindungAktiv",!1);r(this,"verbindungsversuchLaeuft",!1);r(this,"letzteAutomatischeKonfiguration");r(this,"statuszustand",v());r(this,"diagnoseErgebnisse",[]);r(this,"audioAusgabegeraete",[]);r(this,"ausgewaehltesAudioAusgabegeraetId","default");this.wurzelElement=e,this.wurzelElement.innerHTML=this.erzeugeAnwendungsMarkup(),this.elemente=this.ermittleElemente(),this.debugKonsole=new b({protokollspeicher:this.protokollspeicher,titel:"Softphone Debug-Konsole",untertitel:"Live-Protokoll, Browserstatus und Verbindungsdaten fuer die Fehlersuche beim Kunden.",statusfelder:()=>this.ermittleDebugStatusfelder()})}starten(){var i;const e=w(),t=h(),s=e??t;this.setzeFormularwerte(s),this.diagnoseErgebnisse=[d()],this.initialisiereTabKommunikation(),this.bindeEreignisse(),this.protokollspeicher.abonnieren(()=>{this.renderProtokoll()}),this.renderStatus(),this.renderDiagnose(),this.renderProtokoll(),this.aktualisiereSchaltflaechenZustaende(),this.debugKonsole.einbinden(),this.aktualisiereAudioAusgabegeraete(),this.protokolliere("App","Start der Anwendung.","info"),(i=this.diagnoseErgebnisse[0])!=null&&i.erfolgreich||this.protokolliere("Diagnose",`${this.diagnoseErgebnisse[0].titel}: ${this.diagnoseErgebnisse[0].zusammenfassung}`,"fehler",this.diagnoseErgebnisse[0].details),A()&&S(s)&&(this.automatischeWiederverbindungAktiv=!0,this.letzteAutomatischeKonfiguration=s,u(s),this.sendeKonfigurationAnAndereTabs(s),this.protokolliere("App","Automatische Startverbindung ist aktiviert.","info"),this.verbinden(!0,s))}initialisiereTabKommunikation(){z()&&(this.tabKommunikationskanal=new BroadcastChannel(E),this.tabKommunikationskanal.addEventListener("message",e=>{var s,i;if(((s=e.data)==null?void 0:s.typ)!=="konfiguration-anfordern")return;const t=this.ermittleTeilbareKonfiguration();t&&((i=this.tabKommunikationskanal)==null||i.postMessage({typ:"konfiguration-bereit",konfiguration:t}))}))}ermittleTeilbareKonfiguration(){const e=h();if(e.sipBenutzername.trim()&&e.passwort&&e.sipDomainHost.trim()&&e.webSocketServerUrl.trim())return e;if(!this.elemente.anmeldungFormular.checkValidity())return;const t=this.liesKonfigurationAusFormular();if(!(!t.sipBenutzername.trim()||!t.passwort||!t.sipDomainHost.trim()||!t.webSocketServerUrl.trim()))return t}sendeKonfigurationAnAndereTabs(e){var t;(t=this.tabKommunikationskanal)==null||t.postMessage({typ:"konfiguration-aktualisiert",konfiguration:e})}stoppeAutomatischeWiederverbindung(){this.automatischerVerbindungsversuchTimerId&&(window.clearTimeout(this.automatischerVerbindungsversuchTimerId),this.automatischerVerbindungsversuchTimerId=void 0)}planeAutomatischeWiederverbindung(){if(!this.automatischeWiederverbindungAktiv||!this.letzteAutomatischeKonfiguration)return;this.stoppeAutomatischeWiederverbindung();const e=D(),t=Math.round(e/1e3);this.protokolliere("App",`Automatischer Verbindungsversuch wird in ${t} Sekunden wiederholt.`,"warnung"),this.automatischerVerbindungsversuchTimerId=window.setTimeout(()=>{this.automatischerVerbindungsversuchTimerId=void 0,this.letzteAutomatischeKonfiguration&&this.verbinden(!0,this.letzteAutomatischeKonfiguration)},e)}erzeugeAnwendungsMarkup(){return`
      <div class="seitenrahmen">
        <header class="kopfbereich">
          <div>
            <p class="ueberzeile">SIP.js Browser-Softphone</p>
            <h1 class="titel">Telefonie im Browser mit klarer Diagnose</h1>
            <p class="untertitel">
              Anmeldung, Registrierung, Waehlfeld, Gespraechssteuerung und ein sichtbarer Debug-Bereich
              fuer SIP-, WebSocket- und Audiofehler in einer kompakten Oberflaeche.
            </p>
          </div>
          <div class="signalgruppe">
            <article class="signalkarte">
              <p class="signalkarte__label">Transport</p>
              <p class="signalkarte__wert"><span id="transport-plakette" class="plakette plakette--neutral">Getrennt</span></p>
            </article>
            <article class="signalkarte">
              <p class="signalkarte__label">Registrierung</p>
              <p class="signalkarte__wert"><span id="registrierung-plakette" class="plakette plakette--neutral">Nicht registriert</span></p>
            </article>
            <article class="signalkarte">
              <p class="signalkarte__label">Gespraech</p>
              <p class="signalkarte__wert"><span id="gespraech-plakette" class="plakette plakette--aktiv">Bereit</span></p>
            </article>
          </div>
        </header>

        <main class="inhalt">
          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Anmeldung</h2>
                <p>SIP-Zugangsdaten und WebRTC-/WSS-Konfiguration fuer die Verbindung zur Telefonanlage.</p>
              </div>
            </div>

            <form id="anmeldung-form" autocomplete="on">
              <div class="formularraster">
                <div class="feldgruppe">
                  <label for="anzeigename">Anzeigename</label>
                  <input id="anzeigename" name="anzeigename" type="text" placeholder="z. B. Empfang Browser" />
                </div>

                <div class="feldgruppe">
                  <label for="sip-benutzername">SIP-Benutzername</label>
                  <input id="sip-benutzername" name="sip-benutzername" type="text" required placeholder="1001" />
                </div>

                <div class="feldgruppe">
                  <label for="passwort">Passwort</label>
                  <input id="passwort" name="passwort" type="password" required placeholder="SIP-Passwort" />
                </div>

                <div class="feldgruppe">
                  <label for="sip-domain-host">SIP-Domain / Host</label>
                  <input id="sip-domain-host" name="sip-domain-host" type="text" required placeholder="pbx.beispiel.de" />
                </div>

                <div class="feldgruppe feldgruppe--voll">
                  <label for="websocket-server-url">WebSocket-Server-URL</label>
                  <input
                    id="websocket-server-url"
                    name="websocket-server-url"
                    type="url"
                    required
                    placeholder="wss://pbx.beispiel.de:8089/ws"
                  />
                </div>

                <div class="feldgruppe feldgruppe--voll">
                  <label for="stun-server-url">STUN-Server (optional)</label>
                  <input
                    id="stun-server-url"
                    name="stun-server-url"
                    type="text"
                    placeholder="stun:stun.l.google.com:19302"
                  />
                  <p class="hinweistext">Wenn leer, verwendet SIP.js die Standardkonfiguration des Browsers bzw. der Bibliothek.</p>
                </div>
              </div>

              <div class="aktionsleiste">
                <button id="verbinden-schaltflaeche" type="button">Verbinden</button>
                <button id="trennen-schaltflaeche" type="button" class="sekundaer">Trennen</button>
                <button id="diagnose-schaltflaeche" type="button" class="sekundaer">Diagnose pruefen</button>
              </div>
            </form>
          </section>

          <div class="zwei-spalten">
            <section class="karte">
              <div class="kartenkopf">
                <div>
                  <h2>Status</h2>
                  <p>Aktuelle Zustaende fuer Registrierung, Verbindung und laufendes Gespraech.</p>
                </div>
              </div>

              <div class="statusraster">
                <article class="statusfeld">
                  <p class="statusfeld__label">Aktive Leitung</p>
                  <p id="aktive-leitung-wert" class="statusfeld__wert">Nein</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Gespraechsdauer</p>
                  <p id="gespraechsdauer-wert" class="statusfeld__wert">00:00</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Registrierte Adresse</p>
                  <p id="registrierte-adresse-wert" class="statusfeld__wert statusfeld__wert--normal">Noch nicht verbunden</p>
                </article>
                <article class="statusfeld">
                  <p class="statusfeld__label">Aktuelles Gespraechsziel</p>
                  <p id="aktuelles-gespraechsziel-wert" class="statusfeld__wert statusfeld__wert--normal">Kein aktives Ziel</p>
                </article>
                <article class="statusfeld" style="grid-column: 1 / -1;">
                  <p class="statusfeld__label">Letzte Fehlermeldung</p>
                  <p id="letzte-fehlermeldung-wert" class="statusfeld__wert statusfeld__wert--normal">Keine Fehler gemeldet</p>
                </article>
              </div>
            </section>

            <section class="karte">
              <div class="kartenkopf">
                <div>
                  <h2>Waehlfeld und Steuerung</h2>
                  <p>Anrufe starten, eingehende Gespraeche steuern und Mikrofon stummschalten.</p>
                </div>
              </div>

              <div class="wahlzeile">
                <div class="feldgruppe">
                  <label for="rufnummer">Rufnummer oder SIP-Ziel</label>
                  <input id="rufnummer" name="rufnummer" type="text" placeholder="z. B. 1002 oder sip:1002@pbx.beispiel.de" />
                </div>
                <button id="anrufen-schaltflaeche" type="button">Anruf starten</button>
              </div>

              <div class="steuerleiste">
                <button id="annehmen-schaltflaeche" type="button">Annehmen</button>
                <button id="ablehnen-schaltflaeche" type="button" class="warnung">Ablehnen</button>
                <button id="auflegen-schaltflaeche" type="button" class="fehler">Auflegen</button>
                <button id="stumm-schaltflaeche" type="button" class="sekundaer">Stummschalten</button>
              </div>

              <div class="feldgruppe" style="margin-top: 18px;">
                <label for="lautsprecher-auswahl">Audio-Ausgabe / Lautsprecher</label>
                <select id="lautsprecher-auswahl"></select>
                <p id="lautsprecher-hinweis" class="hinweistext">Die Lautsprecherumschaltung wird geprueft.</p>
              </div>
            </section>
          </div>

          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Audio / Gegensprechen</h2>
                <p>Das Remote-Audio wird in diesem HTML-Audio-Element abgespielt. Einige Browser verlangen dafuer eine aktive Benutzerinteraktion.</p>
              </div>
              <button id="audio-freischalten-schaltflaeche" type="button" class="sekundaer">Audiowiedergabe freischalten</button>
            </div>

            <p class="audiohinweis">
              Nach Gespraechsstart oder Gespraechsannahme bindet SIP.js den per WebRTC ausgehandelten Remote-Medienstrom
              an dieses Audio-Element. Falls der Browser Autoplay blockiert, hilft die Freischaltung per Klick.
            </p>
            <audio id="fern-audio-element" class="audioelement" controls autoplay playsinline></audio>
          </section>

          <section class="karte">
            <div class="kartenkopf">
              <div>
                <h2>Debug / Diagnose</h2>
                <p>Zeitgestempelte Meldungen fuer Transport, Registrierung, Medienfreigabe und SIP-Ablaeufe.</p>
              </div>
            </div>

            <div id="diagnose-uebersicht" class="diagnoseraster"></div>

            <div class="protokollkopf">
              <strong>Protokoll</strong>
              <button id="protokoll-leeren-schaltflaeche" type="button" class="sekundaer">Protokoll leeren</button>
            </div>
            <div id="protokoll-liste" class="protokollliste"></div>
          </section>
        </main>
      </div>
    `}ermittleElemente(){const e=t=>{const s=this.wurzelElement.querySelector(t);if(!s)throw new Error(`Oberflaechenelement fehlt: ${t}`);return s};return{anmeldungFormular:e("#anmeldung-form"),anzeigenameEingabe:e("#anzeigename"),sipBenutzernameEingabe:e("#sip-benutzername"),passwortEingabe:e("#passwort"),sipDomainHostEingabe:e("#sip-domain-host"),webSocketServerUrlEingabe:e("#websocket-server-url"),stunServerUrlEingabe:e("#stun-server-url"),verbindenSchaltflaeche:e("#verbinden-schaltflaeche"),trennenSchaltflaeche:e("#trennen-schaltflaeche"),diagnoseSchaltflaeche:e("#diagnose-schaltflaeche"),rufnummerEingabe:e("#rufnummer"),anrufenSchaltflaeche:e("#anrufen-schaltflaeche"),annehmenSchaltflaeche:e("#annehmen-schaltflaeche"),ablehnenSchaltflaeche:e("#ablehnen-schaltflaeche"),auflegenSchaltflaeche:e("#auflegen-schaltflaeche"),stummSchaltflaeche:e("#stumm-schaltflaeche"),audioFreischaltenSchaltflaeche:e("#audio-freischalten-schaltflaeche"),lautsprecherAuswahl:e("#lautsprecher-auswahl"),lautsprecherHinweis:e("#lautsprecher-hinweis"),fernAudioElement:e("#fern-audio-element"),diagnoseUebersicht:e("#diagnose-uebersicht"),protokollListe:e("#protokoll-liste"),protokollLeerenSchaltflaeche:e("#protokoll-leeren-schaltflaeche"),transportPlakette:e("#transport-plakette"),registrierungPlakette:e("#registrierung-plakette"),gespraechPlakette:e("#gespraech-plakette"),aktiveLeitungWert:e("#aktive-leitung-wert"),gespraechsdauerWert:e("#gespraechsdauer-wert"),registrierteAdresseWert:e("#registrierte-adresse-wert"),aktuellesGespraechszielWert:e("#aktuelles-gespraechsziel-wert"),letzteFehlermeldungWert:e("#letzte-fehlermeldung-wert")}}bindeEreignisse(){var e,t;this.elemente.verbindenSchaltflaeche.addEventListener("click",()=>{this.verbinden()}),this.elemente.trennenSchaltflaeche.addEventListener("click",()=>{this.trennen()}),this.elemente.diagnoseSchaltflaeche.addEventListener("click",()=>{this.fuehreDiagnoseAus()}),this.elemente.anrufenSchaltflaeche.addEventListener("click",()=>{this.starteAnruf()}),this.elemente.annehmenSchaltflaeche.addEventListener("click",()=>{this.nehmeAnrufAn()}),this.elemente.ablehnenSchaltflaeche.addEventListener("click",()=>{this.lehneAnrufAb()}),this.elemente.auflegenSchaltflaeche.addEventListener("click",()=>{this.legeAuf()}),this.elemente.stummSchaltflaeche.addEventListener("click",()=>{var s;(s=this.softphoneDienst)==null||s.schalteStummUm(),this.softphoneDienst&&(this.statuszustand=this.softphoneDienst.aktuellerStatus(),this.renderStatus(),this.aktualisiereSchaltflaechenZustaende())}),this.elemente.audioFreischaltenSchaltflaeche.addEventListener("click",()=>{this.versucheAudioFreizuschalten()}),this.elemente.lautsprecherAuswahl.addEventListener("change",()=>{this.wechsleAudioAusgabegeraet()}),this.elemente.protokollLeerenSchaltflaeche.addEventListener("click",()=>{this.protokollspeicher.leeren(),this.renderProtokoll(),this.protokolliere("App","Protokoll wurde geleert.","info")}),this.elemente.rufnummerEingabe.addEventListener("keydown",s=>{s.key==="Enter"&&(s.preventDefault(),this.starteAnruf())}),(t=(e=navigator.mediaDevices)==null?void 0:e.addEventListener)==null||t.call(e,"devicechange",()=>{this.aktualisiereAudioAusgabegeraete()})}async verbinden(e=!1,t){if(this.verbindungsversuchLaeuft||!t&&!this.elemente.anmeldungFormular.reportValidity())return;const s=t??this.liesKonfigurationAusFormular();this.verbindungsversuchLaeuft=!0,this.stoppeAutomatischeWiederverbindung(),this.letzteAutomatischeKonfiguration=s,u(s),this.sendeKonfigurationAnAndereTabs(s),this.protokolliere("App",e?"Automatischer Verbindungsversuch wurde ausgeloest.":"Versuch der Verbindung wurde ausgeloest.","info"),this.softphoneDienst&&await this.softphoneDienst.trennen(!0),this.softphoneDienst=new _(this.elemente.fernAudioElement,{protokolliere:(i,o,l="info",p)=>{this.protokolliere(i,o,l,p)},statusGeaendert:i=>{this.statuszustand=i,this.renderStatus(),this.aktualisiereSchaltflaechenZustaende()}});try{await this.softphoneDienst.verbindenUndRegistrieren(s),u(s),this.sendeKonfigurationAnAndereTabs(s),await this.aktualisiereAudioAusgabegeraete()}catch(i){this.protokolliere("App","Die Verbindung konnte nicht vollstaendig aufgebaut werden.","fehler",i instanceof Error?i.message:"Unbekannter Verbindungsfehler"),this.automatischeWiederverbindungAktiv&&this.planeAutomatischeWiederverbindung()}finally{this.verbindungsversuchLaeuft=!1}}async trennen(){if(this.automatischeWiederverbindungAktiv=!1,this.letzteAutomatischeKonfiguration=void 0,this.stoppeAutomatischeWiederverbindung(),!this.softphoneDienst){this.protokolliere("App","Es besteht derzeit keine aktive SIP-Verbindung.","warnung");return}await this.softphoneDienst.trennen(),this.softphoneDienst=void 0,this.protokolliere("App","Verbindung wurde getrennt.","info")}async starteAnruf(){const e=this.elemente.rufnummerEingabe.value.trim();if(!e){this.protokolliere("App","Bitte zuerst eine Rufnummer oder SIP-Adresse eingeben.","warnung"),this.elemente.rufnummerEingabe.focus();return}if(!this.softphoneDienst){this.protokolliere("App","Vor dem Anruf muss zuerst eine SIP-Verbindung aufgebaut werden.","warnung");return}try{await this.softphoneDienst.starteAnruf(e)}catch(t){this.protokolliere("SIP","Anruf konnte nicht gestartet werden.","fehler",t instanceof Error?t.message:"Unbekannter Fehler")}}async nehmeAnrufAn(){if(!this.softphoneDienst){this.protokolliere("App","Es liegt kein steuerbarer Anruf vor.","warnung");return}try{await this.softphoneDienst.nehmeEingehendenAnrufAn()}catch(e){this.protokolliere("Audio","Eingehender Anruf konnte nicht angenommen werden.","fehler",e instanceof Error?e.message:"Unbekannter Fehler")}}async lehneAnrufAb(){if(!this.softphoneDienst){this.protokolliere("App","Es liegt kein eingehender Anruf vor.","warnung");return}try{await this.softphoneDienst.lehneEingehendenAnrufAb()}catch(e){this.protokolliere("SIP","Eingehender Anruf konnte nicht abgelehnt werden.","fehler",e instanceof Error?e.message:"Unbekannter Fehler")}}async legeAuf(){if(!this.softphoneDienst){this.protokolliere("App","Es gibt aktuell kein Gespräch zum Auflegen.","warnung");return}try{await this.softphoneDienst.legeAuf()}catch(e){this.protokolliere("SIP","Gespräch konnte nicht beendet werden.","fehler",e instanceof Error?e.message:"Unbekannter Fehler")}}async fuehreDiagnoseAus(e){const t=e??this.liesKonfigurationAusFormular(),s=d(),i=await K();this.diagnoseErgebnisse=[s,i],this.renderDiagnose(),this.protokolliere("Diagnose","Diagnosepruefung gestartet.","info");for(const l of[s,i])this.protokolliere(l.titel==="Mikrofon"?"Audio":"Diagnose",`${l.titel}: ${l.zusammenfassung}`,l.erfolgreich?"erfolg":"fehler",l.details);if(!t.webSocketServerUrl.trim()){this.protokolliere("Diagnose","Fuer den separaten WebSocket-Test wird eine WebSocket-Server-URL benoetigt.","warnung"),this.elemente.webSocketServerUrlEingabe.focus(),await this.aktualisiereAudioAusgabegeraete();return}const o=await y({webSocketServerUrl:t.webSocketServerUrl});this.protokolliere("Diagnose",`Separater WebSocket-Test: ${o.zusammenfassung}`,o.erfolgreich?"erfolg":"warnung",o.details),await this.aktualisiereAudioAusgabegeraete()}async aktualisiereAudioAusgabegeraete(){if(!L(this.elemente.fernAudioElement)){this.audioAusgabegeraete=[],this.elemente.lautsprecherAuswahl.innerHTML='<option value="nicht-verfuegbar">Nicht vom Browser unterstützt</option>',this.elemente.lautsprecherAuswahl.disabled=!0,this.elemente.lautsprecherHinweis.textContent="Dieser Browser erlaubt keine direkte Umschaltung der Audio-Ausgabe. Meist ist dafür HTTPS und setSinkId-Unterstützung erforderlich.";return}this.audioAusgabegeraete=await P(),this.elemente.lautsprecherAuswahl.disabled=!1,this.elemente.lautsprecherHinweis.textContent="Wenn mehrere Ausgabegeräte sichtbar sind, kann das Remote-Audio direkt auf einen Lautsprecher gelegt werden.";const t=['<option value="default">Standardausgabe des Browsers</option>',...this.audioAusgabegeraete.map(s=>`<option value="${a(s.geraeteId)}">${a(s.bezeichnung)}</option>`)];this.elemente.lautsprecherAuswahl.innerHTML=t.join(""),this.elemente.lautsprecherAuswahl.value=this.ausgewaehltesAudioAusgabegeraetId}async wechsleAudioAusgabegeraet(){const e=this.elemente.lautsprecherAuswahl.value;try{if(e==="default"){await c(this.elemente.fernAudioElement,"default"),this.ausgewaehltesAudioAusgabegeraetId="default",this.protokolliere("Audio","Standard-Audioausgabe wurde ausgewählt.","erfolg");return}await c(this.elemente.fernAudioElement,e),this.ausgewaehltesAudioAusgabegeraetId=e,this.protokolliere("Audio","Audio-Ausgabegerät wurde umgeschaltet.","erfolg",e)}catch(t){this.protokolliere("Audio","Audio-Ausgabegerät konnte nicht gesetzt werden.","fehler",t instanceof Error?t.message:"Unbekannter Fehler")}}async versucheAudioFreizuschalten(){try{if(!this.elemente.fernAudioElement.srcObject){this.protokolliere("Audio","Audiowiedergabe wurde voraktiviert. Ein aktiver Remote-Stream liegt noch nicht an.","info");return}await this.elemente.fernAudioElement.play(),this.protokolliere("Audio","Remote-Audio wurde manuell gestartet.","erfolg")}catch(e){this.protokolliere("Audio","Remote-Audio konnte nicht freigeschaltet werden.","fehler",e instanceof Error?e.message:"Unbekannter Fehler")}}renderStatus(){this.renderPlakette(this.elemente.transportPlakette,this.statuszustand.transportstatus),this.renderPlakette(this.elemente.registrierungPlakette,this.statuszustand.registrierungsstatus),this.renderPlakette(this.elemente.gespraechPlakette,this.statuszustand.gespraechsstatus),this.elemente.aktiveLeitungWert.textContent=this.statuszustand.aktiveVerbindung?"Ja":"Nein",this.elemente.gespraechsdauerWert.textContent=T(this.statuszustand.gespraechsdauerSekunden),this.elemente.registrierteAdresseWert.textContent=this.statuszustand.registrierteAdresse||"Noch nicht verbunden",this.elemente.aktuellesGespraechszielWert.textContent=this.statuszustand.aktuellesGespraechsziel||"Kein aktives Ziel",this.elemente.letzteFehlermeldungWert.textContent=this.statuszustand.letzteFehlermeldung||"Keine Fehler gemeldet"}renderDiagnose(){if(this.diagnoseErgebnisse.length===0){this.elemente.diagnoseUebersicht.innerHTML=`
        <article class="diagnosekarte">
          <h3>Noch keine Diagnose</h3>
          <p>Die Diagnose erscheint nach einem Klick auf "Diagnose pruefen".</p>
          <p class="diagnosekarte__details">Die Karten zeigen nur den aktuellen Sicherheits- und Mikrofonzustand der Seite.</p>
        </article>
      `;return}this.elemente.diagnoseUebersicht.innerHTML=this.diagnoseErgebnisse.map(e=>{const t=e.erfolgreich?"plakette plakette--erfolg":"plakette plakette--fehler";return`
          <article class="diagnosekarte">
            <div class="protokolleintrag__kopf">
              <h3>${a(e.titel)}</h3>
              <span class="${t}">${e.erfolgreich?"OK":"Fehler"}</span>
            </div>
            <p>${a(e.zusammenfassung)}</p>
            <p class="diagnosekarte__details">${a(e.details??"Keine zusätzlichen Details.")}</p>
          </article>
        `}).join("")}renderProtokoll(){const e=this.protokollspeicher.alleEintraege();if(e.length===0){this.elemente.protokollListe.innerHTML='<div class="protokolleer">Noch keine Protokolleinträge vorhanden.</div>';return}this.elemente.protokollListe.innerHTML=e.map(t=>this.erzeugeProtokolleintragMarkup(t)).join("")}erzeugeProtokolleintragMarkup(e){const t=e.ebene==="erfolg"?"plakette plakette--erfolg":e.ebene==="warnung"?"plakette plakette--warnung":e.ebene==="fehler"?"plakette plakette--fehler":"plakette plakette--neutral";return`
      <article class="protokolleintrag">
        <div class="protokolleintrag__kopf">
          <span class="protokolleintrag__zeit">${a(e.zeitstempel)}</span>
          <span class="protokolleintrag__bereich">${a(e.bereich)}</span>
          <span class="${t}">${a(e.ebene.toUpperCase())}</span>
        </div>
        <p class="protokolleintrag__text">${a(e.nachricht)}</p>
        ${e.details?`<p class="protokolleintrag__details">${a(e.details)}</p>`:""}
      </article>
    `}renderPlakette(e,t){e.className=B(t),e.textContent=t}aktualisiereSchaltflaechenZustaende(){const e=this.statuszustand.transportstatus==="Verbunden"||this.statuszustand.transportstatus==="Verbindung wird aufgebaut",t=this.statuszustand.registrierungsstatus==="Registriert",s=this.statuszustand.aktiveVerbindung||this.statuszustand.ausgehenderAnruf||this.statuszustand.eingehenderAnruf;this.elemente.verbindenSchaltflaeche.disabled=e,this.elemente.trennenSchaltflaeche.disabled=!this.softphoneDienst&&!e,this.elemente.anrufenSchaltflaeche.disabled=!t||s,this.elemente.annehmenSchaltflaeche.disabled=!this.statuszustand.eingehenderAnruf,this.elemente.ablehnenSchaltflaeche.disabled=!this.statuszustand.eingehenderAnruf,this.elemente.auflegenSchaltflaeche.disabled=!this.statuszustand.aktiveVerbindung&&!this.statuszustand.ausgehenderAnruf,this.elemente.stummSchaltflaeche.disabled=!this.statuszustand.aktiveVerbindung,this.elemente.stummSchaltflaeche.textContent=this.statuszustand.stummgeschaltet?"Stummschaltung aufheben":"Stummschalten"}liesKonfigurationAusFormular(){return{anzeigename:this.elemente.anzeigenameEingabe.value.trim(),sipBenutzername:this.elemente.sipBenutzernameEingabe.value.trim(),passwort:this.elemente.passwortEingabe.value,sipDomainHost:this.elemente.sipDomainHostEingabe.value.trim(),webSocketServerUrl:this.elemente.webSocketServerUrlEingabe.value.trim(),stunServerUrl:this.elemente.stunServerUrlEingabe.value.trim()||void 0}}setzeFormularwerte(e){const t={...U(),...e};this.elemente.anzeigenameEingabe.value=t.anzeigename,this.elemente.sipBenutzernameEingabe.value=t.sipBenutzername,this.elemente.passwortEingabe.value=t.passwort,this.elemente.sipDomainHostEingabe.value=t.sipDomainHost,this.elemente.webSocketServerUrlEingabe.value=t.webSocketServerUrl,this.elemente.stunServerUrlEingabe.value=t.stunServerUrl??""}protokolliere(e,t,s="info",i){this.protokollspeicher.hinzufuegen(e,t,s,i)}ermittleDebugStatusfelder(){const e=this.liesKonfigurationAusFormular();return[{bezeichnung:"Build-Modus",wert:"production"},{bezeichnung:"Transport",wert:this.statuszustand.transportstatus},{bezeichnung:"Registrierung",wert:this.statuszustand.registrierungsstatus},{bezeichnung:"Gespraech",wert:this.statuszustand.gespraechsstatus},{bezeichnung:"Aktive Verbindung",wert:this.statuszustand.aktiveVerbindung?"Ja":"Nein"},{bezeichnung:"Stummgeschaltet",wert:this.statuszustand.stummgeschaltet?"Ja":"Nein"},{bezeichnung:"SIP-Benutzer",wert:e.sipBenutzername||"Nicht gesetzt"},{bezeichnung:"SIP-Domain",wert:e.sipDomainHost||"Nicht gesetzt"},{bezeichnung:"WSS-URL",wert:e.webSocketServerUrl||"Nicht gesetzt"},{bezeichnung:"STUN",wert:e.stunServerUrl||"Nicht gesetzt"},{bezeichnung:"Aktuelles Ziel",wert:this.statuszustand.aktuellesGespraechsziel||this.elemente.rufnummerEingabe.value.trim()||"Keins"}]}}const g=document.querySelector("#app");if(!g)throw new Error("Das Wurzelelement der Anwendung wurde nicht gefunden.");(async()=>(await W(F.konfiguration),new V(g).starten()))();
