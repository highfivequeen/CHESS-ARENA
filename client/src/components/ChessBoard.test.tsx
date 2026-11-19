// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChessAppearanceProvider } from "../context/ChessAppearanceContext";
import ChessBoard from "./ChessBoard";

afterEach(cleanup);

describe("ChessBoard", () => {
  it("renders 64 squares and reports the clicked board coordinate", () => {
    const onSquareClick = vi.fn();
    const { container } = render(
      <ChessAppearanceProvider>
        <ChessBoard
          fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          selectedSquare={null}
          legalTargets={[]}
          lastMove={null}
          onSquareClick={onSquareClick}
        />
      </ChessAppearanceProvider>,
    );
    const squares = container.querySelectorAll(".vc-chessboard__square");

    expect(squares).toHaveLength(64);
    fireEvent.click(squares[52]);
    expect(onSquareClick).toHaveBeenCalledWith("e2");
  });
});
