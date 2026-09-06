# Aurora

**La tua giornata, in un colpo d'occhio.**

Un cruscotto quotidiano che sta tutto in una pagina: meteo dal vivo, qualità dell'aria,
ciclo del sole, focus timer, task, note, convertitore di valute e unità, generatore di QR.
Sfondo con aurora boreale in WebGL, tema chiaro/scuro, installabile come app, **funziona anche offline**.

🔗 **[Apri Aurora](https://gigat02.github.io/aurora/)**

---

## Come ci si muove

Aurora è divisa in cinque viste — **Panoramica, Meteo, Giornata, Strumenti, Video** — raggiungibili
dalle schede in alto (barra in basso su telefono). Ogni vista ha il suo indirizzo (`#/meteo`,
`#/video`, …), quindi il tasto Indietro funziona e i link sono condivisibili.

Il pulsante **Menu** apre il launcher con tutte e 15 le funzionalità in un colpo d'occhio: si clicca
una voce e si finisce direttamente sulla card giusta, che si illumina un istante per farsi trovare.

## Cosa sa fare

| | |
|---|---|
| **Meteo live** | Posizione automatica (o cerca una città nel mondo). Condizioni attuali, grafico delle prossime 24 ore con probabilità di pioggia, previsioni a 7 giorni. |
| **Qualità dell'aria** | Indice europeo EAQI con PM2.5, PM10 e ozono. |
| **Ciclo del sole** | Arco animato con alba, tramonto e quanta luce resta. |
| **Focus timer** | Pomodoro da 25 / 50 minuti più pausa breve, con anello di progresso, suono e conteggio delle sessioni del giorno. |
| **Task di oggi** | Lista con barra di completamento. Resta sul tuo dispositivo. |
| **Blocco note** | Si salva da solo mentre scrivi. |
| **Cambio valuta** | 31 valute ai tassi ufficiali BCE. |
| **Convertitore** | Lunghezza, peso, volume, velocità, area, dati e temperatura. |
| **Generatore QR** | Link, testo o credenziali Wi-Fi, scaricabile in PNG ad alta risoluzione. |
| **Salva video** | Da un link diretto a un file video: anteprima, peso e durata, poi un pulsante di conferma e il download in streaming. |
| **Barra comandi** | `Ctrl` + `K` ovunque: fa da calcolatrice, converte valute al volo, crea task e salta tra le sezioni. |

### Salva video: cosa funziona e cosa no

Aurora è un sito statico: il download avviene **nel tuo browser**, il file va dritto sul dispositivo
e non passa da nessun server intermedio. Questo pone un limite preciso, che vale la pena conoscere.

**Funziona** con i link diretti a un file (`.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`, `.mkv`), quando il
server che lo ospita permette la lettura da altri siti (header CORS): tipicamente video tuoi, su un
tuo spazio web, su GitHub Pages o su uno storage configurato per farlo. Su Chrome ed Edge scegli tu
dove salvarlo e il file viene scritto in streaming, senza passare per la memoria.

**Non funziona** con gli indirizzi delle pagine di YouTube, Instagram, TikTok, Facebook o X: lì il
video non è un file ma un flusso da ricostruire, servirebbe un estrattore lato server e i termini di
servizio di quelle piattaforme non lo consentono. Aurora lo dice apertamente invece di fallire in
silenzio. Non funzionano nemmeno i manifesti di streaming `.m3u8` e `.mpd`, fatti di centinaia di
segmenti da ricomporre.

Quando il server ospita il file ma ne vieta la lettura da altri siti, Aurora mostra comunque
l'anteprima e ti offre **Apri in una scheda**, così puoi salvarlo con il browser.

> Scarica solo video che puoi scaricare: tuoi, con licenza libera, o per cui hai il permesso.

### La barra comandi in pratica

Premi `Ctrl` + `K` (`⌘` + `K` su Mac) e scrivi:

- `18*7+4` → calcola, `Invio` copia il risultato
- `50 eur usd` → converte al cambio del giorno
- `comprare il ghiaccio` → diventa un task
- `tema`, `meteo`, `focus` → salti e comandi

---

## Avviarlo in locale

Serve solo Node.js. Nessun `npm install`, nessuna dipendenza.

```bash
git clone https://github.com/Gigat02/aurora.git
cd aurora
node serve.js
```

Poi apri **http://localhost:5173**.

> Va aperto tramite un server (non con doppio clic sul file): geolocalizzazione,
> service worker e installazione come app richiedono `http://localhost` o `https://`.

---

## Come funziona

Tre file, zero build, zero dipendenze, zero framework.

```
index.html    struttura, divisa in cinque viste
styles.css    design system (variabili CSS, tema chiaro/scuro, layout bento)
app.js        router, meteo, strumenti, menu e download video
sw.js         service worker: la app resta usabile senza rete
serve.js      server statico minimo per lo sviluppo locale
```

Qualche dettaglio che vale la pena raccontare:

- **Lo sfondo** è un fragment shader WebGL: tre nastri di aurora modulati da rumore fBm,
  limitati a ~30 fps per non prosciugare la batteria, con fallback a un gradiente CSS se
  WebGL non è disponibile.
- **Il generatore QR** è scritto da zero — aritmetica su GF(256), codici correttori
  Reed–Solomon, pattern di allineamento, scelta della maschera per penalità — quindi
  funziona anche completamente offline. Verificato decodificando l'output con un decoder
  indipendente su versioni dalla 3 alla 10.
- **I tuoi dati non partono mai.** Task, note e preferenze vivono in `localStorage`.
  Nessun account, nessun cookie, nessun tracciamento.

## Dati

- Meteo e qualità dell'aria: [Open-Meteo](https://open-meteo.com) (nessuna chiave richiesta)
- Cambi valuta: [Frankfurter](https://frankfurter.dev), su tassi di riferimento BCE
- Nome della località: [BigDataCloud](https://www.bigdatacloud.com) reverse geocoding

## Licenza

MIT — vedi [LICENSE](LICENSE).
