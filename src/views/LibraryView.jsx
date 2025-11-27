import React, { useState } from "react";

const SHEET_VIEW_URL =
  "https://docs.google.com/spreadsheets/d/1JVJlhg5NDrGmB638MyGaSsYAcNHw78SPX4GDfqDMhfQ/edit?usp=sharing";

export default function LibraryView({ state, setState }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>Game Library</strong>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="small">
              Rows: {state.sheetValues ? state.sheetValues.length - 1 : 0}
            </div>
            <button
              className="input"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  sheetSyncTrigger: (s.sheetSyncTrigger || 0) + 1,
                }))
              }
            >
              Refresh sheet
            </button>
          </div>
        </div>

        {/* --- Sheet Table --- */}
        <div style={{ marginTop: 12 }}>
          {state.sheetValues ? (
            <div
              style={{
                overflow: "auto",
                maxHeight: 520,
                border: "1px solid #e5e7eb",
              }}
            >
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
                              setSortDir((d) => -d);
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
                    const rows = state.sheetValues
                      .slice(1)
                      .map((r, idx) => ({ r, idx }));

                    if (sortCol != null) {
                      rows.sort((a, b) => {
                        const va = (a.r[sortCol] || "").toString();
                        const vb = (b.r[sortCol] || "").toString();
                        const numA = Number(va);
                        const numB = Number(vb);
                        let cmp = 0;
                        if (!Number.isNaN(numA) && !Number.isNaN(numB))
                          cmp = numA - numB;
                        else cmp = va.localeCompare(vb);
                        return cmp * sortDir;
                      });
                    }

                    return rows.map(({ r }, rIdx) => (
                      <tr key={rIdx}>
                        {state.sheetValues[0].map((_, cIdx) => (
                          <td
                            key={cIdx}
                            style={{ border: "1px solid #eee", padding: 8 }}
                          >
                            {r[cIdx] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small">
              No sheet data loaded yet. Click Refresh sheet to fetch values.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}