import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Eye,
  Lightbulb,
  Puzzle,
  RotateCcw,
} from "lucide-react";
import ChessBoard from "../components/ChessBoard";
import ChessBoardPreferences from "../components/ChessBoardPreferences";

type PuzzleLevel = 1 | 2 | 3;
type PuzzleType = "mate" | "capture" | "fork";

type BestMovePuzzle = {
  level: PuzzleLevel;
  type: PuzzleType;
  fen: string;
  solution: { from: Square; to: Square; san: string; promotion?: "q" | "r" | "b" | "n" };
  hint: string;
  explanation: string;
};

const puzzles: BestMovePuzzle[] = [
  {
    level: 1,
    type: "mate",
    fen: "7k/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    solution: { from: "a1", to: "a8", san: "Ra8#" },
    hint: "Le roi noir est enfermé par ses propres pions. Cherche un échec sur la rangée du fond.",
    explanation: "La tour atteint la huitième rangée et contrôle les cases de fuite du roi : échec et mat.",
  },
  {
    level: 1,
    type: "capture",
    fen: "7k/8/8/4q3/8/8/1B6/6K1 w - - 0 1",
    solution: { from: "b2", to: "e5", san: "Bxe5+" },
    hint: "Le fou peut atteindre la dame en diagonale.",
    explanation: "Le fou capture la dame noire tout en donnant échec au roi.",
  },
  {
    level: 1,
    type: "fork",
    fen: "7k/8/8/8/3n4/8/3K4/4Q3 b - - 0 1",
    solution: { from: "d4", to: "f3", san: "Nf3+" },
    hint: "Le cavalier noir peut donner échec au roi blanc tout en attaquant la dame.",
    explanation: "Le cavalier noir donne échec au roi blanc d2 et attaque la dame e1 : une fourchette.",
  },
  {
    level: 1,
    type: "mate",
    fen: "1k5r/8/8/8/8/8/PPP5/K7 b - - 0 1",
    solution: { from: "h8", to: "h1", san: "Rh1#" },
    hint: "Les blancs sont enfermés par leurs propres pions. Cherche l’échec sur la première rangée.",
    explanation: "La tour noire descend jusqu’à h1 et contrôle les cases de fuite du roi blanc : échec et mat.",
  },
  {
    level: 2,
    type: "capture",
    fen: "q6k/8/8/8/8/8/8/R5K1 w - - 0 1",
    solution: { from: "a1", to: "a8", san: "Rxa8+" },
    hint: "La colonne a est libre : regarde la pièce que la tour peut atteindre.",
    explanation: "La tour capture la dame a8 et donne échec au roi noir.",
  },
  {
    level: 2,
    type: "fork",
    fen: "k7/8/8/8/4n1K1/8/8/7R b - - 0 1",
    solution: { from: "e4", to: "f2", san: "Nf2+" },
    hint: "Le cavalier noir peut attaquer le roi et une tour avec le même coup.",
    explanation: "Le cavalier donne échec au roi g4 tout en attaquant la tour h1 : une fourchette.",
  },
  {
    level: 2,
    type: "mate",
    fen: "1k1q4/8/8/8/8/8/PPP5/1K6 b - - 0 1",
    solution: { from: "d8", to: "d1", san: "Qd1#" },
    hint: "La colonne d est libre. Cherche un mat en un coup avec la dame noire.",
    explanation: "La dame noire donne mat sur la première rangée, tandis que les pions blancs limitent les cases de fuite.",
  },
  {
    level: 2,
    type: "capture",
    fen: "4r1k1/8/8/8/4Q3/8/8/K7 w - - 0 1",
    solution: { from: "e4", to: "e8", san: "Qxe8+" },
    hint: "La colonne e est libre : la dame peut prendre la tour en donnant échec.",
    explanation: "La dame capture la tour e8 avec échec : les Blancs gagnent la tour sans perdre leur dame.",
  },
  {
    level: 3,
    type: "capture",
    fen: "7k/8/6q1/8/8/8/8/K5R1 w - - 0 1",
    solution: { from: "g1", to: "g6", san: "Rxg6" },
    hint: "La tour peut remonter la colonne g. Vérifie ce qu’elle peut capturer.",
    explanation: "La tour prend la dame g6 : la colonne est libre et la capture ne met pas le roi blanc en danger.",
  },
  {
    level: 3,
    type: "fork",
    fen: "7k/8/8/3n4/8/8/K3Q3/8 b - - 0 1",
    solution: { from: "d5", to: "c3", san: "Nc3+" },
    hint: "Le cavalier noir peut donner échec depuis une case qui attaque aussi la dame blanche.",
    explanation: "Le cavalier noir donne échec au roi blanc a2 et attaque la dame e2 en même temps.",
  },
  {
    level: 3,
    type: "mate",
    fen: "k7/ppp5/8/8/8/8/8/3Q1K2 w - - 0 1",
    solution: { from: "d1", to: "d8", san: "Qd8#" },
    hint: "Le roi noir est coincé sur la colonne a. Cherche un échec sur la rangée huit.",
    explanation: "La dame contrôle la rangée huit tandis que les pions noirs bloquent les cases de fuite du roi.",
  },
  {
    level: 3,
    type: "capture",
    fen: "1k5r/8/8/8/8/8/8/K6Q b - - 0 1",
    solution: { from: "h8", to: "h1", san: "Rxh1+" },
    hint: "La tour noire peut descendre la colonne h jusqu’à la dame blanche.",
    explanation: "La tour capture la dame h1 et donne échec au roi blanc.",
  },
];

const puzzleTypeLabels: Record<PuzzleType, string> = {
  mate: "Mat en un coup",
  capture: "Gain matériel",
  fork: "Fourchette",
};

const puzzleLevelLabels: Record<PuzzleLevel, string> = {
  1: "Débutant",
  2: "Intermédiaire",
  3: "Avancé",
};

const puzzlePrompts: Record<PuzzleType, string> = {
  mate: "Trouve l’échec et mat en un coup.",
  capture: "Trouve la capture qui gagne du matériel.",
  fork: "Attaque le roi et une pièce de valeur en même temps.",
};

function shuffle(items: number[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function puzzleSideToPlay(puzzle: BestMovePuzzle): "w" | "b" {
  return puzzle.fen.split(" ")[1] === "b" ? "b" : "w";
}

function createPuzzleOrder() {
  const order: number[] = [];
  let previousSide: "w" | "b" | null = null;

  for (const level of [1, 2, 3] as const) {
    const candidates = {
      w: shuffle(puzzles.flatMap((puzzle, index) =>
        puzzle.level === level && puzzleSideToPlay(puzzle) === "w" ? [index] : [],
      )),
      b: shuffle(puzzles.flatMap((puzzle, index) =>
        puzzle.level === level && puzzleSideToPlay(puzzle) === "b" ? [index] : [],
      )),
    };
    let side: "w" | "b";
    if (previousSide) {
      side = previousSide === "w" ? "b" : "w";
    } else {
      side = Math.random() < 0.5 ? "w" : "b";
    }

    while (candidates.w.length || candidates.b.length) {
      if (candidates[side].length === 0) side = side === "w" ? "b" : "w";
      const puzzleIndex = candidates[side].pop();
      if (puzzleIndex !== undefined) {
        order.push(puzzleIndex);
        previousSide = side;
        side = side === "w" ? "b" : "w";
      }
    }
  }

  return order;
}

function pieceLabel(piece: NonNullable<ReturnType<Chess["get"]>>) {
  const names = { k: "Roi", q: "Dame", r: "Tour", b: "Fou", n: "Cavalier", p: "Pion" };
  return `${names[piece.type]} ${piece.color === "w" ? "blanc" : "noir"}`;
}

export default function ProblemsPage() {
  const [puzzleOrder, setPuzzleOrder] = useState(createPuzzleOrder);
  const [sequencePosition, setSequencePosition] = useState(0);
  const puzzleIndex = puzzleOrder[sequencePosition];
  const puzzle = puzzles[puzzleIndex];
  const sideToPlay = puzzleSideToPlay(puzzle);
  const sideLabel = sideToPlay === "w" ? "blancs" : "noirs";
  const [fen, setFen] = useState(puzzle.fen);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveArrow, setMoveArrow] = useState<{ from: Square; to: Square } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState("");

  const game = useMemo(() => new Chess(fen), [fen]);
  const playablePieces = game.board().flatMap((row, rankIndex) =>
    row.flatMap((piece, fileIndex) => {
      if (!piece || piece.color !== game.turn()) return [];
      const square = `${"abcdefgh"[fileIndex]}${8 - rankIndex}` as Square;
      if (game.moves({ square, verbose: true }).length === 0) return [];
      return [{ square, piece }];
    }),
  );
  const canPlay = !solved && !solutionRevealed;

  const resetPuzzle = (index = puzzleIndex) => {
    setFen(puzzles[index].fen);
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    setMoveArrow(null);
    setHintVisible(false);
    setSolutionRevealed(false);
    setSolved(false);
    setIncorrect(false);
    setFeedback("");
  };

  const selectSquare = (square: Square) => {
    if (!canPlay) return;
    if (selectedSquare && legalTargets.includes(square)) {
      const legalMove = game.moves({ square: selectedSquare, verbose: true })
        .find((move) => move.to === square);
      if (!legalMove) return;

      const nextGame = new Chess(fen);
      const move = nextGame.move({
        from: selectedSquare,
        to: square,
        ...(legalMove.promotion ? { promotion: legalMove.promotion } : {}),
      });
      setSelectedSquare(null);
      setLegalTargets([]);
      if (
        move.from === puzzle.solution.from
        && move.to === puzzle.solution.to
        && move.promotion === puzzle.solution.promotion
      ) {
        setFen(nextGame.fen());
        setLastMove({ from: move.from, to: move.to });
        setSolved(true);
        setIncorrect(false);
        setSolvedCount((count) => count + 1);
        setStreak((current) => current + 1);
        setFeedback(`Excellent, ${move.san} est le meilleur coup. ${puzzle.explanation}`);
      } else {
        setStreak(0);
        setIncorrect(true);
        setFeedback("Ce coup est légal, mais ce n’est pas le meilleur coup. Réessaie ou demande un indice.");
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalTargets([]);
      return;
    }

    const piece = game.get(square);
    if (piece?.color === game.turn()) {
      setSelectedSquare(square);
      setLegalTargets(game.moves({ square, verbose: true }).map((move) => move.to));
      setIncorrect(false);
      setFeedback("Pièce sélectionnée. Choisis une destination légale.");
      return;
    }

    setSelectedSquare(null);
    setLegalTargets([]);
    setFeedback("Sélectionne une pièce de ta couleur.");
  };

  const revealSolution = () => {
    const solutionGame = new Chess(fen);
    const move = solutionGame.move({
      from: puzzle.solution.from,
      to: puzzle.solution.to,
      ...(puzzle.solution.promotion ? { promotion: puzzle.solution.promotion } : {}),
    });
    setSelectedSquare(null);
    setLegalTargets([]);
    setMoveArrow({ from: move.from, to: move.to });
    setSolutionRevealed(true);
    setIncorrect(false);
    setStreak(0);
    setFeedback(`La solution était ${move.san}. ${puzzle.explanation}`);
  };

  const nextPuzzle = () => {
    if (!solved && !solutionRevealed) setStreak(0);
    const nextPosition = sequencePosition + 1;
    if (nextPosition < puzzleOrder.length) {
      setSequencePosition(nextPosition);
      resetPuzzle(puzzleOrder[nextPosition]);
      return;
    }

    const nextOrder = createPuzzleOrder();
    setPuzzleOrder(nextOrder);
    setSequencePosition(0);
    resetPuzzle(nextOrder[0]);
  };

  return (
    <main className="space-y-3 text-slate-100">
      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-3 sm:p-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">
              <Puzzle size={15} aria-hidden="true" /> Entraînement tactique · mix progressif
            </p>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">Trouve le meilleur coup</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2" aria-label="Statistiques de cette session">
              <div className="min-w-16 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-center">
                <strong className="block text-base text-white">{streak}</strong>
                <span className="text-[10px] text-slate-400">Série</span>
              </div>
              <div className="min-w-16 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-center">
                <strong className="block text-base text-white">{solvedCount}</strong>
                <span className="text-[10px] text-slate-400">Réussis</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => resetPuzzle()}
              aria-label="Recommencer ce puzzle"
              title="Recommencer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="h-0.5 bg-slate-800" role="progressbar" aria-label={`Niveau ${puzzle.level} sur 3, puzzle ${sequencePosition + 1} sur ${puzzles.length}`} aria-valuemin={1} aria-valuemax={puzzles.length} aria-valuenow={sequencePosition + 1}>
          <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${((sequencePosition + 1) / puzzles.length) * 100}%` }} />
        </div>

        <div className="flex gap-3 p-3 sm:p-4 lg:gap-4">
          <section aria-label="Position à résoudre" className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950/50 p-2 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Puzzle {String(sequencePosition + 1).padStart(2, "0")} / {String(puzzles.length).padStart(2, "0")}</span>
              <span className="text-emerald-300">{puzzleTypeLabels[puzzle.type]}</span>
            </div>
            <ChessBoardPreferences />
            <div className="mx-auto w-fit max-w-full">
              <ChessBoard
                fen={fen}
                selectedSquare={selectedSquare}
                legalTargets={legalTargets}
                lastMove={lastMove}
                hintSquare={hintVisible && !solved && !solutionRevealed ? puzzle.solution.from : null}
                moveArrow={moveArrow}
                onSquareClick={selectSquare}
                interactive={canPlay}
                flipped={sideToPlay === "b"}
                compact
              />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              {solved ? "Coup validé" : solutionRevealed ? "Solution affichée" : `Aux ${sideLabel} de jouer`}
            </p>
          </section>

          <aside className="mx-auto flex w-full max-w-3xl min-w-0 flex-col rounded-xl border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">
              Niveau {puzzle.level} · {puzzleLevelLabels[puzzle.level]} · {puzzleTypeLabels[puzzle.type]}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Quel est le meilleur coup ?</h2>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              Les {sideLabel} jouent. {puzzlePrompts[puzzle.type]} Sélectionne une pièce puis sa destination.
            </p>

            <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-sm leading-5 ${
              solved
                ? "border-emerald-700/70 bg-emerald-950/50 text-emerald-200"
                : incorrect
                  ? "border-rose-800/70 bg-rose-950/40 text-rose-200"
                  : "border-slate-700 bg-slate-900/70 text-slate-300"
            }`} role="status" aria-live="polite">
              {solved ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <CircleHelp size={17} className="mt-0.5 shrink-0" />}
              <span>{feedback || "Analyse la position et cherche le coup qui répond à l’objectif."}</span>
            </div>

            {canPlay && (
              <div className="mt-3 space-y-2">
                <label htmlFor="puzzle-piece-select" className="block text-xs font-medium text-slate-400">
                  Sélectionner une pièce (clavier ou tactile)
                </label>
                <select
                  id="puzzle-piece-select"
                  value={selectedSquare ?? ""}
                  onChange={(event) => {
                    if (event.target.value) selectSquare(event.target.value as Square);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <option value="">Choisir une pièce…</option>
                  {playablePieces.map(({ square, piece }) => (
                    <option key={square} value={square}>{pieceLabel(piece)} · {square}</option>
                  ))}
                </select>
                {selectedSquare && legalTargets.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-slate-400">Cases de destination</p>
                    <div className="flex flex-wrap gap-2">
                      {legalTargets.map((square) => (
                        <button
                          key={square}
                          type="button"
                          onClick={() => selectSquare(square)}
                          className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-emerald-400"
                        >
                          {square}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {hintVisible && !solved && !solutionRevealed && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5 text-sm leading-5 text-amber-100" role="note">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-300" />
                {puzzle.hint}
              </p>
            )}

            {solutionRevealed && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-950/40 px-3 py-2 text-sm">
                <span className="text-slate-300">Meilleur coup</span>
                <strong className="text-lg text-emerald-300">{puzzle.solution.san}</strong>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              {canPlay && (
                <>
                  <button
                    type="button"
                    onClick={() => setHintVisible(true)}
                    disabled={hintVisible}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                  >
                    <Lightbulb size={15} aria-hidden="true" /> {hintVisible ? "Indice affiché" : "Indice"}
                  </button>
                  <button
                    type="button"
                    onClick={revealSolution}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    <Eye size={15} aria-hidden="true" /> Révéler
                  </button>
                </>
              )}
              {(solved || solutionRevealed) && (
                <button
                  type="button"
                  onClick={() => resetPuzzle()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-sm text-slate-200 hover:bg-slate-700"
                >
                  <RotateCcw size={15} aria-hidden="true" /> Rejouer
                </button>
              )}
              <button
                type="button"
                onClick={nextPuzzle}
                className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                {solved || solutionRevealed ? "Puzzle suivant" : "Passer"} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
