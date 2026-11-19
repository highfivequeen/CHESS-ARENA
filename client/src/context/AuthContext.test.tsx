// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import authSlice, { authActions } from "../features/authSlice";
import type { User } from "../types/User";

const mocks = vi.hoisted(() => ({ me: vi.fn() }));

vi.mock("../api/authApi", () => ({
  authApi: {
    me: mocks.me,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      counter: (state = 0) => state,
    },
  });
}

function AuthState() {
  const { loading, user } = useAuth();
  return <p>{loading ? "Chargement" : user?.username ?? "Anonyme"}</p>;
}

function renderAuthProvider(store: ReturnType<typeof createTestStore>) {
  return render(
    <Provider store={store}>
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    </Provider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("hydrates a saved access token without synchronously changing loading state", async () => {
    const store = createTestStore();
    store.dispatch(authActions.updateAccessToken("access-token"));
    let resolveProfile!: (response: { data: { user: User } }) => void;
    mocks.me.mockImplementation(() => new Promise((resolve) => {
      resolveProfile = resolve;
    }));

    renderAuthProvider(store);

    expect(screen.getByText("Chargement")).toBeTruthy();
    expect(mocks.me).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveProfile({
        data: {
          user: {
            id: "player-1",
            username: "Joueur",
            email: "joueur@example.test",
          },
        },
      });
    });

    expect(screen.getByText("Joueur")).toBeTruthy();
  });

  it("does not load a profile when there is no access token", () => {
    const store = createTestStore();

    renderAuthProvider(store);

    expect(screen.getByText("Anonyme")).toBeTruthy();
    expect(mocks.me).not.toHaveBeenCalled();
  });
});
