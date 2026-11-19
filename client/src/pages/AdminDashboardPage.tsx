import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AxiosError } from "axios";
import {
  Activity,
  Clock3,
  RefreshCw,
  Shield,
  ShieldAlert,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import axiosInstance from "../axios";

type ReportStatus = "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
type Report = {
  id: number;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reporterId: number;
  reportedUserId: number | null;
  gameId: number | null;
  messageId: number | null;
  createdAt: string;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: "USER" | "ORGANIZER" | "ADMIN";
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  connectionStatus: "ONLINE" | "OFFLINE";
  lastLoginAt: string | null;
  createdAt: string;
};

type UserListResponse = {
  success: boolean;
  data: AdminUser[];
  nextCursor: number | null;
};

type AdminOverview = {
  stats: {
    users: { total: number; active: number; online: number; suspended: number };
    games: {
      total: number;
      finished: number;
      inProgress: number;
      waiting: number;
      rated: number;
      draws: number;
    };
    tournaments: { total: number; inProgress: number };
    reports: { pending: number; underReview: number };
  };
  recentGames: Array<{
    id: number;
    type: "LOCAL" | "ONLINE" | "AI" | "CHALLENGE" | "TOURNAMENT";
    status: "WAITING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
    result: "WHITE_WIN" | "BLACK_WIN" | "DRAW" | null;
    isRated: boolean;
    createdAt: string;
    endedAt: string | null;
  }>;
  recentTournaments: Array<{
    id: number;
    name: string;
    status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
    startsAt: string;
    createdAt: string;
  }>;
};

function apiMessage(error: unknown) {
  return (error as AxiosError<{ message?: string }>).response?.data?.message
    ?? (error instanceof Error ? error.message : "La requête a échoué.");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function roleLabel(role: AdminUser["role"]) {
  if (role === "ADMIN") return "Administrateur";
  if (role === "ORGANIZER") return "Organisateur";
  return "Joueur";
}

function gameTypeLabel(type: AdminOverview["recentGames"][number]["type"]) {
  const labels = {
    LOCAL: "Locale",
    ONLINE: "En ligne",
    AI: "Contre l’ordinateur",
    CHALLENGE: "Défi",
    TOURNAMENT: "Tournoi",
  };
  return labels[type];
}

function gameStatusLabel(status: AdminOverview["recentGames"][number]["status"]) {
  const labels = {
    WAITING: "En attente",
    IN_PROGRESS: "En cours",
    FINISHED: "Terminée",
    CANCELLED: "Annulée",
  };
  return labels[status];
}

function gameResultLabel(result: AdminOverview["recentGames"][number]["result"]) {
  if (result === "WHITE_WIN") return "Blancs gagnent";
  if (result === "BLACK_WIN") return "Noirs gagnent";
  if (result === "DRAW") return "Nulle";
  return "—";
}

function tournamentStatusLabel(status: AdminOverview["recentTournaments"][number]["status"]) {
  const labels = {
    DRAFT: "Brouillon",
    REGISTRATION_OPEN: "Inscriptions ouvertes",
    REGISTRATION_CLOSED: "Inscriptions fermées",
    IN_PROGRESS: "En cours",
    FINISHED: "Terminé",
    CANCELLED: "Annulé",
  };
  return labels[status];
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: number | undefined;
  detail: string;
  loading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-sky-300" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">
        {loading ? "…" : (value ?? 0).toLocaleString("fr-FR")}
      </p>
      <p className="mt-1 text-xs text-slate-500">{loading ? "Chargement…" : detail}</p>
    </article>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [activeUserSearch, setActiveUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ORGANIZER">("ORGANIZER");
  const [creatingUser, setCreatingUser] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const { data } = await axiosInstance.get<AdminOverview>("/users/admin/overview");
      setOverview(data);
      setOverviewError("");
    } catch (requestError) {
      setOverviewError(apiMessage(requestError));
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadUsers = useCallback(async (
    search: string,
    cursor?: number,
    append = false,
  ) => {
    setLoadingUsers(true);
    try {
      const { data } = await axiosInstance.get<UserListResponse>("/users", {
        params: {
          limit: 20,
          ...(search ? { search } : {}),
          ...(cursor !== undefined ? { cursor } : {}),
        },
      });
      setUsers((current) => append ? [...current, ...data.data] : data.data);
      setNextCursor(data.nextCursor);
      setActiveUserSearch(search);
      setUsersError("");
    } catch (requestError) {
      setUsersError(apiMessage(requestError));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const [pending, underReview] = await Promise.all([
        axiosInstance.get<Report[]>("/reports", { params: { status: "PENDING", limit: 100 } }),
        axiosInstance.get<Report[]>("/reports", { params: { status: "UNDER_REVIEW", limit: 100 } }),
      ]);
      setReports([...pending.data, ...underReview.data]
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)));
      setReportsError("");
    } catch (requestError) {
      setReportsError(apiMessage(requestError));
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadOverview();
      void loadUsers("");
      void loadReports();
    });
  }, [loadOverview, loadReports, loadUsers]);

  const refreshDashboard = () => {
    void loadOverview();
    void loadUsers(activeUserSearch);
    void loadReports();
  };

  const review = async (reportId: number, status: Exclude<ReportStatus, "PENDING">) => {
    setActionError("");
    setNotice("");
    try {
      await axiosInstance.patch(`/reports/${reportId}`, { status });
      setNotice("Le signalement a été mis à jour.");
      await Promise.all([loadReports(), loadOverview()]);
    } catch (requestError) {
      setActionError(apiMessage(requestError));
    }
  };

  const createPrivilegedUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingUser(true);
    setActionError("");
    setNotice("");
    try {
      await axiosInstance.post("/auth/admin/users", { username, email, password, role });
      setNotice(`Le compte ${username} a été créé avec le rôle ${role === "ADMIN" ? "administrateur" : "organisateur"}.`);
      setUsername("");
      setEmail("");
      setPassword("");
      await Promise.all([loadOverview(), loadUsers(activeUserSearch)]);
    } catch (requestError) {
      setActionError(apiMessage(requestError));
    } finally {
      setCreatingUser(false);
    }
  };

  const submitUserSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = userSearch.trim();
    if (search.length === 1) {
      setUsersError("Saisissez au moins deux caractères pour rechercher un pseudo.");
      return;
    }
    void loadUsers(search);
  };

  const stats = overview?.stats;
  const openReports = (stats?.reports.pending ?? 0) + (stats?.reports.underReview ?? 0);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">ESPACE ADMINISTRATEUR</p>
          <h1 className="text-2xl font-semibold text-white">Administration</h1>
          <p className="mt-1 text-sm text-slate-400">Suivi des joueurs, des parties, des tournois et de la modération.</p>
        </div>
        <button
          type="button"
          onClick={refreshDashboard}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Actualiser
        </button>
      </header>

      {actionError && <p role="alert" className="rounded-lg bg-rose-950/70 p-3 text-sm text-rose-200">{actionError}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-950/60 p-3 text-sm text-emerald-200">{notice}</p>}
      {overviewError && <p role="alert" className="rounded-lg bg-rose-950/70 p-3 text-sm text-rose-200">Statistiques indisponibles : {overviewError}</p>}

      <section aria-label="Indicateurs clés" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard icon={<Users size={18} />} label="Comptes" value={stats?.users.total} detail={`${stats?.users.active ?? 0} actifs`} loading={loadingOverview} />
        <MetricCard icon={<Activity size={18} />} label="Joueurs en ligne" value={stats?.users.online} detail={`${stats?.users.suspended ?? 0} comptes suspendus`} loading={loadingOverview} />
        <MetricCard icon={<Swords size={18} />} label="Parties terminées" value={stats?.games.finished} detail={`${stats?.games.total ?? 0} parties au total`} loading={loadingOverview} />
        <MetricCard icon={<Clock3 size={18} />} label="Parties en cours" value={stats?.games.inProgress} detail={`${stats?.games.waiting ?? 0} en attente`} loading={loadingOverview} />
        <MetricCard icon={<Trophy size={18} />} label="Tournois en cours" value={stats?.tournaments.inProgress} detail={`${stats?.tournaments.total ?? 0} tournois au total`} loading={loadingOverview} />
        <MetricCard icon={<ShieldAlert size={18} />} label="Signalements ouverts" value={openReports} detail={`${stats?.reports.pending ?? 0} à traiter · ${stats?.reports.underReview ?? 0} en revue`} loading={loadingOverview} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Parties récentes</h2>
              <p className="mt-1 text-xs text-slate-400">
                {stats?.games.rated.toLocaleString("fr-FR") ?? "—"} parties classées · {stats?.games.draws.toLocaleString("fr-FR") ?? "—"} nulles
              </p>
            </div>
            <Swords size={18} className="text-sky-300" aria-hidden="true" />
          </div>
          {loadingOverview ? (
            <p role="status" className="p-5 text-sm text-slate-400">Chargement des statistiques…</p>
          ) : !overview?.recentGames.length ? (
            <p className="p-5 text-sm text-slate-400">Aucune partie enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Partie</th>
                    <th scope="col" className="px-3 py-3 font-medium">Statut</th>
                    <th scope="col" className="px-3 py-3 font-medium">Résultat</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Créée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {overview.recentGames.map((game) => (
                    <tr key={game.id}>
                      <td className="px-5 py-3">
                        <span className="block font-medium text-white">#{game.id} · {gameTypeLabel(game.type)}</span>
                        <span className="text-xs text-slate-500">{game.isRated ? "Classée" : "Amicale"}</span>
                      </td>
                      <td className="px-3 py-3">{gameStatusLabel(game.status)}</td>
                      <td className="px-3 py-3">{gameResultLabel(game.result)}</td>
                      <td className="px-5 py-3 text-right text-xs text-slate-400">{formatDate(game.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Tournois récents</h2>
              <p className="mt-1 text-xs text-slate-400">État et date de démarrage prévue</p>
            </div>
            <Trophy size={18} className="text-amber-200" aria-hidden="true" />
          </div>
          {loadingOverview ? (
            <p role="status" className="p-5 text-sm text-slate-400">Chargement des tournois…</p>
          ) : !overview?.recentTournaments.length ? (
            <p className="p-5 text-sm text-slate-400">Aucun tournoi enregistré.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {overview.recentTournaments.map((tournament) => (
                <li key={tournament.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-white">{tournament.name}</p>
                    <p className="mt-1 text-xs text-slate-400">Créé le {formatDate(tournament.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">{tournamentStatusLabel(tournament.status)}</p>
                    <p className="mt-1 text-xs text-slate-500">Début : {formatDate(tournament.startsAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <h2 className="font-semibold text-white">Utilisateurs</h2>
            <p className="mt-1 text-xs text-slate-400">Comptes inscrits, rôle, statut et dernière connexion</p>
          </div>
          <form onSubmit={submitUserSearch} className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="admin-user-search" className="sr-only">Rechercher un pseudo</label>
            <input
              id="admin-user-search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              maxLength={80}
              placeholder="Rechercher un pseudo"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 sm:w-56"
            />
            <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Rechercher
            </button>
          </form>
        </div>
        {usersError && <p role="alert" className="border-b border-slate-800 px-5 py-3 text-sm text-rose-200">{usersError}</p>}
        {loadingUsers && users.length === 0 ? (
          <p role="status" className="p-5 text-sm text-slate-400">Chargement des utilisateurs…</p>
        ) : !users.length ? (
          <p className="p-5 text-sm text-slate-400">Aucun utilisateur trouvé.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Compte</th>
                    <th scope="col" className="px-3 py-3 font-medium">Rôle</th>
                    <th scope="col" className="px-3 py-3 font-medium">Statut</th>
                    <th scope="col" className="px-3 py-3 font-medium">Présence</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Dernière connexion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-3">
                        <span className="block font-medium text-white">{user.username}</span>
                        <span className="text-xs text-slate-400">{user.email}</span>
                      </td>
                      <td className="px-3 py-3">{roleLabel(user.role)}</td>
                      <td className="px-3 py-3">
                        <span className={user.accountStatus === "ACTIVE" ? "text-emerald-300" : user.accountStatus === "SUSPENDED" ? "text-rose-300" : "text-slate-400"}>
                          {user.accountStatus === "ACTIVE" ? "Actif" : user.accountStatus === "SUSPENDED" ? "Suspendu" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={user.connectionStatus === "ONLINE" ? "text-emerald-300" : "text-slate-500"}>
                          {user.connectionStatus === "ONLINE" ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-400">{formatDate(user.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
              <p className="text-xs text-slate-500">{users.length} compte{users.length > 1 ? "s" : ""} affiché{users.length > 1 ? "s" : ""}</p>
              {nextCursor !== null && (
                <button
                  type="button"
                  disabled={loadingUsers}
                  onClick={() => void loadUsers(activeUserSearch, nextCursor, true)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingUsers ? "Chargement…" : "Charger plus"}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-white"><Shield size={18} className="text-amber-200" /> Signalements à traiter</h2>
            <p className="mt-1 text-xs text-slate-400">Les signalements ouverts nécessitent une action de modération.</p>
          </div>
          <button type="button" onClick={() => void loadReports()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Actualiser</button>
        </div>
        {reportsError && <p role="alert" className="rounded-lg bg-rose-950/70 p-3 text-sm text-rose-200">{reportsError}</p>}
        {loadingReports ? <p role="status" className="text-sm text-slate-400">Chargement des signalements…</p> : reports.length === 0 && !reportsError ? (
          <p className="text-sm text-slate-400">Aucun signalement en attente.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-xl bg-slate-800/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Signalement #{report.id} · {report.reason.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-slate-400">Auteur : {report.reporterId} · Compte visé : {report.reportedUserId ?? "—"} · Partie : {report.gameId ?? "—"} · Message : {report.messageId ?? "—"}</p>
                    {report.description && <p className="mt-2 text-sm text-slate-300">{report.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void review(report.id, "UNDER_REVIEW")} className="rounded-lg border border-sky-800 px-3 py-2 text-xs text-sky-200 hover:bg-sky-950/60">Prendre en charge</button>
                    <button type="button" onClick={() => void review(report.id, "RESOLVED")} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs text-white hover:bg-emerald-700">Résoudre</button>
                    <button type="button" onClick={() => void review(report.id, "REJECTED")} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">Rejeter</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(event) => void createPrivilegedUser(event)} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white"><UserPlus size={18} className="text-sky-300" /> Créer un compte privilégié</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-300">Pseudo
            <input required minLength={3} maxLength={30} value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <label className="space-y-1 text-sm text-slate-300">E-mail
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <label className="space-y-1 text-sm text-slate-300">Mot de passe
            <input required type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </label>
          <label className="space-y-1 text-sm text-slate-300">Rôle
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="ORGANIZER">Organisateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </label>
        </div>
        <button disabled={creatingUser} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50">
          {creatingUser ? "Création…" : "Créer le compte"}
        </button>
      </form>
    </section>
  );
}
