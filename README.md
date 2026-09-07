# Aurora

**La tua giornata, in un colpo d'occhio.**

Un cruscotto quotidiano che sta tutto in una pagina: meteo dal vivo, qualità dell'aria,
ciclo del sole, focus timer, task, note, convertitore di valute e unità, generatore di QR.
Sfondo con aurora boreale in WebGL, tema chiaro/scuro, installabile come app, **funziona anche offline**.

🔗 **[Apri Aurora](https://gigat02.github.io/aurora/)**

---

## Come ci si muove

Aurora è divisa in sei viste — **Panoramica, Meteo, Giornata, Strumenti, Conto, Video** —
raggiungibili dalle schede in alto (barra in basso su telefono). Ogni vista ha il suo indirizzo
(`#/meteo`, `#/conto`, …), quindi il tasto Indietro funziona e i link sono condivisibili.

Il pulsante **Menu** apre il launcher con tutte le funzionalità in un colpo d'occhio: si clicca una
voce e si finisce direttamente sulla card giusta, che si illumina un istante per farsi trovare.

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
| **Dividi il conto** | Chi ha pagato cosa, anche a gruppi diversi. Aurora scioglie il groviglio in pochi rimborsi e ti dà link e QR da passare agli altri. |
| **Generatore QR** | Link, testo o credenziali Wi-Fi, scaricabile in PNG ad alta risoluzione. |
| **Scanner QR** | Legge un codice con la fotocamera e capisce cosa hai inquadrato: un link, una rete Wi-Fi con la sua password, o un conto da aprire. |
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

### Condivisione senza server

Aurora non ha un database. Per passare un conto a qualcuno, lo **stato viaggia dentro il link**:

```
https://gigat02.github.io/aurora/#/conto?d=A1,Marco|Sara|Luca,Cena^60^0^012|Taxi^30^1^12
```

Nomi e spese sono impacchettati in un formato compatto: `A1` è la versione, poi i partecipanti, poi
le spese come `descrizione^importo^chi ha pagato^fra chi è divisa`, con le persone indicate per
indice. I separatori `,` `|` `^` sono caratteri che `encodeURIComponent` trasforma sempre, quindi
non possono comparire dentro un nome e rompere il formato.

Quel link diventa anche un **QR**: l'amico inquadra col suo telefono e apre lo stesso identico conto.
Nessun account, nessun server, nessun dato che parte. Il QR arriva fino a 213 caratteri (un conto da
quattro persone e sei spese sta comodamente dentro); oltre quella soglia Aurora te lo dice e ti passa
al pulsante *Copia link*.

### Pilotare Aurora dalla voce, con Siri

Un sito web non può registrare intent per Siri — le App Intents sono riservate alle app native, e
questo non è cambiato con iOS 26. Ma esiste una strada che funziona davvero e non richiede nessun
server: **i Comandi Rapidi**. Siri esegue una scorciatoia, la scorciatoia apre un indirizzo di
Aurora, e Aurora esegue l'azione appena si apre.

Per questo ogni funzione ha il suo indirizzo con parametri:

| Indirizzo | Cosa fa |
|---|---|
| `#/conto` | apre il conto |
| `#/conto?d=…` | apre un conto condiviso |
| `#/strumenti?fx=100,EUR,USD` | converte 100 euro in dollari |
| `#/strumenti?conv=42.195,km,mi` | converte una misura |
| `#/strumenti?qr=testo` | genera un QR |
| `#/giornata?task=comprare%20il%20ghiaccio` | aggiunge un task |
| `#/giornata?focus=25` | avvia il timer |
| `#/meteo?citta=Milano` | meteo di un'altra città |

**Comando rapido semplice** — "Ehi Siri, dividi il conto":
apri *Comandi Rapidi* → `+` → azione **Apri URL** → incolla
`https://gigat02.github.io/aurora/#/conto` → chiama il comando "Dividi il conto".

**Comando con dettatura** — "Ehi Siri, aggiungi task":
azione **Chiedi input** (Testo) → azione **Codifica URL** sull'input → azione **Testo** che unisce
`https://gigat02.github.io/aurora/#/giornata?task=` con il testo codificato → azione **Apri URL**.

**Il limite, detto chiaramente:** Siri *apre* Aurora e ti mostra il risultato, ma non può leggertelo
ad alta voce, perché una pagina statica non ha modo di rispondere alla scorciatoia. Se vuoi una
risposta parlata hai due strade: far fare il conto alla scorciatoia stessa (per il cambio valuta
basta un **Ottieni contenuto di URL** su `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD`
seguito da **Pronuncia**, e Aurora non serve nemmeno), oppure aggiungere una piccola funzione
serverless — che però vorrebbe dire uscire da GitHub Pages, e qui non c'è.

Su Android l'Assistente ha lo stesso limite, ma se installi Aurora le scorciatoie del manifest
(Conto, Scanner, Focus, Meteo) compaiono tenendo premuta l'icona.

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
index.html      struttura, divisa in sei viste
styles.css      design system (variabili CSS, tema chiaro/scuro, layout bento)
app.js          router, meteo, strumenti, conto, scanner, download video
vendor/jsqr.js  decoder QR (jsQR, MIT) incluso qui per funzionare offline
sw.js           service worker: la app resta usabile senza rete
serve.js        server statico minimo per lo sviluppo locale
```

Qualche dettaglio che vale la pena raccontare:

- **Lo sfondo** è un fragment shader WebGL: tre nastri di aurora modulati da rumore fBm,
  limitati a ~30 fps per non prosciugare la batteria, con fallback a un gradiente CSS se
  WebGL non è disponibile.
- **Il generatore QR** è scritto da zero — aritmetica su GF(256), codici correttori
  Reed–Solomon, pattern di allineamento, scelta della maschera per penalità — quindi
  funziona anche completamente offline. Verificato decodificando l'output con un decoder
  indipendente su versioni dalla 3 alla 10.
- **Lo scanner** legge i frame su un timer e non su `requestAnimationFrame`: rAF viene sospeso
  quando il browser non sta ridipingendo, e uno scanner che smette di leggere senza dirlo è peggio
  di uno lento. La fotocamera si spegne da sola quando lasci la sezione o cambi scheda.
- **I conti si fanno in centesimi**, con il resto della divisione distribuito ai primi: così le
  quote tornano sempre esatte anche quando l'importo non è divisibile.
- **I tuoi dati non partono mai.** Conti, task, note e preferenze vivono in `localStorage`.
  Nessun account, nessun cookie, nessun tracciamento.

## Dati

- Meteo e qualità dell'aria: [Open-Meteo](https://open-meteo.com) (nessuna chiave richiesta)
- Cambi valuta: [Frankfurter](https://frankfurter.dev), su tassi di riferimento BCE
- Nome della località: [BigDataCloud](https://www.bigdatacloud.com) reverse geocoding

## Licenza

MIT — vedi [LICENSE](LICENSE).

Include [jsQR](https://github.com/cozmo/jsQR) di Cosmo Wolfe (licenza MIT) in `vendor/`, usato
solo dallo scanner e caricato soltanto quando lo accendi.
