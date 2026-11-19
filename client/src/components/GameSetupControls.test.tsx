// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GameSetupControls from "./GameSetupControls";

afterEach(cleanup);

describe("GameSetupControls", () => {
  it("reports selected time controls and disables unavailable rated play", () => {
    const onTimeControlChange = vi.fn();
    render(
      <GameSetupControls
        initialTimeSeconds={300}
        incrementSeconds={0}
        onTimeControlChange={onTimeControlChange}
        rated={false}
        onRatedChange={vi.fn()}
        ratedAvailable={false}
        ratedUnavailableReason="Une cadence classée n’est pas disponible."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "10 + 0" }));

    expect(onTimeControlChange).toHaveBeenCalledWith(600, 0);
    expect(screen.getByRole("button", { name: "Classé" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Une cadence classée n’est pas disponible.")).toBeTruthy();
  });
});
