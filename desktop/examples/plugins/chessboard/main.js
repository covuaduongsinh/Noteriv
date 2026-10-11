// Chessboard plugin for Noteriv
//
// Renders ```chessboard code blocks as a static SVG chess diagram, parsed
// from a FEN string plus a few optional fields. Requires the
// `api.markdown.registerCodeBlockProcessor` hook (Noteriv >= 1.3.0).
//
// Syntax:
//
//   ```chessboard
//   fen: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
//   orientation: white
//   strict: true
//   annotations: He4/g, Ae2-e4
//   ```
//
// Fields:
//   fen          required. Full or partial FEN string.
//   orientation  "white" (default) or "black".
//   strict       "true" (default) validates the FEN before drawing;
//                "false" tries to draw it anyway.
//   annotations  comma/newline separated list of:
//                  H<square>/<color>  highlight a square (color: g, r, b, y; default g)
//                  A<square>-<square> draw an arrow between two squares

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseChessboardBlock(source) {
  var fields = {};
  var lines = source.split("\n");
  var pendingKey = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) {
      pendingKey = null;
      continue;
    }

    var kv = line.match(/^([a-zA-Z]+)\s*:\s*(.*)$/);
    if (kv) {
      var key = kv[1].toLowerCase();
      var value = kv[2].trim();
      fields[key] = value;
      pendingKey = value === "" ? key : null;
      continue;
    }

    if (pendingKey) {
      fields[pendingKey] = fields[pendingKey] ? fields[pendingKey] + "," + line : line;
    }
  }

  return {
    fen: fields.fen || null,
    orientation: (fields.orientation || "white").toLowerCase() === "black" ? "black" : "white",
    strict: fields.strict === undefined ? true : fields.strict.toLowerCase() !== "false",
    annotations: (fields.annotations || "")
      .split(/[,\n]/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean),
  };
}

function validateFEN(fen) {
  if (typeof fen !== "string" || !fen.trim()) {
    return { valid: false, error: "FEN is empty" };
  }
  var parts = fen.trim().split(/\s+/);
  var rows = (parts[0] || "").split("/");
  if (rows.length !== 8) {
    return { valid: false, error: "Expected 8 ranks, got " + rows.length };
  }

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var count = 0;
    for (var i = 0; i < row.length; i++) {
      var ch = row[i];
      if (/[1-8]/.test(ch)) {
        count += Number(ch);
      } else if (/[prnbqkPRNBQK]/.test(ch)) {
        count += 1;
      } else {
        return { valid: false, error: 'Invalid character "' + ch + '" in rank "' + row + '"' };
      }
    }
    if (count !== 8) {
      return { valid: false, error: 'Rank "' + row + '" does not sum to 8 squares' };
    }
  }

  if (parts[1] && !/^[wb]$/.test(parts[1])) {
    return { valid: false, error: 'Invalid side to move "' + parts[1] + '"' };
  }
  if (parts[2] && !/^(-|[KQkq]{1,4})$/.test(parts[2])) {
    return { valid: false, error: 'Invalid castling field "' + parts[2] + '"' };
  }
  if (parts[3] && !/^(-|[a-h][36])$/.test(parts[3])) {
    return { valid: false, error: 'Invalid en passant field "' + parts[3] + '"' };
  }

  return { valid: true };
}

function squareToXY(square, orientation) {
  var file = square.charCodeAt(0) - 97; // a-h -> 0-7
  var rank = Number(square[1]) - 1;     // 1-8 -> 0-7
  var col = orientation === "black" ? 7 - file : file;
  var row = orientation === "black" ? rank : 7 - rank;
  return { x: col * 50, y: row * 50 };
}

var PIECE_GLYPH = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

var HIGHLIGHT_COLOR = {
  g: "#4caf50",
  r: "#f44336",
  b: "#2196f3",
  y: "#ffeb3b",
};

function renderBoardSVG(config) {
  var board = config.fen.split(" ")[0];
  var ranks = board.split("/");
  var svg = '<svg viewBox="0 0 400 400" class="chessboard-plugin-svg" style="display:block;width:100%;max-width:360px;margin:12px auto;" xmlns="http://www.w3.org/2000/svg">';

  // 1. squares
  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 8; col++) {
      var light = (row + col) % 2 === 0;
      svg += '<rect x="' + col * 50 + '" y="' + row * 50 + '" width="50" height="50" fill="' + (light ? "#f0d9b5" : "#b58863") + '" />';
    }
  }

  // 2. highlights
  for (var a = 0; a < config.annotations.length; a++) {
    var hMatch = config.annotations[a].match(/^H([a-h][1-8])\/?([grby]?)$/i);
    if (!hMatch) continue;
    var hXY = squareToXY(hMatch[1], config.orientation);
    var color = HIGHLIGHT_COLOR[(hMatch[2] || "g").toLowerCase()] || HIGHLIGHT_COLOR.g;
    svg += '<rect x="' + hXY.x + '" y="' + hXY.y + '" width="50" height="50" fill="' + color + '" fill-opacity="0.55" />';
  }

  // 3. pieces
  for (var rk = 0; rk < ranks.length; rk++) {
    var file = 0;
    var rankStr = ranks[rk];
    for (var c = 0; c < rankStr.length; c++) {
      var ch = rankStr[c];
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      var square = "abcdefgh"[file] + (8 - rk);
      var xy = squareToXY(square, config.orientation);
      var glyph = PIECE_GLYPH[ch];
      if (glyph) {
        var isWhite = ch === ch.toUpperCase();
        var fill = isWhite ? "#fff" : "#1a1a1a";
        var stroke = isWhite ? "#1a1a1a" : "none";
        svg += '<text x="' + (xy.x + 25) + '" y="' + (xy.y + 36) + '" font-size="34" text-anchor="middle" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1">' + glyph + '</text>';
      }
      file++;
    }
  }

  // 4. arrows
  svg += '<defs><marker id="cb-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="#1e88e5" fill-opacity="0.85"/></marker></defs>';
  for (var b = 0; b < config.annotations.length; b++) {
    var aMatch = config.annotations[b].match(/^A([a-h][1-8])-([a-h][1-8])$/i);
    if (!aMatch) continue;
    var from = squareToXY(aMatch[1], config.orientation);
    var to = squareToXY(aMatch[2], config.orientation);
    var x1 = from.x + 25, y1 = from.y + 25;
    var x2 = to.x + 25, y2 = to.y + 25;
    svg += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#1e88e5" stroke-opacity="0.85" stroke-width="6" marker-end="url(#cb-arrowhead)" />';
  }

  svg += "</svg>";
  return svg;
}

function chessboardProcessor(source, el) {
  var config = parseChessboardBlock(source);

  var errorStyle = "padding:10px 16px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;color:#f44336;";

  if (!config.fen) {
    el.innerHTML = '<div class="chessboard-error" style="' + errorStyle + '">Missing "fen:" field</div>';
    return;
  }

  if (config.strict) {
    var result = validateFEN(config.fen);
    if (!result.valid) {
      el.innerHTML = '<div class="chessboard-error" style="' + errorStyle + '">Invalid FEN: ' + escapeHtml(result.error) + '</div>';
      return;
    }
  }

  try {
    el.innerHTML = '<div class="chessboard-plugin-widget">' + renderBoardSVG(config) + '</div>';
  } catch (err) {
    el.innerHTML = '<div class="chessboard-error" style="' + errorStyle + '">Render error: ' + escapeHtml(err && err.message ? err.message : String(err)) + '</div>';
  }

  return function cleanup() {
    el.innerHTML = "";
  };
}

module.exports.onLoad = function (api) {
  if (!api.markdown || typeof api.markdown.registerCodeBlockProcessor !== "function") {
    api.ui.showNotice("Chessboard plugin requires a newer version of Noteriv (markdown code block API).", 6000);
    return;
  }
  api.markdown.registerCodeBlockProcessor("chessboard", chessboardProcessor);
};

module.exports.onUnload = function () {
  // PluginManager.unloadPlugin already calls unregisterAllCodeBlockProcessorsForPlugin(pluginId),
  // so no manual cleanup is required here.
};
