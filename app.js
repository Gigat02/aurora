/* ============================================================
   Aurora — app.js
   Nessuna dipendenza esterna. Tutto vanilla, tutto offline-first.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("aurora." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("aurora." + k, JSON.stringify(v)); } catch (e) {} }
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => { t.hidden = true; }, 400);
    }, 2400);
  }

  /* ==========================================================
     1. SFONDO — aurora boreale in WebGL (con fallback CSS)
     ========================================================== */
  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  const FRAG = [
    "precision highp float;",
    "uniform vec2 u_res; uniform float u_time; uniform float u_light; uniform vec2 u_mouse;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
    " return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/u_res.xy;",
    " float ar=u_res.x/u_res.y;",
    " vec2 p=vec2(uv.x*ar,uv.y);",
    " float t=u_time*0.04;",
    " vec3 col=vec3(0.0);",
    " for(int i=0;i<3;i++){",
    "  float fi=float(i);",
    "  float y=0.82+0.10*sin(p.x*1.5+t*2.0+fi*2.3)+fbm(vec2(p.x*1.6+t*1.1,fi*13.0))*0.17-0.09*fi;",
    "  float d=abs(p.y-y);",
    "  float glow=exp(-d*(12.0+fi*5.0))*(0.62+0.34*sin(t*2.4+fi*1.7));",
    "  vec3 c=mix(vec3(0.55,0.47,1.0),vec3(0.13,0.83,0.93),fract(fi*0.41+0.15));",
    "  c=mix(c,vec3(1.0,0.42,0.67),0.45+0.45*sin(p.x*1.2+t*1.5+fi*1.9));",
    "  col+=c*glow;",
    " }",
    " float veil=fbm(vec2(p.x*2.2-t*0.6,p.y*2.6+t*0.3));",
    " col+=vec3(0.30,0.24,0.62)*veil*0.07;",
    " vec2 md=(uv-u_mouse); md.x*=ar;",
    " col+=vec3(0.45,0.40,0.95)*exp(-dot(md,md)*13.0)*0.09;",
    // le card vivono in basso: l'aurora si spegne scendendo
    " col*=mix(0.12,1.0,smoothstep(0.05,0.82,uv.y));",
    " float vig=smoothstep(0.26,1.05,length((uv-vec2(0.5))*vec2(ar*0.62,1.0)));",
    " if(u_light<0.5){",
    "  col*=0.95;",
    "  col+=vec3(0.017,0.020,0.049);",
    "  col=mix(col,vec3(0.014,0.017,0.042),vig*0.80);",
    " } else {",
    "  col=vec3(0.960,0.955,0.990)-col*0.62;",
    "  col=mix(col,vec3(0.945,0.940,0.985),vig*0.55);",
    " }",
    " gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function initBackground() {
    const cv = $("#bg");
    let gl = null;
    try { gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }); } catch (e) {}
    if (!gl) {
      document.body.style.background =
        "radial-gradient(1200px 700px at 20% 10%, #241a4d, transparent 60%)," +
        "radial-gradient(900px 600px at 80% 30%, #0d3f52, transparent 60%), var(--bg)";
      return { setLight() {} };
    }

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return { setLight() {} };

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uLight = gl.getUniformLocation(prog, "u_light");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    let light = 0, mouse = [0.5, 0.35], target = [0.5, 0.35];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.floor(innerWidth * dpr * 0.7);
      cv.height = Math.floor(innerHeight * dpr * 0.7);
      gl.viewport(0, 0, cv.width, cv.height);
    }
    resize();
    addEventListener("resize", resize, { passive: true });

    addEventListener("pointermove", (e) => {
      target = [e.clientX / innerWidth, 1 - e.clientY / innerHeight];
      document.documentElement.style.setProperty("--mx", (e.clientX / innerWidth * 100) + "%");
      document.documentElement.style.setProperty("--my", (e.clientY / innerHeight * 100) + "%");
    }, { passive: true });

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let last = 0;

    function frame(now) {
      requestAnimationFrame(frame);
      if (now - last < 33) return;           // ~30fps, batteria felice
      last = now;
      mouse[0] += (target[0] - mouse[0]) * 0.06;
      mouse[1] += (target[1] - mouse[1]) * 0.06;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, reduce ? 12 : (now - t0) / 1000);
      gl.uniform1f(uLight, light);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);

    return { setLight(v) { light = v ? 1 : 0; } };
  }

  const bg = initBackground();

  /* ==========================================================
     2. TEMA
     ========================================================== */
  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    bg.setLight(mode === "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === "light" ? "#f3f2fb" : "#05060f";
    store.set("theme", mode);
  }
  applyTheme(store.get("theme", "dark"));
  $("#themeToggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ==========================================================
     3. OROLOGIO E SALUTO
     ========================================================== */
  const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
                "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  function tickClock() {
    const d = new Date();
    $("#clock").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    $("#clockSec").textContent = String(d.getSeconds()).padStart(2, "0");
    $("#heroDate").textContent = GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()];
    const h = d.getHours();
    $("#greeting").textContent =
      h < 5 ? "Buonanotte." : h < 12 ? "Buongiorno." : h < 18 ? "Buon pomeriggio." : h < 22 ? "Buonasera." : "Buonanotte.";
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ==========================================================
     4. METEO — Open-Meteo (nessuna chiave richiesta)
     ========================================================== */
  const WMO = {
    0:  ["Cielo sereno", "sun"],
    1:  ["Prevalentemente sereno", "sun"],
    2:  ["Parzialmente nuvoloso", "cloudsun"],
    3:  ["Coperto", "cloud"],
    45: ["Nebbia", "fog"],
    48: ["Nebbia con brina", "fog"],
    51: ["Pioviggine leggera", "rain"],
    53: ["Pioviggine", "rain"],
    55: ["Pioviggine intensa", "rain"],
    56: ["Pioviggine gelata", "rain"],
    57: ["Pioviggine gelata intensa", "rain"],
    61: ["Pioggia debole", "rain"],
    63: ["Pioggia", "rain"],
    65: ["Pioggia forte", "rain"],
    66: ["Pioggia gelata", "rain"],
    67: ["Pioggia gelata forte", "rain"],
    71: ["Neve debole", "snow"],
    73: ["Neve", "snow"],
    75: ["Neve abbondante", "snow"],
    77: ["Nevischio", "snow"],
    80: ["Rovesci deboli", "rain"],
    81: ["Rovesci", "rain"],
    82: ["Rovesci violenti", "rain"],
    85: ["Rovesci di neve", "snow"],
    86: ["Rovesci di neve forti", "snow"],
    95: ["Temporale", "storm"],
    96: ["Temporale con grandine", "storm"],
    99: ["Temporale forte con grandine", "storm"]
  };

  function icon(kind, size) {
    const s = size || 64;
    const head = '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" fill="none">';
    const defs =
      '<defs><linearGradient id="gS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd76b"/><stop offset="1" stop-color="#ff9d5c"/></linearGradient>' +
      '<linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".92"/><stop offset="1" stop-color="#b9c2e8" stop-opacity=".75"/></linearGradient></defs>';
    const sun = '<g class="wi-sun-core" style="transform-origin:32px 32px"><circle cx="32" cy="32" r="11" fill="url(#gS)"/>' +
      '<g stroke="url(#gS)" stroke-width="3" stroke-linecap="round">' +
      '<path d="M32 12v-5M32 57v-5M12 32H7M57 32h-5M18 18l-3.5-3.5M49.5 49.5 46 46M46 18l3.5-3.5M14.5 49.5 18 46"/></g></g>';
    const sunSm = '<g class="wi-sun-core" style="transform-origin:24px 24px"><circle cx="24" cy="24" r="9" fill="url(#gS)"/>' +
      '<g stroke="url(#gS)" stroke-width="2.6" stroke-linecap="round"><path d="M24 8V4M8 24H4M12 12l-3-3M36 12l3-3"/></g></g>';
    const cloud = '<path class="wi-cloud" d="M20 46a10 10 0 0 1 .6-19.9 14 14 0 0 1 26.6 3.4A9 9 0 0 1 46 46Z" fill="url(#gC)"/>';
    const drops = '<g stroke="#57c9f5" stroke-width="3" stroke-linecap="round">' +
      '<path class="wi-drop" d="M24 51v5"/><path class="wi-drop" d="M32 51v6"/><path class="wi-drop" d="M40 51v5"/></g>';
    const flakes = '<g fill="#cfe9ff"><circle class="wi-drop" cx="24" cy="53" r="2.4"/><circle class="wi-drop" cx="32" cy="56" r="2.4"/><circle class="wi-drop" cx="40" cy="53" r="2.4"/></g>';
    const bolt = '<path class="wi-bolt" d="M33 46 26 58h6l-2 8 10-13h-6l3-7Z" fill="#ffd76b"/>';
    const fog = '<g stroke="#c3ccef" stroke-width="3.4" stroke-linecap="round" opacity=".9">' +
      '<path class="wi-cloud" d="M12 40h40"/><path class="wi-cloud" d="M16 48h34"/><path class="wi-cloud" d="M20 56h26"/></g>';

    const map = {
      sun: sun,
      cloudsun: sunSm + cloud,
      cloud: cloud,
      rain: cloud + drops,
      snow: cloud + flakes,
      storm: cloud + bolt,
      fog: '<circle cx="32" cy="26" r="9" fill="url(#gS)" opacity=".8"/>' + fog
    };
    return head + defs + (map[kind] || cloud) + "</svg>";
  }

  const state = { lat: null, lon: null, place: "", weather: null };

  async function jget(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  async function loadWeather(lat, lon, placeName) {
    state.lat = lat; state.lon = lon;
    $("#place").textContent = placeName || "Posizione corrente";

    const wUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day" +
      "&hourly=temperature_2m,precipitation_probability,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
      "&timezone=auto&forecast_days=7";
    const aUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + lat + "&longitude=" + lon +
      "&current=european_aqi,pm2_5,pm10,ozone&timezone=auto";

    const [w, a] = await Promise.all([jget(wUrl), jget(aUrl).catch(() => null)]);
    state.weather = w;

    renderNow(w);
    renderHourly(w);
    renderDays(w);
    renderSun(w);
    if (a) renderAir(a);
    store.set("place", { lat: lat, lon: lon, name: placeName || "" });
  }

  function renderNow(w) {
    const c = w.current, info = WMO[c.weather_code] || ["—", "cloud"];
    $("#nowTemp").textContent = Math.round(c.temperature_2m);
    $("#nowIcon").innerHTML = icon(info[1], 78);
    $("#nowDesc").textContent = info[0];
    $("#sApparent").textContent = Math.round(c.apparent_temperature) + "°";
    $("#sHum").textContent = Math.round(c.relative_humidity_2m) + "%";
    $("#sWind").textContent = Math.round(c.wind_speed_10m) + " km/h";
    $("#sRain").textContent = (c.precipitation || 0).toFixed(1) + " mm";

    const d = w.daily;
    const set = new Date(d.sunset[0]);
    $("#heroSub").textContent =
      "Oggi tra " + Math.round(d.temperature_2m_min[0]) + "° e " + Math.round(d.temperature_2m_max[0]) + "°" +
      " · tramonto alle " + hm(set) +
      (d.precipitation_probability_max[0] >= 40
        ? " · " + d.precipitation_probability_max[0] + "% di pioggia, porta l'ombrello."
        : " · giornata asciutta.");
  }

  const hm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");

  function renderHourly(w) {
    const h = w.hourly;
    const now = new Date(w.current.time);
    let start = h.time.findIndex((t) => new Date(t) >= now);
    if (start < 0) start = 0;
    const N = 24;
    const temps = h.temperature_2m.slice(start, start + N);
    const rains = (h.precipitation_probability || []).slice(start, start + N);
    const times = h.time.slice(start, start + N).map((t) => new Date(t));
    if (temps.length < 2) return;

    const W = 720, H = 230, padL = 8, padR = 8, padT = 26, padB = 34;
    const min = Math.min.apply(null, temps), max = Math.max.apply(null, temps);
    const range = Math.max(max - min, 3);
    const x = (i) => padL + (i * (W - padL - padR)) / (temps.length - 1);
    const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

    let line = "", area = "";
    temps.forEach((v, i) => { line += (i ? " L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); });
    area = line + " L" + x(temps.length - 1).toFixed(1) + " " + (H - padB) + " L" + padL + " " + (H - padB) + " Z";

    let bars = "";
    rains.forEach((p, i) => {
      if (!p) return;
      const bh = (p / 100) * (H - padT - padB) * 0.55;
      bars += '<rect x="' + (x(i) - 5).toFixed(1) + '" y="' + (H - padB - bh).toFixed(1) +
              '" width="10" height="' + bh.toFixed(1) + '" rx="3" fill="rgba(34,211,238,.28)"/>';
    });

    let labels = "", dots = "";
    times.forEach((t, i) => {
      if (i % 4 === 0) {
        labels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" fill="rgba(160,168,210,.75)" font-size="13" text-anchor="middle" font-family="Inter,sans-serif">' +
                  String(t.getHours()).padStart(2, "0") + "</text>";
        dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(temps[i]).toFixed(1) + '" r="3.4" fill="#22d3ee"/>' +
                '<text x="' + x(i).toFixed(1) + '" y="' + (y(temps[i]) - 12).toFixed(1) + '" fill="currentColor" font-size="14" font-weight="600" text-anchor="middle" font-family="Space Grotesk,sans-serif">' +
                Math.round(temps[i]) + "°</text>";
      }
    });

    $("#hourlyChart").innerHTML =
      '<defs>' +
      '<linearGradient id="lineG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b7bff"/><stop offset="1" stop-color="#ff6bab"/></linearGradient>' +
      '<linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b7bff" stop-opacity=".33"/><stop offset="1" stop-color="#8b7bff" stop-opacity="0"/></linearGradient>' +
      '</defs>' + bars +
      '<path d="' + area + '" fill="url(#areaG)"/>' +
      '<path d="' + line + '" fill="none" stroke="url(#lineG)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + labels;

    $("#hourlySub").textContent = "da " + hm(times[0]) + " a " + hm(times[times.length - 1]) +
      " · min " + Math.round(min) + "° / max " + Math.round(max) + "°";
  }

  function renderDays(w) {
    const d = w.daily;
    const html = d.time.map((t, i) => {
      const date = new Date(t);
      const info = WMO[d.weather_code[i]] || ["—", "cloud"];
      const name = i === 0 ? "Oggi" : GIORNI[date.getDay()].slice(0, 3);
      const rain = d.precipitation_probability_max[i];
      return '<div class="day" title="' + info[0] + '">' +
        '<div class="day-name">' + name + "</div>" +
        icon(info[1], 34) +
        '<div class="day-max">' + Math.round(d.temperature_2m_max[i]) + "°</div>" +
        '<div class="day-min">' + Math.round(d.temperature_2m_min[i]) + "°</div>" +
        '<div class="day-rain">' + (rain >= 15 ? rain + "%" : "") + "</div>" +
        "</div>";
    }).join("");
    $("#days").innerHTML = html;
  }

  function renderSun(w) {
    const rise = new Date(w.daily.sunrise[0]), set = new Date(w.daily.sunset[0]);
    const now = new Date();
    $("#sunrise").textContent = hm(rise);
    $("#sunset").textContent = hm(set);

    let p = (now - rise) / (set - rise);
    p = Math.max(0, Math.min(1, p));

    const path = $("#sunProgress");
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len * (1 - p);
    const pt = path.getPointAtLength(len * p);
    $("#sunDot").setAttribute("cx", pt.x);
    $("#sunDot").setAttribute("cy", pt.y);

    const dur = (ms) => Math.floor(ms / 3600000) + "h " + Math.floor((ms % 3600000) / 60000) + "m";
    if (now < rise) {
      $("#sunMidLabel").textContent = "Alba tra";
      $("#daylightLeft").textContent = dur(rise - now);
    } else if (now < set) {
      $("#sunMidLabel").textContent = "Luce residua";
      $("#daylightLeft").textContent = dur(set - now);
    } else {
      const next = w.daily.sunrise[1] ? new Date(w.daily.sunrise[1]) : null;
      $("#sunMidLabel").textContent = "Prossima alba";
      $("#daylightLeft").textContent = next ? hm(next) : "—";
    }
  }

  const AQI_LEVELS = [
    [20,  "Ottima",     "#4ade80"],
    [40,  "Buona",      "#a3e635"],
    [60,  "Discreta",   "#facc15"],
    [80,  "Scadente",   "#fb923c"],
    [100, "Pessima",    "#f87171"],
    [1e9, "Malsana",    "#c084fc"]
  ];

  function renderAir(a) {
    const c = a.current;
    const v = Math.round(c.european_aqi);
    const lv = AQI_LEVELS.find((l) => v <= l[0]);
    $("#aqiValue").textContent = isFinite(v) ? v : "—";
    $("#aqiLabel").textContent = lv[1];
    $("#aqiNote").textContent = "Indice europeo EAQI";
    const arc = $("#aqiArc");
    const C = 2 * Math.PI * 50;
    arc.setAttribute("stroke", lv[2]);
    arc.style.strokeDashoffset = C * (1 - Math.min(v, 100) / 100);
    $("#pm25").textContent = (c.pm2_5 != null ? c.pm2_5.toFixed(1) : "—") + " µg/m³";
    $("#pm10").textContent = (c.pm10 != null ? c.pm10.toFixed(1) : "—") + " µg/m³";
    $("#o3").textContent = (c.ozone != null ? Math.round(c.ozone) : "—") + " µg/m³";
  }

  /* ---- posizione: geolocalizzazione, poi ultima città salvata, poi Roma ---- */
  async function reverseName(lat, lon) {
    try {
      const j = await jget("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
        lat + "&longitude=" + lon + "&localityLanguage=it");
      return j.city || j.locality || j.principalSubdivision || "Posizione corrente";
    } catch (e) { return "Posizione corrente"; }
  }

  function boot() {
    const saved = store.get("place", null);
    const fallback = () => {
      if (saved) loadWeather(saved.lat, saved.lon, saved.name).catch(showWeatherError);
      else loadWeather(41.9028, 12.4964, "Roma").catch(showWeatherError);
    };
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseName(latitude, longitude);
        loadWeather(latitude, longitude, name).catch(showWeatherError);
      },
      fallback,
      { timeout: 8000, maximumAge: 900000 }
    );
  }

  function showWeatherError() {
    $("#place").textContent = "Meteo non disponibile";
    $("#nowDesc").textContent = "Connessione assente: gli strumenti offline funzionano comunque.";
    $("#heroSub").textContent = "Sei offline, ma task, note, timer e convertitori restano pienamente utilizzabili.";
  }
  boot();

  /* ---- ricerca città ---- */
  const citySearch = $("#citySearch"), cityInput = $("#cityInput"), cityResults = $("#cityResults");
  $("#searchCityBtn").addEventListener("click", () => {
    citySearch.hidden = !citySearch.hidden;
    if (!citySearch.hidden) cityInput.focus();
  });

  let cityTimer;
  cityInput.addEventListener("input", () => {
    clearTimeout(cityTimer);
    const q = cityInput.value.trim();
    if (q.length < 2) { cityResults.innerHTML = ""; return; }
    cityTimer = setTimeout(async () => {
      try {
        const j = await jget("https://geocoding-api.open-meteo.com/v1/search?name=" +
          encodeURIComponent(q) + "&count=6&language=it&format=json");
        cityResults.innerHTML = (j.results || []).map((r) =>
          '<li data-lat="' + r.latitude + '" data-lon="' + r.longitude + '" data-name="' + esc(r.name) + '">' +
          esc(r.name) + "<span>" + esc([r.admin1, r.country].filter(Boolean).join(", ")) + "</span></li>").join("")
          || '<li><span>Nessun risultato</span></li>';
      } catch (e) { cityResults.innerHTML = '<li><span>Ricerca non disponibile</span></li>'; }
    }, 260);
  });

  cityResults.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-lat]");
    if (!li) return;
    loadWeather(parseFloat(li.dataset.lat), parseFloat(li.dataset.lon), li.dataset.name).catch(showWeatherError);
    citySearch.hidden = true;
    cityInput.value = "";
    cityResults.innerHTML = "";
  });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ==========================================================
     5. FOCUS TIMER
     ========================================================== */
  const focus = {
    total: 25 * 60, left: 25 * 60, running: false, id: null,
    done: store.get("focusDone", { date: today(), n: 0 })
  };
  function today() { return new Date().toISOString().slice(0, 10); }
  if (focus.done.date !== today()) focus.done = { date: today(), n: 0 };
  $("#focusDone").textContent = focus.done.n;

  const ARC_LEN = 2 * Math.PI * 86;

  function paintFocus() {
    const m = Math.floor(focus.left / 60), s = focus.left % 60;
    const txt = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    $("#focusTime").textContent = txt;
    $("#focusArc").style.strokeDashoffset = ARC_LEN * (1 - focus.left / focus.total);
    document.title = focus.running ? txt + " · Aurora" : "Aurora — la tua giornata, in un colpo d'occhio";
  }
  paintFocus();

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ac = new Ctx();
      [880, 1320, 1760].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + i * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.18 + 0.5);
        o.connect(g); g.connect(ac.destination);
        o.start(ac.currentTime + i * 0.18); o.stop(ac.currentTime + i * 0.18 + 0.55);
      });
      setTimeout(() => ac.close(), 1500);
    } catch (e) {}
  }

  function startFocus() {
    if (focus.running) return;
    focus.running = true;
    $("#focusToggle").textContent = "Pausa";
    focus.id = setInterval(() => {
      focus.left--;
      if (focus.left <= 0) {
        clearInterval(focus.id);
        focus.running = false;
        focus.left = 0;
        $("#focusToggle").textContent = "Avvia";
        paintFocus();
        beep();
        focus.done.n++;
        store.set("focusDone", focus.done);
        $("#focusDone").textContent = focus.done.n;
        toast("Sessione completata. Alzati, bevi acqua, respira.");
        try {
          if (window.Notification && Notification.permission === "granted") {
            new Notification("Aurora", { body: "Sessione focus completata." });
          }
        } catch (e) {}
        focus.left = focus.total;
        setTimeout(paintFocus, 1400);
        return;
      }
      paintFocus();
    }, 1000);
  }
  function pauseFocus() {
    focus.running = false;
    clearInterval(focus.id);
    $("#focusToggle").textContent = "Riprendi";
    paintFocus();
  }
  $("#focusToggle").addEventListener("click", () => {
    try {
      if (window.Notification && Notification.permission === "default") Notification.requestPermission();
    } catch (e) {}
    focus.running ? pauseFocus() : startFocus();
  });
  $("#focusReset").addEventListener("click", () => {
    clearInterval(focus.id); focus.running = false; focus.left = focus.total;
    $("#focusToggle").textContent = "Avvia"; paintFocus();
  });
  $("#focusModes").addEventListener("click", (e) => {
    const b = e.target.closest(".pill");
    if (!b) return;
    $$(".pill", $("#focusModes")).forEach((p) => p.classList.remove("is-on"));
    b.classList.add("is-on");
    clearInterval(focus.id); focus.running = false;
    focus.total = focus.left = parseInt(b.dataset.min, 10) * 60;
    $("#focusPhase").textContent = (b.dataset.min === "5" ? "Pausa breve · " : "Pomodoro · ") + b.dataset.min + " min";
    $("#focusToggle").textContent = "Avvia";
    paintFocus();
  });

  /* ==========================================================
     6. TASK
     ========================================================== */
  let tasks = store.get("tasks", []);
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';

  function renderTasks() {
    const ul = $("#tasks");
    ul.innerHTML = tasks.map((t, i) =>
      '<li class="' + (t.done ? "done" : "") + '" data-i="' + i + '">' +
      '<span class="box" role="checkbox" tabindex="0" aria-checked="' + !!t.done + '">' + CHECK + "</span>" +
      '<span class="txt">' + esc(t.text) + "</span>" +
      '<button class="del" aria-label="Elimina">&times;</button></li>').join("");
    const done = tasks.filter((t) => t.done).length;
    $("#taskDoneN").textContent = done;
    $("#taskTotN").textContent = tasks.length;
    $("#taskBar").style.width = (tasks.length ? (done / tasks.length) * 100 : 0) + "%";
    $("#taskEmpty").hidden = tasks.length > 0;
    store.set("tasks", tasks);
  }
  renderTasks();

  function addTask(text) {
    text = String(text || "").trim();
    if (!text) return false;
    tasks.unshift({ text: text, done: false });
    renderTasks();
    return true;
  }

  $("#taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (addTask($("#taskInput").value)) $("#taskInput").value = "";
  });
  $("#tasks").addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    const i = +li.dataset.i;
    if (e.target.closest(".del")) { tasks.splice(i, 1); renderTasks(); return; }
    if (e.target.closest(".box")) { tasks[i].done = !tasks[i].done; renderTasks(); }
  });
  $("#tasks").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const box = e.target.closest(".box"); if (!box) return;
    e.preventDefault();
    const i = +box.closest("li").dataset.i;
    tasks[i].done = !tasks[i].done; renderTasks();
  });

  /* ==========================================================
     7. NOTE
     ========================================================== */
  const note = $("#note");
  note.value = store.get("note", "");
  let noteTimer;
  note.addEventListener("input", () => {
    $("#noteStatus").textContent = "sto salvando…";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      store.set("note", note.value);
      $("#noteStatus").textContent = "salvato alle " + hm(new Date());
    }, 500);
  });

  /* ==========================================================
     8. CAMBIO VALUTA — Frankfurter (BCE)
     ========================================================== */
  const CUR = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "SEK", "NOK", "DKK",
               "PLN", "CZK", "HUF", "RON", "BGN", "TRY", "BRL", "CNY", "INR", "KRW",
               "MXN", "NZD", "SGD", "ZAR", "HKD", "ILS", "THB", "PHP", "IDR", "MYR", "ISK"];
  let rates = store.get("rates", null);

  function fillCurrencies() {
    const opts = CUR.map((c) => '<option value="' + c + '">' + c + "</option>").join("");
    $("#fxFrom").innerHTML = opts; $("#fxTo").innerHTML = opts;
    $("#fxFrom").value = store.get("fxFrom", "EUR");
    $("#fxTo").value = store.get("fxTo", "USD");
  }
  fillCurrencies();

  async function loadRates() {
    const endpoints = [
      "https://api.frankfurter.dev/v1/latest?base=EUR",
      "https://api.frankfurter.app/latest?base=EUR"
    ];
    let ok = false;
    for (const url of endpoints) {
      try {
        const j = await jget(url);
        if (!j || !j.rates) continue;
        rates = { date: j.date, r: Object.assign({ EUR: 1 }, j.rates) };
        store.set("rates", rates);
        ok = true;
        break;
      } catch (e) { /* prova il prossimo */ }
    }
    if (!ok && !rates) { $("#fxDate").textContent = "tassi non disponibili offline"; return; }
    $("#fxDate").textContent = "tassi BCE del " + rates.date;
    calcFx();
  }

  function convert(amount, from, to) {
    if (!rates || !rates.r[from] || !rates.r[to]) return null;
    return (amount / rates.r[from]) * rates.r[to];
  }

  function calcFx() {
    const a = parseFloat($("#fxAmount").value);
    const f = $("#fxFrom").value, t = $("#fxTo").value;
    store.set("fxFrom", f); store.set("fxTo", t);
    const v = convert(isFinite(a) ? a : 0, f, t);
    if (v === null) { $("#fxResult").value = "—"; return; }
    $("#fxResult").value = v.toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    const one = convert(1, f, t);
    $("#fxRate").textContent = "1 " + f + " = " + one.toLocaleString("it-IT", { maximumFractionDigits: 4 }) + " " + t;
  }
  ["#fxAmount", "#fxFrom", "#fxTo"].forEach((s) => $(s).addEventListener("input", calcFx));
  $("#fxSwap").addEventListener("click", () => {
    const f = $("#fxFrom").value;
    $("#fxFrom").value = $("#fxTo").value;
    $("#fxTo").value = f;
    calcFx();
  });
  if (rates) { $("#fxDate").textContent = "tassi BCE del " + rates.date; calcFx(); }
  loadRates();

  /* ==========================================================
     9. CONVERTITORE UNITÀ
     ========================================================== */
  const UNITS = {
    "Lunghezza": { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, "mi naut.": 1852 },
    "Peso":      { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523 },
    "Volume":    { l: 1, ml: 0.001, "m³": 1000, "gal US": 3.785411784, "pt US": 0.473176473, "fl oz US": 0.0295735 },
    "Velocità":  { "km/h": 1, "m/s": 3.6, mph: 1.609344, nodi: 1.852 },
    "Dati":      { MB: 1, KB: 0.0009765625, GB: 1024, TB: 1048576, bit: 1.1920929e-7 },
    "Area":      { "m²": 1, "km²": 1e6, ha: 10000, "ft²": 0.09290304, acri: 4046.8564224 },
    "Temperatura": null
  };
  const TEMPS = ["°C", "°F", "K"];

  function fillConv() {
    $("#convCat").innerHTML = Object.keys(UNITS).map((k) => '<option>' + k + "</option>").join("");
    $("#convCat").value = store.get("convCat", "Lunghezza");
    fillConvUnits();
  }
  function fillConvUnits() {
    const cat = $("#convCat").value;
    const keys = cat === "Temperatura" ? TEMPS : Object.keys(UNITS[cat]);
    const opts = keys.map((k) => '<option>' + k + "</option>").join("");
    $("#convFrom").innerHTML = opts; $("#convTo").innerHTML = opts;
    $("#convFrom").value = keys[0];
    $("#convTo").value = keys[1] || keys[0];
    store.set("convCat", cat);
    calcConv();
  }
  function toC(v, u) { return u === "°C" ? v : u === "°F" ? (v - 32) * 5 / 9 : v - 273.15; }
  function fromC(v, u) { return u === "°C" ? v : u === "°F" ? v * 9 / 5 + 32 : v + 273.15; }

  function calcConv() {
    const cat = $("#convCat").value;
    const a = parseFloat($("#convA").value);
    if (!isFinite(a)) { $("#convB").value = "—"; return; }
    let out;
    if (cat === "Temperatura") out = fromC(toC(a, $("#convFrom").value), $("#convTo").value);
    else out = (a * UNITS[cat][$("#convFrom").value]) / UNITS[cat][$("#convTo").value];
    $("#convB").value = (Math.abs(out) >= 1e-4 && Math.abs(out) < 1e12)
      ? parseFloat(out.toFixed(6)).toLocaleString("it-IT", { maximumFractionDigits: 6 })
      : out.toExponential(4);
  }
  fillConv();
  $("#convCat").addEventListener("change", fillConvUnits);
  ["#convA", "#convFrom", "#convTo"].forEach((s) => $(s).addEventListener("input", calcConv));

  /* ==========================================================
     10. QR — encoder completo (byte mode, EC level M, v1..v10)
     ========================================================== */
  const QR = (function () {
    // exp/log su GF(256), polinomio primitivo 0x11D
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    (function () {
      let x = 1;
      for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
      for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    })();
    const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

    function rsPoly(n) {
      let poly = [1];
      for (let i = 0; i < n; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
          next[j] ^= poly[j];
          next[j + 1] ^= mul(poly[j], EXP[i]);
        }
        poly = next;
      }
      return poly;
    }
    function rsEncode(data, ecLen) {
      const gen = rsPoly(ecLen);
      const res = new Array(ecLen).fill(0);
      for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ res[0];
        res.shift(); res.push(0);
        if (factor !== 0) for (let j = 0; j < ecLen; j++) res[j] ^= mul(gen[j + 1], factor);
      }
      return res;
    }

    // [ecPerBlock, [ [nBlocchi, datiPerBlocco], ... ]]  — livello M, versioni 1..10
    const SPEC = {
      1:  [10, [[1, 16]]],
      2:  [16, [[1, 28]]],
      3:  [26, [[1, 44]]],
      4:  [18, [[2, 32]]],
      5:  [24, [[2, 43]]],
      6:  [16, [[4, 27]]],
      7:  [18, [[4, 31]]],
      8:  [22, [[2, 38], [2, 39]]],
      9:  [22, [[3, 36], [2, 37]]],
      10: [26, [[4, 43], [1, 44]]]
    };
    const CAP = { 1: 14, 2: 26, 3: 42, 4: 62, 5: 84, 6: 106, 7: 122, 8: 152, 9: 180, 10: 213 };
    const ALIGN = {
      1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
      6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
    };

    function formatBits(mask) {
      // EC level M = 0b00, 5 bit = 00 + mask(3)
      const data = (0 << 3) | mask;
      let v = data << 10;
      for (let i = 14; i >= 10; i--) if (v & (1 << i)) v ^= 0x537 << (i - 10);
      return ((data << 10) | v) ^ 0x5412;
    }
    function versionBits(ver) {
      let v = ver << 12;
      for (let i = 17; i >= 12; i--) if (v & (1 << i)) v ^= 0x1f25 << (i - 12);
      return (ver << 12) | v;
    }

    function toBytes(str) {
      const out = [];
      for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
          const c2 = str.charCodeAt(++i);
          c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      }
      return out;
    }

    function build(text) {
      const bytes = toBytes(text);
      let ver = 0;
      for (let v = 1; v <= 10; v++) if (bytes.length <= CAP[v]) { ver = v; break; }
      if (!ver) throw new Error("Testo troppo lungo (max 213 caratteri).");

      const [ecLen, groups] = SPEC[ver];
      let totalData = 0;
      groups.forEach(([n, d]) => { totalData += n * d; });

      // bitstream: modalità byte (0100) + lunghezza + dati + terminatore
      const bits = [];
      const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
      push(4, 4);
      push(bytes.length, ver >= 10 ? 16 : 8);
      bytes.forEach((b) => push(b, 8));
      const cap = totalData * 8;
      for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
      while (bits.length % 8) bits.push(0);

      const codewords = [];
      for (let i = 0; i < bits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
        codewords.push(b);
      }
      const PAD = [0xec, 0x11];
      let pi = 0;
      while (codewords.length < totalData) codewords.push(PAD[pi++ % 2]);

      // divisione in blocchi + Reed-Solomon
      const dBlocks = [], eBlocks = [];
      let off = 0;
      groups.forEach(([n, d]) => {
        for (let i = 0; i < n; i++) {
          const blk = codewords.slice(off, off + d);
          off += d;
          dBlocks.push(blk);
          eBlocks.push(rsEncode(blk, ecLen));
        }
      });

      // interlacciamento
      const final = [];
      const maxD = Math.max.apply(null, dBlocks.map((b) => b.length));
      for (let i = 0; i < maxD; i++) dBlocks.forEach((b) => { if (i < b.length) final.push(b[i]); });
      for (let i = 0; i < ecLen; i++) eBlocks.forEach((b) => final.push(b[i]));

      // matrice
      const size = ver * 4 + 17;
      const m = [], reserved = [];
      for (let i = 0; i < size; i++) { m.push(new Array(size).fill(0)); reserved.push(new Array(size).fill(0)); }

      function finder(r, c) {
        for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
          const rr = r + i, cc = c + j;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          const on = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                     (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
                     (i >= 2 && i <= 4 && j >= 2 && j <= 4);
          m[rr][cc] = on ? 1 : 0;
          reserved[rr][cc] = 1;
        }
      }
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

      // timing
      for (let i = 8; i < size - 8; i++) {
        const bit = i % 2 === 0 ? 1 : 0;
        m[6][i] = bit; reserved[6][i] = 1;
        m[i][6] = bit; reserved[i][6] = 1;
      }
      // dark module
      m[size - 8][8] = 1; reserved[size - 8][8] = 1;

      // allineamento (esclusi i tre incroci occupati dai finder)
      const ap = ALIGN[ver];
      const apLast = ap[ap.length - 1];
      ap.forEach((r) => ap.forEach((c) => {
        if ((r === 6 && c === 6) || (r === 6 && c === apLast) || (r === apLast && c === 6)) return;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
          const on = Math.max(Math.abs(i), Math.abs(j)) !== 1;
          m[r + i][c + j] = on ? 1 : 0;
          reserved[r + i][c + j] = 1;
        }
      }));

      // aree riservate a formato e versione
      for (let i = 0; i < 9; i++) {
        if (!reserved[8][i]) reserved[8][i] = 2;
        if (!reserved[i][8]) reserved[i][8] = 2;
      }
      for (let i = 0; i < 8; i++) {
        if (!reserved[8][size - 1 - i]) reserved[8][size - 1 - i] = 2;
        if (!reserved[size - 1 - i][8]) reserved[size - 1 - i][8] = 2;
      }
      if (ver >= 7) {
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
          reserved[size - 11 + j][i] = 2;
          reserved[i][size - 11 + j] = 2;
        }
      }

      // posizionamento dati a zig-zag
      let bitIdx = 0;
      const totalBits = final.length * 8;
      const getBit = (i) => i < totalBits ? (final[i >> 3] >> (7 - (i & 7))) & 1 : 0;
      let up = true;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (let n = 0; n < size; n++) {
          const row = up ? size - 1 - n : n;
          for (let k = 0; k < 2; k++) {
            const c = col - k;
            if (reserved[row][c]) continue;
            m[row][c] = getBit(bitIdx++);
          }
        }
        up = !up;
      }

      // maschere
      const MASKS = [
        (r, c) => (r + c) % 2 === 0,
        (r) => r % 2 === 0,
        (r, c) => c % 3 === 0,
        (r, c) => (r + c) % 3 === 0,
        (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
      ];

      function applyAll(maskId) {
        const out = m.map((row, r) => row.map((v, c) =>
          reserved[r][c] === 1 ? v : (reserved[r][c] === 2 ? 0 : (MASKS[maskId](r, c) ? v ^ 1 : v))));
        // formato
        const fb = formatBits(maskId);
        for (let i = 0; i <= 5; i++) out[8][i] = (fb >> (14 - i)) & 1;
        out[8][7] = (fb >> 8) & 1;
        out[8][8] = (fb >> 7) & 1;
        out[7][8] = (fb >> 6) & 1;
        for (let i = 9; i <= 14; i++) out[14 - i][8] = (fb >> (14 - i)) & 1;
        // copia 2: bit 0..7 sulla riga 8 a destra, bit 8..14 sulla colonna 8 in basso
        for (let i = 0; i <= 7; i++) out[8][size - 1 - i] = (fb >> i) & 1;
        for (let i = 8; i <= 14; i++) out[size - 15 + i][8] = (fb >> i) & 1;
        out[size - 8][8] = 1;
        // versione
        if (ver >= 7) {
          const vb = versionBits(ver);
          for (let i = 0; i < 18; i++) {
            const b = (vb >> i) & 1;
            out[Math.floor(i / 3)][size - 11 + (i % 3)] = b;
            out[size - 11 + (i % 3)][Math.floor(i / 3)] = b;
          }
        }
        return out;
      }

      function penalty(g) {
        let p = 0;
        // regola 1: sequenze
        for (let i = 0; i < size; i++) {
          let rc = 1, cc = 1;
          for (let j = 1; j < size; j++) {
            rc = g[i][j] === g[i][j - 1] ? rc + 1 : (p += rc >= 5 ? rc - 2 : 0, 1);
            cc = g[j][i] === g[j - 1][i] ? cc + 1 : (p += cc >= 5 ? cc - 2 : 0, 1);
          }
          if (rc >= 5) p += rc - 2;
          if (cc >= 5) p += cc - 2;
        }
        // regola 2: blocchi 2x2
        for (let i = 0; i < size - 1; i++) for (let j = 0; j < size - 1; j++) {
          const v = g[i][j];
          if (v === g[i][j + 1] && v === g[i + 1][j] && v === g[i + 1][j + 1]) p += 3;
        }
        // regola 3: pattern 1:1:3:1:1
        const P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
        const P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
        const match = (arr, k, pat) => pat.every((v, x) => arr[k + x] === v);
        for (let i = 0; i < size; i++) {
          const row = g[i], col = g.map((r) => r[i]);
          for (let j = 0; j + 11 <= size; j++) {
            if (match(row, j, P1) || match(row, j, P2)) p += 40;
            if (match(col, j, P1) || match(col, j, P2)) p += 40;
          }
        }
        // regola 4: bilanciamento
        let dark = 0;
        g.forEach((r) => r.forEach((v) => { dark += v; }));
        const pct = (dark * 100) / (size * size);
        p += Math.floor(Math.abs(pct - 50) / 5) * 10;
        return p;
      }

      let best = null, bestP = Infinity;
      for (let k = 0; k < 8; k++) {
        const g = applyAll(k);
        const pen = penalty(g);
        if (pen < bestP) { bestP = pen; best = g; }
      }
      return best;
    }

    function draw(canvas, text) {
      const grid = build(text);
      const n = grid.length, quiet = 4, total = n + quiet * 2;
      canvas.width = canvas.height = total;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, total, total);
      ctx.fillStyle = "#0a0b1a";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (grid[r][c]) ctx.fillRect(c + quiet, r + quiet, 1, 1);
      }
    }
    return { draw: draw };
  })();

  const qrText = $("#qrText"), qrCanvas = $("#qrCanvas");
  function paintQR() {
    const v = qrText.value.trim() || "https://github.com";
    try { QR.draw(qrCanvas, v); qrText.style.borderColor = ""; }
    catch (e) { qrText.style.borderColor = "#ff6bab"; toast(e.message); }
  }
  qrText.addEventListener("input", paintQR);
  paintQR();

  $("#qrDownload").addEventListener("click", () => {
    const scale = 16;
    const big = document.createElement("canvas");
    big.width = big.height = qrCanvas.width * scale;
    const ctx = big.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, 0, 0, big.width, big.height);
    const a = document.createElement("a");
    a.download = "aurora-qr.png";
    a.href = big.toDataURL("image/png");
    a.click();
    toast("QR scaricato.");
  });

  /* ==========================================================
     11. COMMAND PALETTE
     ========================================================== */
  const overlay = $("#paletteOverlay"), pInput = $("#paletteInput"), pList = $("#paletteList");
  let pItems = [], pSel = 0;

  const COMMANDS = [
    { ico: "☀", title: "Vai al meteo", sub: "previsioni, aria, sole", run: () => goto("deck-meteo") },
    { ico: "◷", title: "Avvia il focus timer", sub: "pomodoro 25 minuti", run: () => { goto("deck-focus"); startFocus(); } },
    { ico: "✓", title: "Vai ai task", sub: "la tua lista di oggi", run: () => goto("deck-task") },
    { ico: "⚙", title: "Vai agli strumenti", sub: "valute, unità, QR", run: () => goto("deck-tools") },
    { ico: "◐", title: "Cambia tema", sub: "chiaro / scuro", run: () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark") },
    { ico: "⌖", title: "Cambia città", sub: "cerca un'altra località", run: () => { goto("top"); citySearch.hidden = false; setTimeout(() => cityInput.focus(), 400); } },
    { ico: "⟳", title: "Aggiorna il meteo", sub: "ricarica i dati live", run: () => { if (state.lat != null) loadWeather(state.lat, state.lon, $("#place").textContent).then(() => toast("Meteo aggiornato.")); } }
  ];

  function goto(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: id === "top" ? "start" : "start" });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (b) goto(b.dataset.goto);
  });

  function safeMath(expr) {
    const cleaned = expr.replace(/,/g, ".").replace(/\^/g, "**").replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[\d\s+\-*/().%*]+$/.test(cleaned)) return null;
    if (!/\d/.test(cleaned)) return null;
    try {
      const v = Function('"use strict";return (' + cleaned + ")")();
      return typeof v === "number" && isFinite(v) ? v : null;
    } catch (e) { return null; }
  }

  function buildResults(q) {
    q = q.trim();
    const out = [];

    if (q) {
      // 1) matematica
      const m = safeMath(q);
      if (m !== null) {
        const txt = parseFloat(m.toFixed(8)).toLocaleString("it-IT", { maximumFractionDigits: 8 });
        out.push({
          ico: "=", title: q + " = ", big: txt, sub: "premi Invio per copiare il risultato",
          run: () => { navigator.clipboard.writeText(String(m)).then(() => toast("Copiato: " + txt), () => toast("Risultato: " + txt)); }
        });
      }
      // 2) valuta: "50 eur usd"
      const fx = q.match(/^([\d.,]+)\s*([a-z]{3})\s*(?:in|to|->|=)?\s*([a-z]{3})$/i);
      if (fx && rates) {
        const amt = parseFloat(fx[1].replace(/\./g, "").replace(",", "."));
        const from = fx[2].toUpperCase(), to = fx[3].toUpperCase();
        const v = convert(amt, from, to);
        if (v !== null && isFinite(amt)) {
          const txt = v.toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + " " + to;
          out.push({
            ico: "€", title: amt + " " + from + " = ", big: txt, sub: "tassi BCE del " + rates.date,
            run: () => { $("#fxAmount").value = amt; $("#fxFrom").value = from; $("#fxTo").value = to; calcFx(); goto("deck-tools"); }
          });
        }
      }
      // 3) comandi che corrispondono a quello che stai scrivendo
      const ql = q.toLowerCase();
      const hits = COMMANDS.filter((c) => c.title.toLowerCase().includes(ql) || c.sub.toLowerCase().includes(ql));
      out.push.apply(out, hits);

      // 4) in fondo, la scorciatoia per trasformare il testo in un task
      out.push({
        ico: "+", title: 'Aggiungi task: "' + q + '"', sub: "finisce in cima alla lista di oggi",
        run: () => { addTask(q); goto("deck-task"); toast("Task aggiunto."); }
      });
      return out;
    }

    return COMMANDS.slice();
  }

  function renderPalette() {
    pItems = buildResults(pInput.value);
    pSel = 0;
    pList.innerHTML = pItems.map((it, i) =>
      '<li class="' + (i === 0 ? "sel" : "") + '" data-i="' + i + '">' +
      '<span class="p-ico">' + it.ico + "</span>" +
      '<span class="p-body"><span class="p-title">' + esc(it.title) +
      (it.big ? '<b class="p-big">' + esc(it.big) + "</b>" : "") + "</span>" +
      '<span class="p-sub">' + esc(it.sub) + "</span></span></li>").join("")
      || '<li><span class="p-body"><span class="p-title">Nessun risultato</span></span></li>';
  }

  function openPalette() {
    overlay.hidden = false;
    pInput.value = "";
    renderPalette();
    setTimeout(() => pInput.focus(), 30);
  }
  function closePalette() { overlay.hidden = true; }

  $("#openPalette").addEventListener("click", openPalette);
  pInput.addEventListener("input", renderPalette);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePalette(); });
  pList.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (!li) return;
    const it = pItems[+li.dataset.i];
    closePalette();
    if (it && it.run) it.run();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); overlay.hidden ? openPalette() : closePalette(); return; }
    if (overlay.hidden) return;
    if (e.key === "Escape") { closePalette(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!pItems.length) return;
      pSel = (pSel + (e.key === "ArrowDown" ? 1 : -1) + pItems.length) % pItems.length;
      $$("li", pList).forEach((li, i) => li.classList.toggle("sel", i === pSel));
      const el = pList.children[pSel];
      if (el) el.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const it = pItems[pSel];
      closePalette();
      if (it && it.run) it.run();
    }
  });

  /* ==========================================================
     12. REVEAL ON SCROLL
     ========================================================== */
  function show(el, delay) {
    setTimeout(() => {
      el.classList.add("in");
      // rete di sicurezza: tolta la classe base, il contenuto resta visibile
      // anche se la transizione non viene mai completata dal browser.
      setTimeout(() => el.classList.remove("reveal"), 1100);
    }, delay);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en, i) => {
      if (!en.isIntersecting) return;
      show(en.target, i * 70);
      io.unobserve(en.target);
    });
  }, { threshold: 0.05, rootMargin: "0px 0px -30px 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  // se qualcosa va storto (observer non supportato, tab in background al caricamento),
  // dopo 5 secondi mostriamo comunque tutto.
  setTimeout(() => $$(".reveal").forEach((el) => { el.classList.add("in"); el.classList.remove("reveal"); }), 5000);

  /* ==========================================================
     13. PWA
     ========================================================== */
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  let deferredPrompt = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#installBtn").hidden = false;
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installBtn").hidden = true;
  });

  // aggiorna il ciclo del sole ogni minuto
  setInterval(() => { if (state.weather) renderSun(state.weather); }, 60000);
})();
