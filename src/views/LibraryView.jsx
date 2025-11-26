import React, { useState } from "react";

const SHEET_VIEW_URL = "https://docs.google.com/spreadsheets/d/1JVJlhg5NDrGmB638MyGaSsYAcNHw78SPX4GDfqDMhfQ/edit?usp=sharing";

export default function LibraryView({ state, setState }) {
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  const filtered = (state.games || [])
    .filter((g) => g.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const remove = (id) => {
    setState((s) => ({ ...s, games: s.games.filter((g) => g.id !== id) }));
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Search games"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Game Library</strong>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="small">Rows: {state.sheetValues ? state.sheetValues.length - 1 : 0}</div>
            <button className="input" onClick={() => setState(s => ({ ...s, sheetSyncTrigger: (s.sheetSyncTrigger || 0) + 1 }))}>Refresh sheet</button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {state.sheetValues ? (
            <div style={{ overflow: "auto", maxHeight: 520, border: "1px solid #e5e7eb" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {state.sheetValues[0].map((h, i) => {
                      const active = sortCol === i;
                      return (
                        <th
                          key={i}
                          onClick={() => {
                            if (sortCol === i) {
                              setSortDir(d => -d);
                            } else {
                              setSortCol(i);
                              setSortDir(1);
                            }
                          }}
                          style={{
                            border: "1px solid #e5e7eb",
                            padding: 8,
                            background: "#f8fafc",
                            textAlign: "left",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          {h} {active ? (sortDir === 1 ? "▲" : "▼") : ""}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = state.sheetValues.slice(1).map((r, idx) => ({ r, idx }));
                    if (sortCol != null) {
                      rows.sort((a, b) => {
                        const va = (a.r[sortCol] || "").toString();
                        const vb = (b.r[sortCol] || "").toString();
                        const numA = Number(va);
                        const numB = Number(vb);
                        let cmp = 0;
                        if (!Number.isNaN(numA) && !Number.isNaN(numB)) cmp = numA - numB;
                        else cmp = va.localeCompare(vb);
                        return cmp * sortDir;
                      });
                    }
                    return rows.map(({ r: row }, rIdx) => (
                      <tr key={rIdx}>
                        {state.sheetValues[0].map((_, cIdx) => (
                          <td key={cIdx} style={{ border: "1px solid #eee", padding: 8 }}>{row[cIdx] ?? ""}</td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small">No sheet data loaded yet. Click Refresh sheet to fetch values.</div>
          )}
        </div>

        <div style={{ marginTop: 8 }} className="small">To keep the sheet as the single source of truth for filtering, the sheet values are read via the Sheets API using the configured key.</div>
      </div>

      <div className="game-list">
        {filtered.map((game) => (
          <div className="game-row" key={game.id}>
            <div>
              <strong>{game.name}</strong>
              <div className="small">
                {game.TotalTime
                  ? `${game.minPlayTime}-${game.maxPlayTime} min`
                  : `${game.minPlayTime}-${game.maxPlayTime} min per player`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="input"
                onClick={() => {
                  setState((s) => ({ ...s, editGame: game, route: "input" }));
                }}
              >
                Edit
              </button>
              <button className="input" onClick={() => remove(game.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
