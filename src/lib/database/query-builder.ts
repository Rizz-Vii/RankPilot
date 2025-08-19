/**
 * Firestore Query Builder - Eliminates Query Duplication
 * Provides standardized, reusable query patterns across the application
 */

import type {
    DocumentSnapshot,
    Query} from 'firebase/firestore';
import {
    collection,
    limit,
    orderBy,
    query,
    startAfter,
    where
} from 'firebase/firestore';
import { db } from '../firebase/connection-manager';

export class FirestoreQueryBuilder {
    /**
     * Standard user documents query - used across multiple components
     * Eliminates duplication in dashboard-data.service.ts, team/page.tsx, etc.
     */
    static userDocuments(
        collectionName: string,
        userId: string,
        limitCount = 10,
        orderField = 'createdAt',
        orderDirection: 'asc' | 'desc' = 'desc'
    ): Query {
        return query(
            collection(db, collectionName),
            where("userId", "==", userId),
            orderBy(orderField, orderDirection),
            limit(limitCount)
        );
    }

    /**
     * Recent activities query - standardized pattern
     */
    static recentUserActivities(userId: string, limitCount = 50): Query {
        return query(
            collection(db, "users", userId, "activities"),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
    }

    /**
     * SEO Audits query - fixes missing collection access
     */
    static seoAudits(userId: string, limitCount = 10): Query {
        return query(
            collection(db, "seoAudits"),
            where("userId", "==", userId),
            where("status", "==", "completed"), // Only completed audits
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
    }

    /**
     * Link Analyses query - fixes missing collection access
     */
    static linkAnalyses(userId: string, limitCount = 6): Query {
        return query(
            collection(db, "linkAnalyses"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
    }

    /**
     * Domain Authority query - standardized
     */
    static domainAuthority(userId: string): Query {
        return query(
            collection(db, "domainAuthority"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc"),
            limit(10)
        );
    }

    /**
     * Backlinks query - standardized
     */
    static backlinks(userId: string): Query {
        return query(
            collection(db, "backlinks"),
            where("userId", "==", userId),
            orderBy("discoveredAt", "desc"),
            limit(10)
        );
    }

    /**
     * NeuroSEO Analyses query - standardized
     */
    static neuroSeoAnalyses(userId: string, limitCount = 10): Query {
        return query(
            collection(db, "neuroSeoAnalyses"),
            where("userId", "==", userId),
            where("status", "==", "completed"),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
    }

    /**
     * Team members query - for team management
     */
    static teamMembers(teamId: string): Query {
        return query(
            collection(db, "teams", teamId, "members"),
            orderBy("joinedAt", "desc")
        );
    }

    /**
     * User presence query
     */
    static userPresence(userId: string): Query {
        return query(
            collection(db, "presence"),
            where("userId", "==", userId),
            limit(1)
        );
    }

    /**
     * Paginated query builder
     */
    static paginated<T>(
        baseQuery: Query,
        pageSize: number,
        lastDoc?: DocumentSnapshot<T>
    ): Query {
        let paginatedQuery = query(baseQuery, limit(pageSize));

        if (lastDoc) {
            paginatedQuery = query(paginatedQuery, startAfter(lastDoc));
        }

        return paginatedQuery;
    }

    /**
     * Admin queries - for admin panel
     */
    static allUsers(limitCount = 50): Query {
        return query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
    }

    /**
     * Recent system activities - for monitoring
     */
    static systemActivities(limitCount = 100): Query {
        return query(
            collection(db, "systemLogs"),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
    }
}

/**
 * Common query filters as reusable functions
 */
export const QueryFilters = {
    activeOnly: () => where("status", "==", "active"),
    completedOnly: () => where("status", "==", "completed"),
    byUserId: (userId: string) => where("userId", "==", userId),
    byDateRange: (startDate: Date, endDate: Date) => [
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate)
    ],
    recent: (days = 7) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return where("createdAt", ">=", cutoff);
    }
};

/**
 * Common ordering patterns
 */
export const QueryOrdering = {
    byCreatedAt: (direction: 'asc' | 'desc' = 'desc') => orderBy("createdAt", direction),
    byUpdatedAt: (direction: 'asc' | 'desc' = 'desc') => orderBy("updatedAt", direction),
    byTimestamp: (direction: 'asc' | 'desc' = 'desc') => orderBy("timestamp", direction),
    byName: (direction: 'asc' | 'desc' = 'asc') => orderBy("name", direction)
};
