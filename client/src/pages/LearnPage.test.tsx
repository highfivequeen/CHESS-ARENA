// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingRatingProgress } from "../api/trainingRatingApi";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  getProgress: vi.fn(),
  completeLesson: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("../api/trainingRatingApi", () => ({
  trainingRatingApi: {
    getProgress: mocks.getProgress,
    completeLesson: mocks.completeLesson,
  },
}));

import LearnPage from "./LearnPage";

const progress: TrainingRatingProgress = {
  rating: 500,
  lessonsCompleted: 4,
  completedLessons: ["pawn"],
  specialCoursesUnlocked: false,
  specialCoursesUnlockRating: 800,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LearnPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.user = null;
  mocks.getProgress.mockReset();
  mocks.completeLesson.mockReset();
});

afterEach(cleanup);

describe("LearnPage training progress", () => {
  it("does not request account progress for a guest", () => {
    renderPage();

    expect(screen.getAllByText("CONNEXION REQUISE").length).toBeGreaterThan(0);
    expect(mocks.getProgress).not.toHaveBeenCalled();
  });

  it("does not show one user's progress after switching accounts", async () => {
    let resolveFirst!: (value: TrainingRatingProgress) => void;
    mocks.user = { id: "player-1" };
    mocks.getProgress
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockImplementationOnce(() => new Promise(() => {}));

    const view = renderPage();
    expect(screen.getAllByText("CHARGEMENT DU CLASSEMENT").length).toBeGreaterThan(0);

    await act(async () => resolveFirst(progress));
    expect(screen.getByText("3 LEÇONS · 300 ELO")).toBeTruthy();

    mocks.user = { id: "player-2" };
    view.rerender(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("CHARGEMENT DU CLASSEMENT").length).toBeGreaterThan(0);
    expect(screen.queryByText("3 LEÇONS · 300 ELO")).toBeNull();
    expect(mocks.getProgress).toHaveBeenCalledTimes(2);
  });
});
