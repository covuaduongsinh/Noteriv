import { squareToXY } from "./fen";
import { BOARD_THEMES, PIECE_SETS } from "./pieces";

export interface BoardRenderConfig {
  fen: string;
  orientation: "white" | "black";
  annotations: string[];
  pieceSet: string;
  boardTheme: string;
}

/** Every board gets its own arrowhead id: with one shared id, the first board's marker wins on the whole page. */
let boardCounter = 0;

const HIGHLIGHT = /^H([a-h][1-8])\/?([grby]?)$/i;
const ARROW = /^A([a-h][1-8])-([a-h][1-8])$/i;

/**
 * The board as an SVG string. Only values from the piece/theme registries and validated square names are put into
 * it, never text from the note, so the result is safe to assign to innerHTML.
 */
export function renderBoardSVG(config: BoardRenderConfig): string {
  const theme = BOARD_THEMES[config.boardTheme] ?? BOARD_THEMES.classic;
  const pieceSet = PIECE_SETS[config.pieceSet] ?? PIECE_SETS.classic;
  const markerId = `cb-arrowhead-${++boardCounter}`;
  const ranks = config.fen.split(" ")[0].split("/");
  let svg =
    '<svg viewBox="0 0 400 400" class="chessboard-plugin-svg" style="display:block;width:100%;max-width:360px;margin:12px auto;" xmlns="http://www.w3.org/2000/svg">';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      svg += `<rect x="${col * 50}" y="${row * 50}" width="50" height="50" fill="${(row + col) % 2 === 0 ? theme.light : theme.dark}" />`;
    }
  }

  for (const annotation of config.annotations) {
    const m = annotation.match(HIGHLIGHT);
    if (!m) continue;
    const xy = squareToXY(m[1], config.orientation);
    if (!xy) continue;
    const color = theme.highlight[(m[2] || "g").toLowerCase()] ?? theme.highlight.g;
    svg += `<rect x="${xy.x}" y="${xy.y}" width="50" height="50" fill="${color}" fill-opacity="0.55" />`;
  }

  for (let rk = 0; rk < ranks.length; rk++) {
    let file = 0;
    for (const ch of ranks[rk]) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const xy = squareToXY(`${"abcdefgh"[file] ?? ""}${8 - rk}`, config.orientation);
      const piece = pieceSet.pieces[ch];
      if (xy && piece) svg += `<svg x="${xy.x}" y="${xy.y}" width="50" height="50" viewBox="${pieceSet.viewBox}">${piece}</svg>`;
      file++;
    }
  }

  svg += `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="${theme.arrow}" fill-opacity="0.85"/></marker></defs>`;
  for (const annotation of config.annotations) {
    const m = annotation.match(ARROW);
    if (!m) continue;
    const from = squareToXY(m[1], config.orientation);
    const to = squareToXY(m[2], config.orientation);
    if (!from || !to) continue;
    svg += `<line x1="${from.x + 25}" y1="${from.y + 25}" x2="${to.x + 25}" y2="${to.y + 25}" stroke="${theme.arrow}" stroke-opacity="0.85" stroke-width="6" marker-end="url(#${markerId})" />`;
  }

  return `${svg}</svg>`;
}
