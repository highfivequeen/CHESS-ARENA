// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertProvider, useAlert } from "./use-alert";

function AlertTrigger({ onConfirm }: { onConfirm: () => void }) {
  const { alert } = useAlert();
  return (
    <button
      type="button"
      onClick={() => alert({
        title: "Confirmer la sortie",
        confirmText: "Confirmer",
        onConfirm,
      })}
    >
      Ouvrir
    </button>
  );
}

afterEach(cleanup);

describe("useAlert", () => {
  it("opens an alert and runs its confirmation action", async () => {
    const onConfirm = vi.fn();
    render(
      <AlertProvider>
        <AlertTrigger onConfirm={onConfirm} />
      </AlertProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Confirmer la sortie")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
