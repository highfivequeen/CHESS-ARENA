import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  Crown,
  Eye,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import type { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axios";
import ChessBoard from "../components/ChessBoard";
import ChessBoardPreferences from "../components/ChessBoardPreferences";
import MoveReviewControls from "../components/MoveReviewControls";
import { buildMovePositions } from "../chess/moveHistory";

type BackendGame = {
  id: number;
  status: string;
  result: string | null;
  currentFen: string;
  activeColor: string | null;
  createdAt: string;
  endedAt: string | null;
};

type GameParticipant = {
  id: number;
  userId: number | null;
  color: "WHITE" | "BLACK";
};

type BackendMove = {
  from: string;
  to: string;
  san: string | null;
  ply: number;
};

type GameDetails = {
  game: BackendGame;
  participants: GameParticipant[];
};

type GameAnalysisPosition = {
  ply: number;
  san: string | null;
  fen: string;
  evaluationCpWhite: number | null;
  bestMove: string | null;
  playedMove: string;
  principalVariation: string;
  depth: number;
};

type GameAnalysisLine = {
  fen: string;
  evaluationCpWhite: number | null;
  bestMove: string | null;
  principalVariation: string;
  depth: number;
};

type GameAnalysisRecord = {
  engine: string;
  engineVersion: string | null;
  depth: number | null;
  analysisData: {
    positions: GameAnalysisPosition[];
    positionsTruncated: boolean;
    finalPosition: GameAnalysisLine;
  } | null;
};

type GameAnalysisResponse = {
  status: "READY" | "PENDING";
  analyses: GameAnalysisRecord[];
};

type AnalysisStatus = "IDLE" | "REQUESTING" | "PENDING" | "READY" | "ERROR";

type PublicPlayer = {
  id: number;
  username: string;
  avatarUrl: string | null;
  overallRating: number;
};

type GamesPageProps = {
  onNavigate: (tab: string) => void;
};

function apiMessage(error: unknown) {
  const response = (error as AxiosError<{ message?: string }>).response?.data;
  return response?.message ?? (error instanceof Error ? error.message : "La requête a échoué.");
}

function statusLabel(status: string) {
  return ({
    WAITING: "En attente",
    IN_PROGRESS: "En cours",
    FINISHED: "Terminée",
  } as Record<string, string>)[status] ?? status;
}

function resultLabel(result: string | null) {
  return ({
    WHITE_WIN: "Victoire des Blancs",
    BLACK_WIN: "Victoire des Noirs",
    DRAW: "Match nul",
  } as Record<string, string>)[result ?? ""] ?? result;
}

function formatGameDate(value: unknown, fallback?: unknown) {
  const candidates = [value, fallback];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number" && !(candidate instanceof Date)) {
      continue;
    }
    const date = candidate instanceof Date ? candidate : new Date(candidate);
    if (Number.isFinite(date.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
    }
  }
  return "Date indisponible";
}

function findLegalUciMove(chess: Chess, uci: string) {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci.toLowerCase());
  if (!match) return undefined;
  return chess.moves({ verbose: true }).find((move) =>
    move.from === match[1] &&
    move.to === match[2] &&
    (move.promotion ?? "") === (match[3] ?? ""),
  );
}

function uciToSan(fen: string, uci: string | null) {
  if (!uci) return "Aucun coup légal";
  const move = findLegalUciMove(new Chess(fen), uci);
  return move?.san ?? uci;
}

function formatPrincipalVariation(fen: string, line: string) {
  const chess = new Chess(fen);
  const sanMoves: string[] = [];
  for (const uci of line.trim().split(/\s+/).filter(Boolean)) {
    const move = findLegalUciMove(chess, uci);
    if (!move) break;
    sanMoves.push(move.san);
    chess.move(move);
  }
  return sanMoves.join(" ");
}

function evaluationLabel(evaluationCpWhite: number | null) {
  if (evaluationCpWhite === null) return "Indisponible";
  if (Math.abs(evaluationCpWhite) >= 100_000) {
    return `${evaluationCpWhite > 0 ? "+" : "−"}#`;
  }
  const pawns = evaluationCpWhite / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

export default function GamesPage({ onNavigate }: GamesPageProps) {
  const { profile } = useAuth();
  const [games, setGames] = useState<BackendGame[]>([]);
  const [selected, setSelected] = useState<GameDetails | null>(null);
  const [moves, setMoves] = useState<BackendMove[]>([]);
  const [publicPlayersSnapshot, setPublicPlayersSnapshot] = useState<{
    gameId: number;
    players: Record<number, PublicPlayer>;
  } | null>(null);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("IDLE");
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState<GameAnalysisRecord | null>(null);
  const moveReview = useMemo(() => buildMovePositions(moves), [moves]);
  const selectedParticipantIds = useMemo(
    () => [...new Set(selected?.participants
      .map((participant) => participant.userId)
      .filter((userId): userId is number => userId !== null) ?? [])],
    [selected],
  );
  const selectedGameId = selected?.game.id;
  const publicPlayers: Record<number, PublicPlayer> = publicPlayersSnapshot && publicPlayersSnapshot.gameId === selectedGameId
    ? publicPlayersSnapshot.players
    : {};

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axiosInstance.get<BackendGame[]>("/games/me");
      setGames(data);
    } catch (requestError) {
      setError(apiMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchGames);
  }, [fetchGames]);

  useEffect(() => {
    const gameId = selectedGameId;
    if (gameId === undefined || selectedParticipantIds.length === 0) return;

    let cancelled = false;
    void Promise.all(selectedParticipantIds.map(async (userId) => {
      const { data } = await axiosInstance.get<PublicPlayer>(`/users/public/${userId}`);
      return data;
    })).then((players) => {
      if (!cancelled) {
        setPublicPlayersSnapshot({
          gameId,
          players: Object.fromEntries(players.map((player) => [player.id, player])),
        });
      }
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(apiMessage(requestError));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedGameId, selectedParticipantIds]);

  useEffect(() => {
    if (analysisStatus !== "PENDING" || selectedGameId === undefined) return;
    let cancelled = false;
    let timer: number | undefined;

    const pollAnalysis = async () => {
      try {
        const { data } = await axiosInstance.get<GameAnalysisResponse>(
          `/games/${selectedGameId}/analysis`,
        );
        if (cancelled) return;
        if (data.status === "READY") {
          const readyAnalysis = data.analyses[0];
          if (!readyAnalysis) {
            setAnalysisError("Le serveur a indiqué que l’analyse était prête sans retourner de résultat.");
            setAnalysisStatus("ERROR");
            return;
          }
          setAnalysis(readyAnalysis);
          setAnalysisStatus("READY");
          return;
        }
        timer = window.setTimeout(() => void pollAnalysis(), 3_000);
      } catch (requestError) {
        if (!cancelled) {
          setAnalysisError(apiMessage(requestError));
          setAnalysisStatus("ERROR");
        }
      }
    };

    timer = window.setTimeout(() => void pollAnalysis(), 3_000);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [analysisStatus, selectedGameId]);

  const openGame = async (game: BackendGame) => {
    setSelectedLoading(true);
    setError("");
    setAnalysisStatus("IDLE");
    setAnalysisError("");
    setAnalysis(null);
    setReviewPly(null);
    try {
      const [{ data: details }, { data: history }] = await Promise.all([
        axiosInstance.get<GameDetails>(`/games/${game.id}`),
        axiosInstance.get<BackendMove[]>(`/games/${game.id}/moves`),
      ]);
      setSelected(details);
      setMoves(history);
    } catch (requestError) {
      setError(apiMessage(requestError));
    } finally {
      setSelectedLoading(false);
    }
  };

  const requestAnalysis = async () => {
    if (!selected || selected.game.status !== "FINISHED") return;
    setAnalysisStatus("REQUESTING");
    setAnalysisError("");
    setAnalysis(null);
    try {
      const { data } = await axiosInstance.post<GameAnalysisResponse>(
        `/games/${selected.game.id}/analysis`,
      );
      if (data.status === "READY") {
        const readyAnalysis = data.analyses[0];
        if (!readyAnalysis) {
          throw new Error("Le serveur a indiqué que l’analyse était prête sans retourner de résultat.");
        }
        setAnalysis(readyAnalysis);
        setAnalysisStatus("READY");
      } else {
        setAnalysisStatus("PENDING");
      }
    } catch (requestError) {
      setAnalysisError(apiMessage(requestError));
      setAnalysisStatus("ERROR");
    }
  };

  if (selected) {
    const myId = Number(profile?.id);
    const ownParticipant = selected.participants.find((item) => item.userId === myId);
    const white = selected.participants.find((item) => item.color === "WHITE");
    const black = selected.participants.find((item) => item.color === "BLACK");
    const lastMove = moves.at(-1);
    const currentPly = reviewPly === null ? moves.length : Math.min(reviewPly, moves.length);
    const isReviewing = currentPly < moves.length;
    const reviewedPosition = moveReview.positions[currentPly];
    const listedGameDate = games.find((game) => game.id === selected.game.id)?.createdAt;
    const analyzedPositions = analysis?.analysisData?.positions ?? [];
    const displayedAnalysis = currentPly === moves.length
      ? analysis?.analysisData?.finalPosition
      : analyzedPositions.find((position) => position.ply === currentPly + 1);
    const previousMoveAnalysis = currentPly > 0
      ? analyzedPositions.find((position) => position.ply === currentPly)
      : undefined;

    return (
      <section className="space-y-5">
        <button
          onClick={() => {
            setSelected(null);
            setAnalysisStatus("IDLE");
            setAnalysisError("");
            setAnalysis(null);
          }}
          className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à mes parties
        </button>
        {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">PARTIE · #{selected.game.id}</p>
                <h1 className="text-xl font-semibold text-white">{statusLabel(selected.game.status)}</h1>
              </div>
              {selected.game.result && <p className="text-sm text-amber-200">{resultLabel(selected.game.result)}</p>}
            </div>
            <div className="flex justify-center">
              <ChessBoard
                fen={isReviewing && reviewedPosition ? reviewedPosition.fen : selected.game.currentFen}
                selectedSquare={null}
                legalTargets={[]}
                lastMove={isReviewing
                  ? reviewedPosition?.lastMove ?? null
                  : lastMove ? { from: lastMove.from as Square, to: lastMove.to as Square } : null}
                onSquareClick={() => {}}
                flipped={ownParticipant?.color === "BLACK"}
                interactive={false}
              />
            </div>
            <ChessBoardPreferences />
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <h2 className="mb-3 font-semibold text-white">Joueurs</h2>
              <p className="text-sm text-slate-300">
                Blancs · {white?.userId === null ? "Invité" : publicPlayers[white?.userId ?? -1]?.username ?? (white?.userId ? `Compte ${white.userId}` : "—")}
                {white?.userId !== null && white?.userId !== undefined && publicPlayers[white.userId] && (
                  <span className="ml-2 text-amber-200">Elo · {publicPlayers[white.userId].overallRating}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Noirs · {black?.userId === null ? "Invité" : publicPlayers[black?.userId ?? -1]?.username ?? (black?.userId ? `Compte ${black.userId}` : "—")}
                {black?.userId !== null && black?.userId !== undefined && publicPlayers[black.userId] && (
                  <span className="ml-2 text-amber-200">Elo · {publicPlayers[black.userId].overallRating}</span>
                )}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                {formatGameDate(selected.game.createdAt, listedGameDate)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <h2 className="mb-3 font-semibold text-white">Coups</h2>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {moves.length === 0 ? <p className="text-sm text-slate-500">Aucun coup joué.</p> : moves.map((move, index) => (
                  <button
                    type="button"
                    key={move.ply ?? index}
                    aria-pressed={currentPly === index + 1}
                    onClick={() => setReviewPly(index + 1 === moves.length ? null : index + 1)}
                    className={`flex w-full gap-3 rounded px-2 py-1 text-left text-sm hover:bg-slate-800${currentPly === index + 1 ? " bg-slate-800" : ""}`}
                  >
                    <span className="w-7 text-slate-500">{Math.floor(index / 2) + 1}.</span>
                    <span className="text-slate-200">{move.san ?? `${move.from}–${move.to}`}</span>
                  </button>
                ))}
              </div>
              <div className="vc-game-history-review">
                <MoveReviewControls
                  currentPly={currentPly}
                  moveCount={moves.length}
                  onSelectPly={(ply) => setReviewPly(ply === moves.length ? null : ply)}
                />
                {moveReview.error && <p role="alert" className="mt-3 text-sm text-rose-300">Impossible de relire les coups : {moveReview.error}</p>}
              </div>
            </div>
            <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5" aria-labelledby="game-analysis-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="game-analysis-title" className="font-semibold text-white">Analyse de la partie</h2>
                {selected.game.status === "FINISHED" && analysisStatus !== "READY" && (
                  <button
                    type="button"
                    onClick={() => void requestAnalysis()}
                    disabled={analysisStatus === "REQUESTING" || analysisStatus === "PENDING"}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
                  >
                    {analysisStatus === "REQUESTING" || analysisStatus === "PENDING"
                      ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : <Brain className="h-4 w-4" aria-hidden="true" />}
                    {analysisStatus === "ERROR" ? "Réessayer l’analyse" : "Analyser avec Stockfish"}
                  </button>
                )}
              </div>

              {selected.game.status !== "FINISHED" ? (
                <p className="mt-3 text-sm text-slate-400">
                  L’analyse sera disponible après la fin de la partie.
                </p>
              ) : analysisStatus === "REQUESTING" ? (
                <p className="mt-3 text-sm text-slate-400" role="status">
                  Demande d’analyse envoyée à Stockfish…
                </p>
              ) : analysisStatus === "PENDING" ? (
                <p className="mt-3 text-sm text-slate-400" role="status">
                  Stockfish analyse la partie. Les résultats s’afficheront ici dès qu’ils seront prêts.
                </p>
              ) : analysisError ? (
                <p className="mt-3 text-sm text-rose-300" role="alert">{analysisError}</p>
              ) : analysis ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500">
                    {analysis.engine}{analysis.engineVersion ? ` ${analysis.engineVersion}` : ""}
                    {analysis.depth ? ` · profondeur ${analysis.depth}` : ""}
                  </p>
                  {analysis.analysisData?.positionsTruncated && (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="status">
                      Pour limiter la durée de calcul, seuls les 200 derniers demi-coups ont été analysés.
                    </p>
                  )}
                  {displayedAnalysis ? (
                    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">Évaluation · avantage Blancs</span>
                        <strong className="font-mono text-lg text-emerald-300">
                          {evaluationLabel(displayedAnalysis.evaluationCpWhite)}
                        </strong>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        Meilleur coup :{" "}
                        <strong className="text-white">
                          {uciToSan(displayedAnalysis.fen, displayedAnalysis.bestMove)}
                        </strong>
                      </p>
                      {displayedAnalysis.principalVariation && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          Ligne principale : {formatPrincipalVariation(
                            displayedAnalysis.fen,
                            displayedAnalysis.principalVariation,
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Aucune analyse détaillée n’est disponible pour cette position.
                    </p>
                  )}
                  {previousMoveAnalysis && moves[currentPly - 1] && (
                    <p className="text-xs leading-relaxed text-slate-400">
                      Avant le coup {currentPly} ({moves[currentPly - 1].san ?? "coup joué"}),
                      {" "}Stockfish proposait{" "}
                      <strong className="text-slate-200">
                        {uciToSan(previousMoveAnalysis.fen, previousMoveAnalysis.bestMove)}
                      </strong>.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Lancez une analyse pour afficher l’évaluation et la ligne recommandée pour chaque position.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">VOTRE HISTORIQUE</p>
          <h1 className="text-2xl font-semibold text-white">Mes parties</h1>
        </div>
        <button
          onClick={() => onNavigate("play")}
          className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
        >
          Nouvelle partie
        </button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Chargement de vos parties…</p>}

      {!loading && games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-14 text-center">
          <Crown className="mx-auto h-10 w-10 text-slate-600" aria-hidden="true" />
          <p className="mt-3 font-medium text-slate-200">Aucune partie pour le moment</p>
          <button onClick={() => onNavigate("play")} className="mt-3 text-sm text-amber-300 hover:text-amber-200">Lancer une partie</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <button
              key={game.id}
              disabled={selectedLoading}
              onClick={() => void openGame(game)}
              className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left transition hover:border-amber-500/40 hover:bg-slate-900 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Partie #{game.id}</span>
                {game.status === "FINISHED"
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  : game.status === "IN_PROGRESS"
                    ? <Clock3 className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    : <XCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />}
              </div>
              <p className="mt-3 font-medium text-white">{statusLabel(game.status)}</p>
              <p className="mt-1 text-sm text-slate-400">{resultLabel(game.result) ?? "Résultat non disponible"}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-amber-200"><Eye className="h-3.5 w-3.5" /> Voir la partie</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
