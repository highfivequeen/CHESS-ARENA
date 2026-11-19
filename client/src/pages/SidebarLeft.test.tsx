// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tab: "home",
  setTab: vi.fn(),
  profile: null as { id: string; role?: string } | null,
}));

vi.mock("../context/NavigationContext", () => ({
  useNavigation: () => ({ tab: mocks.tab, setTab: mocks.setTab }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ profile: mocks.profile }),
}));

import SidebarLeft from "./SidebarLeft";
import SidebarLeftCopy from "./SidebarLeft copy";

beforeEach(() => {
  mocks.tab = "home";
  mocks.profile = null;
  mocks.setTab.mockClear();
});

afterEach(cleanup);

describe("side navigation", () => {
  it("tracks the selected tab while preserving a manual collapse", () => {
    mocks.tab = "learn";
    const view = render(
      <SidebarLeft
        onNavigate={vi.fn()}
        onToggleSidebar={vi.fn()}
        sidebarCollapsed={false}
      />,
    );

    const trainingGroup = screen.getByRole("button", { name: "Entraînement" });
    expect(trainingGroup.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(trainingGroup);
    expect(trainingGroup.getAttribute("aria-expanded")).toBe("false");

    mocks.tab = "play";
    view.rerender(
      <SidebarLeft
        onNavigate={vi.fn()}
        onToggleSidebar={vi.fn()}
        sidebarCollapsed={false}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Jouer" })[0].getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the copied sidebar functional and follows tab changes", () => {
    const view = render(<SidebarLeftCopy onNavigate={vi.fn()} />);
    const playGroup = screen.getAllByRole("button", { name: "Jouer" })[0];

    fireEvent.click(playGroup);
    expect(playGroup.getAttribute("aria-expanded")).toBe("false");

    mocks.tab = "learn";
    view.rerender(<SidebarLeftCopy onNavigate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Entraînement" }).getAttribute("aria-expanded")).toBe("true");
  });
});
