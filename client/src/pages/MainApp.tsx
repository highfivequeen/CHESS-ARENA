import { lazy, Suspense, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import HeaderPage from "./Header";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";
import HomePage from "./HomePage";
import { useAuth } from "../context/AuthContext";

const PlayPage = lazy(() => import("./PlayPage"));
const ComputerGamePage = lazy(() => import("./ComputerGamePage"));
const GamesPage = lazy(() => import("./GamesPage"));
const TournamentsPage = lazy(() => import("./TournamentsPage"));
const UsersPage = lazy(() => import("./UsersPage"));
const MessagesPage = lazy(() => import("./MessagesPage"));
const NotificationsPage = lazy(() => import("./NotificationsPage"));
const LearnPage = lazy(() => import("./LearnPage"));
const StrategyPage = lazy(() => import("./StrategyPage"));
const WatchPage = lazy(() => import("./WatchPage"));
const ProblemsPage = lazy(() => import("./ProblemsPage"));
const RankingsPage = lazy(() => import("./RankingsPage"));
const BoardEditorPage = lazy(() => import("./BoardEditorPage"));
const RulesPage = lazy(() => import("./RulesPage"));
const AchievementsPage = lazy(() => import("./AchievementsPage"));
const OrganizerDashboardPage = lazy(() => import("./OrganizerDashboardPage"));
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));

export default function MainApp() {
  const { tab, setTab, notifications } = useNavigation();
  const { profile } = useAuth();
  const [messageFriend, setMessageFriend] = useState<{ id: number; username: string } | null>(null);
  const [quickGameSettings, setQuickGameSettings] = useState({
    initialTimeSeconds: 600,
    incrementSeconds: 0,
  });
  const [autoStartGame, setAutoStartGame] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const closeSidebarOnMobile = () => {
    if (window.matchMedia("(max-width: 1100px)").matches) {
      setSidebarCollapsed(false);
    }
  };
  return (
    <div className={`vc-app${sidebarCollapsed ? " vc-app--sidebar-collapsed" : ""}`}>
      <HeaderPage />
      {!sidebarCollapsed && (
        <button
          type="button"
          className="vc-sidebar-open-btn"
          aria-label="Afficher la barre latérale"
          aria-controls="vc-sidebar-left"
          onClick={() => setSidebarCollapsed(true)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}
      {sidebarCollapsed && (
        <button
          type="button"
          className="vc-sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setSidebarCollapsed(false)}
        />
      )}
      <div className="vc-layout">
        <SidebarLeft
          onNavigate={closeSidebarOnMobile}
          onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="vc-main">
          <Suspense
            fallback={(
              <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-400" role="status">
                Chargement de la page…
              </div>
            )}
          >
          {tab === "home" && (
            <HomePage
              onStartGame={(initialTimeSeconds, incrementSeconds) => {
                setQuickGameSettings({ initialTimeSeconds, incrementSeconds });
                setAutoStartGame(true);
                setTab("play");
              }}
            />
          )}
          {tab === "profile" && <ProfilePage />}
          {tab === "play" && (
            <PlayPage
              onNavigate={(t) => setTab(t as typeof tab)}
              initialTimeSeconds={quickGameSettings.initialTimeSeconds}
              incrementSeconds={quickGameSettings.incrementSeconds}
              autoStartGame={autoStartGame}
              onAutoStartHandled={() => setAutoStartGame(false)}
            />
          )}
          {tab === "computer" && <ComputerGamePage onExit={() => setTab("home")} />}
          {tab === "games" && <GamesPage onNavigate={(t) => setTab(t as typeof tab)} />}
          {tab === "tournaments" && <TournamentsPage />}
          {tab === "users" && (
            <UsersPage onOpenMessages={(friend) => {
              setMessageFriend(friend);
              setTab("messages");
            }} />
          )}
          {tab === "friends" && (
            <UsersPage onOpenMessages={(friend) => {
              setMessageFriend(friend);
              setTab("messages");
            }} />
          )}
          {tab === "messages" && (
            <MessagesPage
              initialFriend={messageFriend}
              onInitialFriendHandled={() => setMessageFriend(null)}
            />
          )}
          {tab === "notifications" && <NotificationsPage notifications={notifications} />}
          {tab === "learn" && <LearnPage />}
          {tab === "strategy" && <StrategyPage />}
          {tab === "watch" && <WatchPage />}
          {tab === "problems" && <ProblemsPage />}
          {tab === "rankings" && <RankingsPage />}
          {tab === "board-editor" && <BoardEditorPage />}
          {tab === "rules" && <RulesPage />}
          {tab === "achievements" && profile && <AchievementsPage />}
          {tab === "organizer" && (profile?.role === "ORGANIZER" || profile?.role === "ADMIN") && (
            <OrganizerDashboardPage onOpenTournaments={() => setTab("tournaments")} />
          )}
          {tab === "admin" && profile?.role === "ADMIN" && <AdminDashboardPage />}
          </Suspense>
        </main>

        {tab === "home" && <SidebarRight />}
      </div>
    </div>
  );
}
