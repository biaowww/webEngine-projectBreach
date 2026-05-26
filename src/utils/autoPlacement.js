// autoPlacement.js — auto-generate sensible default board positions
// for player pieces based on their role.
//
// Board: 7 cols (0–6), player zone rows 4–7 (row 4 = front, row 7 = back)
//
// Role → preferred row assignment:
//   tank / def      → row 4 (front)
//   atk_tank / ftr  → row 5 (mid/engage)
//   support / sup   → row 6 (follow mid)
//   adc             → row 7 (back, two flanks first)
//
// Units are evenly spread across 7 columns within each row.
// Units that exceed maxOnBoard go to bench slots.

function autoPlacePlayer(pieceIds, maxOnBoard, PIECE_DATA) {
  const all = pieceIds.map(id => ({ id, data: PIECE_DATA[id] }))
    .filter(p => p.data); // guard against missing ids

  // ── Board occupancy priority (who stays on board when slots are limited):
  //   heroes always first, then tank/def, then adc, then support
  // ── Row placement priority (which row on the board):
  //   tank/def → row 4, atk_tank/ftr → row 5, support → row 6, adc → row 7
  // These two priorities are intentionally different.

  const boardPriority  = { hero: 0, tank: 1, atk_tank: 1, ftr: 1, adc: 2, support: 3 };

  all.sort((a, b) => {
    // Heroes always first
    if (a.data.isHero !== b.data.isHero) return a.data.isHero ? -1 : 1;
    // Then by board usefulness
    const pa = boardPriority[a.data.role] ?? 2;
    const pb = boardPriority[b.data.role] ?? 2;
    return pa - pb;
  });

  const onBoard = all.slice(0, maxOnBoard);
  const onBench = all.slice(maxOnBoard);

  // Group by desired row
  const rowMap = { 4: [], 5: [], 6: [], 7: [] };
  onBoard.forEach(({ id, data }) => {
    const role = data.role;
    if (role === 'tank')                     rowMap[4].push(id);
    else if (role === 'atk_tank' || role === 'ftr') rowMap[5].push(id);
    else if (role === 'support')             rowMap[6].push(id);
    else                                     rowMap[7].push(id); // adc default
  });

  // If a row is empty, push remaining units down
  // (e.g. no tank → put ftr at row 4)
  const reassign = () => {
    const rows = [4, 5, 6, 7];
    let buffer = [];
    rows.forEach(r => {
      if (rowMap[r].length === 0 && buffer.length > 0) {
        rowMap[r].push(...buffer.splice(0, 1));
      }
    });
  };
  // Move overflow from earlier rows to next empty rows
  [4, 5, 6].forEach(r => {
    while (rowMap[r].length > 4) { // at most 4 wide per row
      const extra = rowMap[r].pop();
      rowMap[r + 1].unshift(extra);
    }
  });

  // Convert each row to placements with evenly spaced columns
  const placements = [];
  [4, 5, 6, 7].forEach(row => {
    const ids = rowMap[row];
    if (!ids.length) return;
    const cols = spreadColumns(ids.length, 7);
    ids.forEach((id, i) => {
      placements.push({ pieceId: id, col: cols[i], row });
    });
  });

  // Bench placements (slot indices 0, 1, 2…)
  const benchSlots = onBench.map((p, i) => ({ pieceId: p.id, slot: i }));

  return { placements, benchSlots };
}

// Spread n items evenly across COLS columns, centered
function spreadColumns(n, cols) {
  if (n === 1) return [Math.floor(cols / 2)]; // center
  const step = (cols - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(i * step));
}

window.autoPlacePlayer = autoPlacePlayer;
