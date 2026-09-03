# Aurora

**La tua giornata, in un colpo d'occhio.**

Un cruscotto quotidiano che sta tutto in una pagina: meteo dal vivo, qualità dell'aria,
ciclo del sole, focus timer, task, note, convertitore di valute e unità, generatore di QR.
Sfondo con aurora boreale in WebGL, tema chiaro/scuro, installabile come app, **funziona anche offline**.

🔗 **[Apri Aurora](https://gigat02.github.io/aurora/)**

---

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
| **Barra comandi** | `Ctrl` + `K` ovunque: fa da calcolatrice, converte valute al volo, crea task e salta tra le sezioni. |

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
index.html    struttura
styles.css    design system (variabili CSS, tema chiaro/scuro, layout bento)
app.js        tutta la logica
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
