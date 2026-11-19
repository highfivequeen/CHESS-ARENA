import { findAdminDashboardData } from "../repository/admin-dashboard.repository";
import { rethrowServiceError } from "./errorService";

export class AdminDashboardService {
  static async getOverview() {
    try {
      return await findAdminDashboardData();
    } catch (error) {
      rethrowServiceError(error, "Erreur lors du chargement du tableau de bord administrateur :");
    }
  }
}
