import React, { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function InputView({ state, setState }) {
  // initialize from global state.inputParams if present so selections persist when navigating
  const initialPlayers = state.inputParams?.players ?? 2;
  const initialRange = state.inputParams?.range ?? [0, 190];
  const initialSelectedAudiences = state.inputParams?.selectedAudiences ?? {};

  const [players, setPlayers] = useState(initialPlayers);
  const [range, setRange] = useState(initialRange);
  // selection map: { [option]: 'include' | 'exclude' }
  const [selectedAudiences, setSelectedAudiences] = useState(initialSelectedAudiences);
  const s = state.settings || { sortPreference: "Random" };

  const apply = () => {
    const selectedMin = range[0];
    const selectedMax = range[1];

    const results = state.games
      .filter((g) => g.playerCounts.includes(players))
      .map((g) => {
        // If the sheet indicates this game's time is "by player", multiply by players.
        // If the sheet marks TotalTime (explicit total), do not multiply.
        // If neither is present, do not adjust times.
        const minT = g.timeByPlayer ? g.minPlayTime * players : g.minPlayTime;
        const maxT = g.timeByPlayer ? g.maxPlayTime * players : g.maxPlayTime;
        return { ...g, _minT: minT, _maxT: maxT };
      })
      .filter((g) => {
        if (selectedMin !== 0 && g._minT < selectedMin) return false;
        if (selectedMax !== 190 && g._maxT > selectedMax) return false;

        // included/excluded options: normalize and compare case-insensitively
        const gameOptsRaw = g.audienceOptions || [];
        const gameOpts = Array.isArray(gameOptsRaw)
          ? gameOptsRaw.map((o) => String(o || "").trim().toLowerCase())
          : String(gameOptsRaw).split(/[,;]+/).map((o) => o.trim().toLowerCase()).filter(Boolean);

        const includeOpts = Object.entries(selectedAudiences)
          .filter(([, v]) => v === "include")
          .map(([k]) => String(k).trim().toLowerCase());
        for (const inc of includeOpts) if (!gameOpts.includes(inc)) return false;

        const excludeOpts = Object.entries(selectedAudiences)
          .filter(([, v]) => v === "exclude")
          .map(([k]) => String(k).trim().toLowerCase());
        for (const exc of excludeOpts) if (gameOpts.includes(exc)) return false;

        return true;
      });

    const filtered = results.map((g) => ({
      game: g,
      minPlayTime: g._minT,
      maxPlayTime: g._maxT,
    }));

    setState((s) => ({
      ...s,
      results: filtered,
      route: "results",
      inputParams: { players, range, selectedAudiences },
      adjustedMinTime: filtered.length
        ? Math.min(...filtered.map((f) => f.minPlayTime))
        : 0,
      adjustedMaxTime: filtered.length
        ? Math.max(...filtered.map((f) => f.maxPlayTime))
        : 0,
    }));
  };

  // persist changes as user interacts so returning to Input preserves selections
  const persistInputParams = (patch) => {
    setState(s => ({ ...s, inputParams: { ...(s.inputParams||{}), ...patch } }));
  }

  return (
    <div>
      <div className="card">
        <div className="row">
          <strong>Players:</strong>{" "}
          <div className="badge">{players === 7 ? "7+" : players}</div>
        </div>
        <input
          className="input"
          type="range"
          min="1"
          max="7"
          value={players}
          onChange={(e) => setPlayers(Number(e.target.value))}
        />
      </div>

      <div className="card">
        <div className="row">
          <strong>Play Time</strong>{" "}
          <div className="small">
            {range[0] === 0 && range[1] === 190
              ? "Any"
              : `${range[0] === 0 ? "Any" : range[0]} - ${
                  range[1] === 190 ? "Any" : range[1]
                } min`}
          </div>
        </div>

        {/* Modern Dual-Thumb Slider */}
        <div style={{ padding: "0 12px", marginTop: "12px" }}>
          <Slider
            range
            min={0}
            max={190}
            step={10}
            value={range}
            onChange={setRange}
            trackStyle={[{ backgroundColor: "#3b82f6", height: 8 }]}
            handleStyle={[
              { borderColor: "#3b82f6", height: 20, width: 20 },
              { borderColor: "#3b82f6", height: 20, width: 20 },
            ]}
            railStyle={{ backgroundColor: "#d1d5db", height: 8 }}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Player Options</strong>
          <div className="small">
            {(() => {
              const incs = Object.entries(selectedAudiences)
                .filter(([, v]) => v === "include")
                .map(([k]) => k);
              const excs = Object.entries(selectedAudiences)
                .filter(([, v]) => v === "exclude")
                .map(([k]) => k);
              if (!incs.length && !excs.length) return "Anyone";
              return [incs.length ? `Include: ${incs.join(", ")}` : null, excs.length ? `Exclude: ${excs.join(", ")}` : null]
                .filter(Boolean)
                .join(" • ");
            })()}
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {state.audienceOptions.map((opt) => {
            const sel = selectedAudiences[opt];
            return (
              <div key={opt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 110 }}>{opt}</div>
                <button
                  className="input"
                  style={{
                    padding: "6px 8px",
                    backgroundColor: sel === "include" ? "#3b82f6" : "#e5e7eb",
                    color: sel === "include" ? "white" : "inherit",
                    borderRadius: 6,
                  }}
                  onClick={() =>
                    setSelectedAudiences((prev) => ({
                      ...prev,
                      [opt]: prev[opt] === "include" ? undefined : "include",
                    }))
                  }
                >
                  Include
                </button>
                <button
                  className="input"
                  style={{
                    padding: "6px 8px",
                    backgroundColor: sel === "exclude" ? "#ef4444" : "#e5e7eb",
                    color: sel === "exclude" ? "white" : "inherit",
                    borderRadius: 6,
                  }}
                  onClick={() =>
                    setSelectedAudiences((prev) => ({
                      ...prev,
                      [opt]: prev[opt] === "exclude" ? undefined : "exclude",
                    }))
                  }
                >
                  Exclude
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12 }}>
          <h3>Results Display</h3>
          <select
            className="input"
            value={s.sortPreference}
            onChange={(e) => setState((st) => ({ ...st, settings: { ...st.settings, sortPreference: e.target.value } }))}
          >
            <option>Random</option>
            <option>Longest to shortest</option>
            <option>Shortest to longest</option>
            <option>Alphabetically</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 w-full">
  <button
    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
    onClick={apply}
  >
    Go!
  </button>
  <button
    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition-colors"
    onClick={() => {
      setRange([0, 190]);
      setPlayers(2);
          setSelectedAudiences({});
    }}
  >
    Reset
  </button>
</div>
    </div>
  );
}