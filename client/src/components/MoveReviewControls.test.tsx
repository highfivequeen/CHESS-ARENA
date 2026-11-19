// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MoveReviewControls from "./MoveReviewControls";

afterEach(cleanup);

describe("MoveReviewControls", () => {
  it("uses compact navigation icons to select a move", () => {
    const onSelectPly = vi.fn();
    render(
      <MoveReviewControls
        currentPly={2}
        moveCount={4}
        onSelectPly={onSelectPly}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Revenir au début" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir le coup précédent" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir le coup suivant" }));
    fireEvent.click(screen.getByRole("button", { name: "Revenir à la position actuelle" }));

    expect(onSelectPly.mock.calls).toEqual([[0], [1], [3], [4]]);
  });

  it("starts Stockfish analysis and disables the icon while analysis is pending", () => {
    const onAnalyze = vi.fn();
    const { rerender } = render(
      <MoveReviewControls
        currentPly={1}
        moveCount={1}
        onSelectPly={vi.fn()}
        onAnalyze={onAnalyze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Analyser la partie" }));
    expect(onAnalyze).toHaveBeenCalledOnce();

    rerender(
      <MoveReviewControls
        currentPly={1}
        moveCount={1}
        onSelectPly={vi.fn()}
        onAnalyze={onAnalyze}
        analysisBusy
      />,
    );

    expect(screen.getByRole("button", { name: "Analyser la partie" }).hasAttribute("disabled")).toBe(true);
  });
});
