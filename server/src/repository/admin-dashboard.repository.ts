import { db } from "../prisma/db.ts";

export async function findAdminDashboardData() {
  const [
    users,
    activeUsers,
    onlineUsers,
    suspendedUsers,
    games,
    finishedGames,
    inProgressGames,
    waitingGames,
    ratedGames,
    draws,
    tournaments,
    inProgressTournaments,
    pendingReports,
    reportsUnderReview,
    recentGames,
    recentTournaments,
  ] = await Promise.all([
    db.orm.public.User.where({ deletedAt: null })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.User.where({ deletedAt: null, accountStatus: "ACTIVE" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.User.where({
      deletedAt: null,
      accountStatus: "ACTIVE",
      connectionStatus: "ONLINE",
    }).aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.User.where({ deletedAt: null, accountStatus: "SUSPENDED" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.where({ status: "FINISHED" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.where({ status: "IN_PROGRESS" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.where({ status: "WAITING" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.where({ isRated: true })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game.where({ status: "FINISHED", result: "DRAW" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Tournament.aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Tournament.where({ status: "IN_PROGRESS" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Report.where({ status: "PENDING" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Report.where({ status: "UNDER_REVIEW" })
      .aggregate((aggregate) => ({ total: aggregate.count() })),
    db.orm.public.Game
      .select("id", "type", "status", "result", "isRated", "createdAt", "endedAt")
      .orderBy((game) => game.createdAt.desc())
      .limit(8)
      .all(),
    db.orm.public.Tournament
      .select("id", "name", "status", "startsAt", "createdAt")
      .orderBy((tournament) => tournament.createdAt.desc())
      .limit(5)
      .all(),
  ]);

  return {
    stats: {
      users: {
        total: users.total,
        active: activeUsers.total,
        online: onlineUsers.total,
        suspended: suspendedUsers.total,
      },
      games: {
        total: games.total,
        finished: finishedGames.total,
        inProgress: inProgressGames.total,
        waiting: waitingGames.total,
        rated: ratedGames.total,
        draws: draws.total,
      },
      tournaments: {
        total: tournaments.total,
        inProgress: inProgressTournaments.total,
      },
      reports: {
        pending: pendingReports.total,
        underReview: reportsUnderReview.total,
      },
    },
    recentGames,
    recentTournaments,
  };
}
