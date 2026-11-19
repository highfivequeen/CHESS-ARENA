// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToast } from "./use-toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useToast", () => {
  it("publishes a toast, dismisses it, then removes it", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Partie sauvegardée" });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe("Partie sauvegardée");

    const toastId = result.current.toasts[0].id;
    act(() => result.current.dismiss(toastId));
    expect(result.current.toasts[0].open).toBe(false);

    act(() => vi.advanceTimersByTime(5300));
    expect(result.current.toasts).toHaveLength(0);
  });
});
