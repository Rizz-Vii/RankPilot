export interface UserProfile {
    displayName?: string;
    professionalTitle?: string;
    bio?: string;
    primaryKeywords?: string;
    specializations?: string;
    website?: string;
    linkedIn?: string;
    twitter?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    timezone?: string;
    notifications?: {
        emailNotifications?: boolean;
        seoAlerts?: boolean;
        weeklyReports?: boolean;
        marketingEmails?: boolean;
        securityAlerts?: boolean;
        auditCompletions?: boolean;
        keywordRankings?: boolean;
    };
    privacy?: {
        profileVisibility?: boolean;
        dataCollection?: boolean;
        activityTracking?: boolean;
    };
    subscriptionStatus?: string;
    stripeCustomerId?: string;
    nextBillingDate?: { seconds?: number; toDate?: () => Date } | Date | number;
}

export function asUserProfile(p: unknown): UserProfile | undefined {
    if (p && typeof p === 'object') return p as UserProfile;
    return undefined;
}
