# ScheduleIT (PWA)

Ett schema med en stor "pågår nu"-vy som rattas med tummen, dag-växling i sidled,
och tryck-för-detalj. Installerbar och offline-kapabel.

## Filer
- `index.html` – appen
- `schedule.json` – **schemat** (det appen visar); byt denna fil för att uppdatera innehållet
- `manifest.webmanifest` – app-metadata (namn, ikoner, fullskärm)
- `sw.js` – service worker (offline-cache)
- `icon-*.png` – app-ikoner

## Så uppdaterar du schemat
Besökare matar inte in något. Du redigerar schemat och byter ut `schedule.json`:
1. Öppna appen, tryck **✎ Redigera** uppe till vänster.
2. Skriv/klistra in i formatet `tid | titel | plats | presentatörer | beskrivning`
   (allt utom tid/titel valfritt). Ny dag med `# ÅÅÅÅ-MM-DD Namn` — datumet avgör
   vilken dag som är "idag".
3. **Förhandsgranska** för att se det direkt, eller **Ladda ner schedule.json**.
4. Lägg den nedladdade `schedule.json` i repo-roten (ersätt den gamla) och pusha.

Appen hämtar `schedule.json` vid start (annars ett inbyggt exempel). Varje dag har
ett **datum**; appen jämför datum + klockslag med enhetens tid för att avgöra vilken
dag som är idag och vilken punkt som pågår. Ligger inget datum på idag öppnas närmaste
dag utan "pågår nu"-märke.
(Redigera-vyn är ett författarverktyg – i en skarp version tar du bort knappen.)


## Alternativ: editor.html (formulär i stället för text)
`editor.html` är en fristående författarsida med inmatningsfält per punkt.
Fyll i, eller ladda en befintlig `schedule.json` för att ändra den (med datumfält per dag), och tryck
**Ladda ner schedule.json**. Den behöver ingen server – öppna den lokalt på datorn
eller lägg den bredvid appen. Den är bara ett verktyg för dig, inte en besökarvy.

## Publicera på GitHub Pages
1. Nytt repo (t.ex. `scheduleit`), lägg **alla filer** i repo-roten.
2. `git add . && git commit -m "PWA" && git push`
3. Repo → **Settings → Pages** → *Deploy from branch* → `main` / `/root` → **Save**.
4. Appen ligger på `https://<användarnamn>.github.io/scheduleit/`.

## Installera på mobilen (efter publicering)
- **Android (Chrome):** öppna länken → meny → *Installera app*. Fullskärm + vibration.
- **iOS (Safari):** Dela → *Lägg till på hemskärmen*. Fullskärm; ingen haptik (iOS-gräns).

## Viktigt
- Service worker, "installera" och `schedule.json`-hämtning fungerar **bara över HTTPS**
  (GitHub Pages), inte när du öppnar `index.html` som lokal fil. Som fil visas exemplet.
- `schedule.json` hämtas *network-first* och uppdateras utan versionsbyte.
  Ändrar du appkoden (`index.html`/`sw.js`): höj cache-versionen (`scheduleit-vN`) i `sw.js`.
