# dk-opt-core
_dk-opt-core_ ist eine plattformunabhängige und vollständig in TypeScript/JavaScript realisierte Implementierung von OPT (Online-Personalisierung von Terminals) nach Vorgaben der Deutschen Kreditwirtschaft (DK).

Der derzeitige Implementierung unterstützt die Spezifikation gemäß der ZKA-Vorgaben aus dem Jahre 2004 unter Verwendung von Triple-DES und DES-Algorithmen. Es werden die Dialoge

- Vor-Initialisierung
- Initialisierung
- Personalisierung

unterstützt.

Alle benötigten HSM-Funktionen sind ebenfalls vollständig in TypeScript implementiert (siehe business/hsm.ts), können aber durch externe HSM-Aufrufe ersetzt werden (asynchrone Schnittstelle).

Nach Start von _dk_opt_core_ können die drei OPT-Phasen über HTTP GET /preint, /init bzw. /pers ausgeführt werden, des Weiteren sind unter /admin und /keystore administrative REST-Operationen verfügbar.

Eine grafische Oberfläche zur Ansteuerung aller Operationen ist unter [_dk_opt_ui_](https://github.com/potpiejimmy/dk-opt-ui) verfügbar.

## Installation

    npm install
    npm run build
    
## Start

    npm start

bzw.

    npm run develop

für Entwicklung mit nodemon-Autorestart.

## Web UI

Siehe [_dk_opt_ui_](https://github.com/potpiejimmy/dk-opt-ui)

## To Do

1. Chaining-Support
2. Quittungsnachricht, Tracenummern + genaue Abläufe gem. Kap. 7 OPT-Spec
3. Dechiffrierung von Nicht-Schlüssel-LDI-Daten mit KS_ENC
4. Außerbetriebnahme
