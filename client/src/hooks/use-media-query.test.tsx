// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./use-media-query";

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useMediaQuery", () => {
  it("returns the current match and subscribes to changes", () => {
    let matches = false;
    const target = new EventTarget();
    Object.defineProperties(target, {
      matches: { get: () => matches },
      media: { value: "(min-width: 768px)" },
      onchange: { value: null, writable: true },
      addListener: {
        value: (listener: EventListener) => target.addEventListener("change", listener),
      },
      removeListener: {
        value: (listener: EventListener) => target.removeEventListener("change", listener),
      },
    });
    const mediaQuery = target as unknown as MediaQueryList;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      target.dispatchEvent(new Event("change"));
    });

    expect(result.current).toBe(true);
  });
});
