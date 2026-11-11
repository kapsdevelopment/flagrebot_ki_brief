# Flagrebot KI-brief

En presentasjon der Flagrebot bretter arket for å vise neste slide. Animasjonen bygger på versjon `v1.0.0` av referansedemoen.

Rediger [slides.js](slides.js) for å endre presentasjonen. Hver slide har en tittel i `title` og brødtekst i `copy`. Rekkefølgen i lista bestemmer visningsrekkefølgen. Filen inneholder tre eksempeltekster som kan erstattes.

Bruk en enkelt tekststreng i `copy` for ett avsnitt. For flere avsnitt eller punktlister bruker du en liste, der hver tekststreng blir et avsnitt og hvert objekt med `bullets` blir en punktliste. Delene vises i den rekkefølgen du skriver dem.

```js
{
  title: "Gi AI en oppgave",
  copy: [
    "Start med det du vil oppnå.",
    { bullets: ["Beskriv oppgaven", "Si hvem svaret er til", "Be om et bestemt format"] },
    "Sjekk svaret før du bruker det.",
  ],
}
```

Hvis teksten er lengre enn det er plass til på arket, kan du rulle i tekstfeltet.

Start en lokal server fra prosjektmappen med `python3 -m http.server 8000` og åpne [presentasjonen](http://localhost:8000/). Klikk på høyre halvdel for å gå fram og på venstre halvdel for å gå tilbake. Piltastene og Page Up og Page Down virker også. Enter og mellomrom går fram.
