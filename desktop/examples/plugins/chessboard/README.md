# Chessboard plugin (example)

Renders static chess diagrams from FEN in ` ```chessboard ` code blocks. See
[Creating Plugins](../../../../docs/plugins/creating-plugins.md) for the
`api.markdown.registerCodeBlockProcessor` API this plugin is built on
(requires Noteriv >= 1.3.0).

## Try it

1. Copy this folder into your vault's `.noteriv/plugins/chessboard/`, **or**
   use Settings > Plugins > Install from Folder and select this folder.
2. Enable the plugin in Settings > Plugins.
3. In a note, write:

   ```chessboard
   fen: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
   orientation: white
   annotations: He4/g, Ae2-e4
   ```

## Syntax

| Field | Required | Default | Meaning |
|---|---|---|---|
| `fen` | Yes | — | Full or partial FEN string. |
| `orientation` | No | `white` | `white` or `black`. |
| `strict` | No | `true` | `true` validates the FEN before drawing; `false` tries anyway. |
| `annotations` | No | (none) | Comma/newline separated list of `H<square>/<color>` (highlight; color is `g`, `r`, `b`, or `y`) and `A<square>-<square>` (arrow). |
| `pieceset` | No | plugin default | `classic`, `spatial`, or `minimal`. Overrides the saved default for this block only. |
| `boardtheme` | No | plugin default | `classic`, `forest`, `ocean`, or `midnight`. Overrides the saved default for this block only. |

## Piece sets & board themes

Open **Plugins > Installed > Chessboard > Settings** to preview and pick a
default piece set and board theme — they're saved per vault and used by
every ` ```chessboard ` block that doesn't set its own `pieceset`/
`boardtheme` field. Changing the default here does not redraw boards
already rendered in a currently-open note; reopen the note to see the new
default.

## Known limitations (MVP)

- Static FEN diagrams only — no PGN, no move navigation, no drag-and-drop.
- Does not render during note export/publish (falls back to plain code).
- Changing the default piece set/board theme in Settings does not live-update
  boards already rendered in an open note (see above).

## Credits

- `classic` piece set: adapted from [chessnut-pieces](https://github.com/LexLuengas/chessnut-pieces)
  by Alexis Luengas (© 2015), licensed under the Apache License 2.0.
- `spatial` piece set: adapted from the `spatial` set in
  [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/spatial)
  (original artwork: [maurimo/chess-art](https://github.com/maurimo/chess-art)
  by Maurizio Monge), licensed under the MIT License.
- `minimal` piece set: original Noteriv artwork, no external license.

See [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md) for full license
text and a description of the changes made to each third-party set.
