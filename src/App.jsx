import React, { useEffect, useState } from "react";
import InputView from "./views/InputView";
import LibraryView from "./views/LibraryView";
import ResultsView from "./views/ResultsView";

const LOCAL_KEY = "bgchooser_v1";
const DEFAULT_OPTIONS = [
  "Gamers",
  "Family",
  "Kids",
  "Campaign",
  "Party",
  "Cooperative",
  "Nolan",
  "Reid",
];
const SHEET_ID = "1JVJlhg5NDrGmB638MyGaSsYAcNHw78SPX4GDfqDMhfQ";

function loadState(){
  try{
    const raw = localStorage.getItem(LOCAL_KEY);
    const defaultState = { games: [], audienceOptions: DEFAULT_OPTIONS, settings: { sortPreference: "Random", showPlayTime:true, adsRemoved:false }, sheetApiKey: "AIzaSyD5RrxHt_pW7T15tN1L60eMxLv5EOHO9LQ" };
    if(!raw) return defaultState;
    const parsed = JSON.parse(raw);
    // Enforce fixed audience options (not user-editable)
    parsed.audienceOptions = DEFAULT_OPTIONS;
    // Default the sheet API key if not already set in stored state
    parsed.sheetApiKey = parsed.sheetApiKey || defaultState.sheetApiKey;
    return parsed;
  }catch(e){ return { games: [], audienceOptions: DEFAULT_OPTIONS, settings: { sortPreference: "Random", showPlayTime:true, adsRemoved:false }, sheetApiKey: "AIzaSyD5RrxHt_pW7T15tN1L60eMxLv5EOHO9LQ" }; }
}
function saveState(state){ localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); }

export default function App(){
  const [state, setState] = useState(()=>loadState());
  useEffect(()=> saveState(state), [state]);

  // Load games from Google Sheets (single source of truth) when an API key is present
  useEffect(() => {
    let cancelled = false;
    async function loadFromSheets() {
      try {
        const apiKey = state.sheetApiKey;
        if (!apiKey) return;

        // Get first sheet title
        const metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title&key=${apiKey}`
        );
        if (!metaRes.ok) throw new Error("Failed to fetch sheet metadata");
        const meta = await metaRes.json();
        const title = meta.sheets && meta.sheets[0] && meta.sheets[0].properties && meta.sheets[0].properties.title ? meta.sheets[0].properties.title : null;
        if (!title) throw new Error("No sheet title found");

        // Fetch values from first sheet (columns A:Z)
        const range = encodeURIComponent(`${title}!A:Z`);
        const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${apiKey}`);
        if (!valuesRes.ok) throw new Error("Failed to fetch sheet values");
        const valuesJson = await valuesRes.json();
        const rows = valuesJson.values || [];
        if (rows.length < 1) return; // no data

        const headers = rows[0].map((h) => String(h).trim().toLowerCase());
        const dataRows = rows.slice(1);

        const parsed = dataRows.map((cols) => {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = cols[i] ?? "";
          });

          const name = obj.name || obj.title || obj.objectname || obj["game"] || "";
          const min = parseInt(obj.minplaytime || obj.min || obj["min play time"] || "") || 0;
          const max = parseInt(obj.maxplaytime || obj.max || obj["max play time"] || "") || 0;
          const total = [String(obj.totaltime || obj["total time"] || "").toLowerCase()].some(v => ["true","1","x","yes","y"].includes(v));
          const timeByPlayerFlag = [String(obj["time by player"] || obj["time_by_player"] || obj["timebyplayer"] || "").toLowerCase()].some(v => ["true","1","x","yes","y"].includes(v));
          // Determine playerCounts:
          // 1) If a combined field exists (playercounts or players), parse it (comma-separated)
          // 2) Otherwise, detect header columns that are numeric (e.g. "2", "3", "4") and treat truthy values (TRUE/1/X) as support for that player count
          let playerCounts = [];
          if (obj.playercounts || obj.players) {
            playerCounts = (obj.playercounts || obj.players || "").toString().split(/[,;]+/).map(x=>parseInt(x)).filter(Boolean);
          } else {
            // headers from outer scope — we need to find numeric header columns
            // `headers` is available in the outer scope; find indices where header is a number
            const numericCols = headers
              .map((h, idx) => ({ h, idx }))
              // accept numeric headers like "2", "3", and "7+" (map to 7)
              .filter(({ h }) => /^\d+\+?$/.test(String(h || "").trim()))
              .map(({ idx }) => idx);
            if (numericCols.length) {
              numericCols.forEach((ci) => {
                const val = cols[ci];
                if (val != null) {
                  const s = String(val).trim().toLowerCase();
                  if (s === "true" || s === "1" || s === "x") {
                    const n = parseInt(headers[ci]);
                    if (!Number.isNaN(n)) playerCounts.push(n);
                  }
                }
              });
            }
          }
          // Determine audience options:
          // 1) If a combined field exists (playeroptions, "player options", audience), parse it
          // 2) Otherwise detect columns whose headers match DEFAULT_OPTIONS and treat truthy cells as inclusion
          let options = (obj.playeroptions || obj["player options"] || obj.audience || "")
            .toString()
            .split(/[,;]+/)
            .map((x) => x.trim())
            .filter(Boolean);
          if (!options.length) {
            const headerMap = DEFAULT_OPTIONS.reduce((m, o) => { m[o.toLowerCase()] = o; return m; }, {});
            headers.forEach((h, idx) => {
              const lower = String(h || "").trim().toLowerCase();
              const canonical = headerMap[lower];
              if (canonical) {
                const val = cols[idx];
                if (val != null) {
                  const s = String(val).trim().toLowerCase();
                  if (["true", "1", "x", "yes", "y"].includes(s)) options.push(canonical);
                }
              }
            });
          }
          // dedupe and keep canonical casing from DEFAULT_OPTIONS
          options = [...new Set(options.map(o => {
            const lower = String(o||"").trim().toLowerCase();
            return DEFAULT_OPTIONS.find(d => d.toLowerCase() === lower) || o;
          }))];

          return {
            id: crypto.randomUUID(),
            name,
            minPlayTime: min,
            maxPlayTime: max,
            TotalTime: total,
            timeByPlayer: timeByPlayerFlag,
            playerCounts: playerCounts.length ? playerCounts : [2],
            audienceOptions: options,
          };
        }).filter(g => g.name);

        if (cancelled) return;
        setState((s) => ({ ...s, games: parsed, sheetValues: rows, sheetHeaders: headers, sheetLastSync: Date.now(), sheetLoadError: null }));
      } catch (err) {
        console.error("Error loading sheet:", err);
        setState((s) => ({ ...s, sheetLoadError: String(err) }));
      }
    }

    loadFromSheets();
    return () => {
      cancelled = true;
    };
  }, [state.sheetApiKey, state.sheetSyncTrigger]);

  const updateGames = (games) => setState(s=>({...s, games}));
  const updateOptions = (audienceOptions) => setState(s=>({...s, audienceOptions}));
  const updateSettings = (settings) => setState(s=>({...s, settings}));

  return (
    <div className="app">
      <header className="topbar">
        <h1>Board Game Chooser</h1>
      </header>

      <main className="main-grid">
        <nav className="sidebar">
          <button onClick={()=> setState(s=>({...s, route: "input"}))}>Input</button>
          <button onClick={()=> setState(s=>({...s, route: "library"}))}>Library</button>
          <button onClick={()=> setState(s=>({...s, route: "results"}))}>Results</button>
        </nav>

        <section className="content">
          {state.route === "library" && <LibraryView state={state} setState={setState} />}
          {state.route === "results" && <ResultsView state={state} />}
          {(!state.route || state.route === "input") && <InputView state={state} setState={setState} />}
        </section>
      </main>

    </div>
  );
}
