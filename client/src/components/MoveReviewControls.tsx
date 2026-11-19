import {
  LoaderCircle,
  Microscope,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from "lucide-react";

type MoveReviewControlsProps = {
  currentPly: number;
  moveCount: number;
  onSelectPly: (ply: number) => void;
  onAnalyze?: () => void;
  analysisDisabled?: boolean;
  analysisBusy?: boolean;
  analysisLabel?: string;
};

export default function MoveReviewControls({
  currentPly,
  moveCount,
  onSelectPly,
  onAnalyze,
  analysisDisabled = false,
  analysisBusy = false,
  analysisLabel = "Analyser la partie",
}: MoveReviewControlsProps) {
  const reviewing = currentPly < moveCount;

  return (
    <div className="vc-move-review">
      <div className="vc-move-review__buttons" role="group" aria-label="Navigation et analyse des coups">
        {onAnalyze && (
          <button
            type="button"
            className="is-analysis"
            onClick={onAnalyze}
            disabled={analysisDisabled || analysisBusy}
            aria-label={analysisLabel}
            title={analysisLabel}
          >
            {analysisBusy
              ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              : <Microscope size={16} aria-hidden="true" />}
          </button>
        )}
        <button type="button" onClick={() => onSelectPly(0)} disabled={currentPly === 0} aria-label="Revenir au début" title="Début">
          <SkipBack size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onSelectPly(Math.max(0, currentPly - 1))} disabled={currentPly === 0} aria-label="Voir le coup précédent" title="Coup précédent">
          <StepBack size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onSelectPly(Math.min(moveCount, currentPly + 1))} disabled={currentPly === moveCount} aria-label="Voir le coup suivant" title="Coup suivant">
          <StepForward size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onSelectPly(moveCount)} disabled={!reviewing} aria-label="Revenir à la position actuelle" title="Position actuelle">
          <SkipForward size={16} aria-hidden="true" />
        </button>
      </div>
      <span aria-live="polite">
        {reviewing ? `Relecture · ${currentPly}/${moveCount}` : `Position actuelle · ${moveCount} coups`}
      </span>
    </div>
  );
}
