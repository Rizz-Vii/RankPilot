export class EnhancedAuthService {
  static async updateLoginTracking(_uid: string): Promise<void> {
    /* no-op in CT */
  }
  static async getUserAnalytics() {
    return {
      totalUsers: 0,
      usersByTier: {},
      usersByRole: {},
      recentLogins: 0,
      subscriptionTrends: [],
    };
  }
  static async getUserActivity() {
    return {
      loginFrequency: 0,
      lastLoginDays: 0,
      subscriptionAge: 0,
      activityScore: 0,
    };
  }
}
