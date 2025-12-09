import React, { useState } from "react";

const SHEET_VIEW_URL =
  "https://docs.google.com/spreadsheets/d/1JVJlhg5NDrGmB638MyGaSsYAcNHw78SPX4GDfqDMhfQ/edit?usp=sharing";

export default function LibraryView({ state, setState }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  const updateCell = async (rowIdx, colIdx, value) => {
    try {
      const sheetId = "1JVJlhg5NDrGmB638MyGaSsYAcNHw78SPX4GDfqDMhfQ";
      const range = `Sheet1!${String.fromCharCode(65 + colIdx)}${rowIdx + 2}`; // +2 because row 1 is header and sheets are 1-indexed
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [[value]],
          }),
        }
      );

      if (response.ok) {
        // Update local state
        setState((s) => {
          const newValues = [...s.sheetValues];
          newValues[rowIdx + 1][colIdx] = value;
          return { ...s, sheetValues: newValues };
        });
      } else {
        alert("Failed to update cell. Make sure the sheet is publicly editable.");
      }
    } catch (error) {
      console.error("Error updating cell:", error);
      alert("Error updating cell: " + error.message);
    }
  };

  const handleCellClick = (rowIdx, colIdx, currentValue) => {
    setEditingCell({ rowIdx, colIdx });
    setEditValue(currentValue);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const { rowIdx, colIdx } = editingCell;
      const currentValue = state.sheetValues[rowIdx + 1][colIdx] ?? "";
      if (editValue !== currentValue) {
        updateCell(rowIdx, colIdx, editValue);
      }
    }
    setEditingCell(null);
  };

  const handleCheckboxToggle = (rowIdx, colIdx, currentValue) => {
    const newValue = currentValue === "TRUE" ? "FALSE" : "TRUE";
    updateCell(rowIdx, colIdx, newValue);
  };

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
                        {state.sheetValues[0].map((_, cIdx) => {
                          const cellValue = r[cIdx] ?? "";
                          const isBoolean = cellValue === "TRUE" || cellValue === "FALSE";
                          const isEditing = editingCell?.rowIdx === rIdx && editingCell?.colIdx === cIdx;
                          
                          return (
                            <td
                              key={cIdx}
                              style={{ border: "1px solid #eee", padding: 8 }}
                            >
                              {isBoolean ? (
                                <input
                                  type="checkbox"
                                  checked={cellValue === "TRUE"}
                                  onChange={() => handleCheckboxToggle(rIdx, cIdx, cellValue)}
                                  style={{ cursor: "pointer" }}
                                />
                              ) : isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCellBlur();
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  autoFocus
                                  style={{ width: "100%", padding: 4 }}
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellClick(rIdx, cIdx, cellValue)}
                                  style={{ cursor: "text", minHeight: 20 }}
                                >
                                  {cellValue}
                                </div>
                              )}
                            </td>
                          );
                        })}
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