/**
 * Custom Dashboard Builder System
 * Implements Priority 2 Enterprise Features from DevReady Phase 3
 * 
 * Features:
 * - Drag-and-drop dashboard creation for enterprise users
 * - Advanced visualizations with D3.js integration
 * - Real-time data binding and updates
 * - Customizable widgets and layouts
 * - Export capabilities for branded reports
 * - Collaborative dashboard sharing
 */

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'text' | 'iframe' | 'map';
    title: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    dataSource: {
        type: 'neuroseo' | 'analytics' | 'keywords' | 'performance' | 'custom';
        query: string;
        filters?: Record<string, unknown>;
        refreshInterval?: number; // seconds
    };
    visualization: {
        chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap';
        colorScheme?: string;
        showLegend?: boolean;
        showGrid?: boolean;
        customConfig?: Record<string, unknown>;
    };
    styling: {
        backgroundColor?: string;
        borderColor?: string;
        borderRadius?: number;
        padding?: number;
        fontSize?: number;
        fontFamily?: string;
    };
    permissions: {
        viewRoles: string[];
        editRoles: string[];
        exportAccess: boolean;
    };
}

export interface DashboardLayout {
    id: string;
    name: string;
    description: string;
    userId: string;
    userTier: string;
    widgets: DashboardWidget[];
    layout: {
        columns: number;
        rows: number;
        gap: number;
        responsive: boolean;
    };
    theme: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        accent: string;
    };
    metadata: {
        created: number;
        updated: number;
        version: string;
        isPublic: boolean;
        tags: string[];
        category: string;
    };
    sharing: {
        isShared: boolean;
        shareId?: string;
        allowComments: boolean;
        collaborators: Array<{
            userId: string;
            role: 'viewer' | 'editor' | 'admin';
            addedAt: number;
        }>;
    };
}

export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    category: 'seo' | 'analytics' | 'performance' | 'competitive' | 'executive';
    preview: string; // Base64 screenshot
    layout: Omit<DashboardLayout, 'id' | 'userId' | 'userTier' | 'metadata'>;
    requiredTier: string;
    estimatedSetupTime: string;
}

/**
 * Custom Dashboard Builder Engine
 * Provides drag-and-drop dashboard creation with enterprise features
 */
export class CustomDashboardBuilder {
    private dashboards: Map<string, DashboardLayout> = new Map();
    private templates: Map<string, DashboardTemplate> = new Map();
    // Data providers expose a uniform query interface; results are heterogeneous (kept as unknown)
    private dataProviders: Map<string, { query: (queryType: string, filters?: Record<string, unknown>) => Promise<unknown> | unknown }> = new Map();
    private realTimeSubscriptions: Map<string, NodeJS.Timeout> = new Map();
    // Simple in-memory cache TTL (ms) for Firestore template reloads
    private lastTemplateSync = 0;
    private static TEMPLATE_SYNC_TTL = 10 * 60 * 1000; // 10 minutes

    // Pre-built widget templates for quick setup
    private widgetTemplates: Record<string, Partial<DashboardWidget>> = {
        'seo-overview': {
            type: 'metric',
            title: 'SEO Overview',
            dataSource: { type: 'neuroseo', query: 'overview-metrics' },
            visualization: { chartType: 'bar', colorScheme: 'blue' }
        },
        'keyword-rankings': {
            type: 'chart',
            title: 'Keyword Rankings',
            dataSource: { type: 'keywords', query: 'ranking-trends' },
            visualization: { chartType: 'line', showLegend: true, showGrid: true }
        },
        'performance-vitals': {
            type: 'chart',
            title: 'Core Web Vitals',
            dataSource: { type: 'performance', query: 'vitals-history' },
            visualization: { chartType: 'area', colorScheme: 'green' }
        },
        'competitor-analysis': {
            type: 'table',
            title: 'Competitor Analysis',
            dataSource: { type: 'neuroseo', query: 'competitor-metrics' }
        },
        'traffic-sources': {
            type: 'chart',
            title: 'Traffic Sources',
            dataSource: { type: 'analytics', query: 'traffic-breakdown' },
            visualization: { chartType: 'pie', showLegend: true }
        }
    };

    constructor() {
        this.initializeTemplates();
        this.setupDataProviders();
        // Fire-and-forget async template sync with Firestore (silent degrade)
        void this.syncTemplatesFromFirestore();
        // Also attempt persisting any missing templates upstream (do not await)
        void this.persistLocalTemplates();
    }

    /**
     * Create a new custom dashboard
     */
    async createDashboard(
        name: string,
        userId: string,
        userTier: string,
        templateId?: string
    ): Promise<DashboardLayout> {
        const dashboardId = this.generateDashboardId();

        let dashboard: DashboardLayout;

        if (templateId) {
            const template = this.templates.get(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Check tier access
            if (!this.validateTierAccess(userTier, template.requiredTier)) {
                throw new Error('Insufficient tier access for this template');
            }

            dashboard = {
                ...template.layout,
                id: dashboardId,
                name,
                userId,
                userTier,
                metadata: {
                    created: Date.now(),
                    updated: Date.now(),
                    version: '1.0.0',
                    isPublic: false,
                    tags: [],
                    category: template.category
                }
            };
        } else {
            // Create blank dashboard
            dashboard = {
                id: dashboardId,
                name,
                description: '',
                userId,
                userTier,
                widgets: [],
                layout: {
                    columns: 12,
                    rows: 8,
                    gap: 16,
                    responsive: true
                },
                theme: this.getDefaultTheme(),
                metadata: {
                    created: Date.now(),
                    updated: Date.now(),
                    version: '1.0.0',
                    isPublic: false,
                    tags: [],
                    category: 'custom'
                },
                sharing: {
                    isShared: false,
                    allowComments: false,
                    collaborators: []
                }
            };
        }

        this.dashboards.set(dashboardId, dashboard);
        return dashboard;
    }

    /**
     * Add widget to dashboard with drag-and-drop positioning
     */
    async addWidget(
        dashboardId: string,
        widgetConfig: Partial<DashboardWidget>,
        position: { x: number; y: number; width: number; height: number; }
    ): Promise<DashboardWidget> {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }

        const widgetId = this.generateWidgetId();
        const widget: DashboardWidget = {
            id: widgetId,
            type: widgetConfig.type || 'metric',
            title: widgetConfig.title || 'New Widget',
            position,
            dataSource: widgetConfig.dataSource || {
                type: 'custom',
                query: 'placeholder'
            },
            visualization: {
                chartType: 'bar',
                colorScheme: 'blue',
                showLegend: true,
                showGrid: true,
                ...widgetConfig.visualization
            },
            styling: {
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: 8,
                padding: 16,
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                ...widgetConfig.styling
            },
            permissions: {
                viewRoles: ['viewer', 'editor', 'admin'],
                editRoles: ['editor', 'admin'],
                exportAccess: true,
                ...widgetConfig.permissions
            }
        };

        dashboard.widgets.push(widget);
        dashboard.metadata.updated = Date.now();

        // Setup real-time data if needed
        if (widget.dataSource.refreshInterval) {
            this.setupRealTimeUpdate(widgetId, widget.dataSource);
        }

        return widget;
    }

    /**
     * Update widget configuration
     */
    async updateWidget(
        dashboardId: string,
        widgetId: string,
        updates: Partial<DashboardWidget>
    ): Promise<DashboardWidget> {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }

        const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
        if (widgetIndex === -1) {
            throw new Error('Widget not found');
        }

        const widget = dashboard.widgets[widgetIndex];
        dashboard.widgets[widgetIndex] = { ...widget, ...updates };
        dashboard.metadata.updated = Date.now();

        return dashboard.widgets[widgetIndex];
    }

    /**
     * Remove widget from dashboard
     */
    async removeWidget(dashboardId: string, widgetId: string): Promise<boolean> {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }

        const initialLength = dashboard.widgets.length;
        dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
        dashboard.metadata.updated = Date.now();

        // Clean up real-time subscriptions
        this.cleanupRealTimeUpdate(widgetId);

        return dashboard.widgets.length < initialLength;
    }

    /**
     * Get widget data with real-time updates
     */
    async getWidgetData(widgetId: string, widget: DashboardWidget): Promise<{ widgetId: string; data: unknown; timestamp: number; refreshInterval?: number; error?: string; }> {
        const { dataSource } = widget;
        const provider = this.dataProviders.get(dataSource.type);

        if (!provider) {
            throw new Error(`Data provider '${dataSource.type}' not found`);
        }

        try {
            const data = await provider.query(dataSource.query, dataSource.filters || {});
            return { widgetId, data, timestamp: Date.now(), refreshInterval: dataSource.refreshInterval };
        } catch (error) {
            console.error(`[DashboardBuilder] Data fetch error for widget ${widgetId}:`, error);
            return { widgetId, data: null, error: 'Failed to fetch data', timestamp: Date.now() };
        }
    }

    /**
     * Export dashboard as PDF/Excel report
     */
    async exportDashboard(
        dashboardId: string,
        format: 'pdf' | 'excel' | 'json',
        options?: {
            includeData?: boolean;
            dateRange?: { start: string; end: string; };
            branding?: {
                logo?: string;
                companyName?: string;
                colors?: Record<string, string>;
            };
        }
    ): Promise<{
        success: boolean;
        downloadUrl?: string;
        error?: string;
    }> {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            return { success: false, error: 'Dashboard not found' };
        }

        try {
            const exportData = await this.generateExportData(dashboard, options);

            switch (format) {
                case 'pdf':
                    return await this.exportToPDF(exportData);
                case 'excel':
                    return await this.exportToExcel(exportData);
                case 'json':
                    return await this.exportToJSON();
                default:
                    return { success: false, error: 'Unsupported export format' };
            }
        } catch (error) {
            console.error('[DashboardBuilder] Export error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Export failed'
            };
        }
    }

    /**
     * Share dashboard with collaborators
     */
    async shareDashboard(
        dashboardId: string,
        collaborators: Array<{ userId: string; role: 'viewer' | 'editor'; }>,
        isPublic: boolean = false
    ): Promise<{ shareId: string; shareUrl: string; }> {
        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }

        const shareId = this.generateShareId();

        dashboard.sharing = {
            isShared: true,
            shareId,
            allowComments: true,
            collaborators: collaborators.map(collab => ({
                ...collab,
                addedAt: Date.now()
            }))
        };

        dashboard.metadata.isPublic = isPublic;
        dashboard.metadata.updated = Date.now();

        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shared/${shareId}`;

        return { shareId, shareUrl };
    }

    /**
     * Get available dashboard templates
     */
    getTemplates(userTier: string): DashboardTemplate[] {
        return Array.from(this.templates.values()).filter(template =>
            this.validateTierAccess(userTier, template.requiredTier)
        );
    }

    /**
     * Get user's dashboards
     */
    getUserDashboards(userId: string): DashboardLayout[] {
        return Array.from(this.dashboards.values()).filter(
            dashboard => dashboard.userId === userId
        );
    }

    /**
     * Duplicate existing dashboard
     */
    async duplicateDashboard(
        dashboardId: string,
        newName: string,
        userId: string
    ): Promise<DashboardLayout> {
        const originalDashboard = this.dashboards.get(dashboardId);
        if (!originalDashboard) {
            throw new Error('Dashboard not found');
        }

        const newDashboardId = this.generateDashboardId();
        const duplicatedDashboard: DashboardLayout = {
            ...originalDashboard,
            id: newDashboardId,
            name: newName,
            userId,
            widgets: originalDashboard.widgets.map(widget => ({
                ...widget,
                id: this.generateWidgetId()
            })),
            metadata: {
                ...originalDashboard.metadata,
                created: Date.now(),
                updated: Date.now(),
                version: '1.0.0'
            },
            sharing: {
                isShared: false,
                allowComments: false,
                collaborators: []
            }
        };

        this.dashboards.set(newDashboardId, duplicatedDashboard);
        return duplicatedDashboard;
    }

    /**
     * Private helper methods
     */
    private initializeTemplates(): void {
        // SEO Executive Dashboard Template
        this.templates.set('seo-executive', {
            id: 'seo-executive',
            name: 'SEO Executive Dashboard',
            description: 'High-level SEO performance overview for executives',
            category: 'executive',
            preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...', // Mock preview
            requiredTier: 'agency',
            estimatedSetupTime: '5 minutes',
            layout: {
                name: 'SEO Executive Dashboard',
                description: 'Executive-level SEO performance overview',
                widgets: [
                    {
                        ...this.widgetTemplates['seo-overview'],
                        id: 'exec-1',
                        position: { x: 0, y: 0, width: 6, height: 3 }
                    },
                    {
                        ...this.widgetTemplates['keyword-rankings'],
                        id: 'exec-2',
                        position: { x: 6, y: 0, width: 6, height: 3 }
                    },
                    {
                        ...this.widgetTemplates['performance-vitals'],
                        id: 'exec-3',
                        position: { x: 0, y: 3, width: 12, height: 4 }
                    }
                ] as DashboardWidget[],
                layout: { columns: 12, rows: 8, gap: 16, responsive: true },
                theme: this.getDefaultTheme(),
                sharing: { isShared: false, allowComments: false, collaborators: [] }
            }
        });

        // Comprehensive SEO Analysis Template
        this.templates.set('seo-comprehensive', {
            id: 'seo-comprehensive',
            name: 'Comprehensive SEO Analysis',
            description: 'Detailed SEO analysis with all key metrics',
            category: 'seo',
            preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
            requiredTier: 'enterprise',
            estimatedSetupTime: '10 minutes',
            layout: {
                name: 'Comprehensive SEO Analysis',
                description: 'Complete SEO performance analysis',
                widgets: [
                    {
                        ...this.widgetTemplates['seo-overview'],
                        id: 'comp-1',
                        position: { x: 0, y: 0, width: 4, height: 2 }
                    },
                    {
                        ...this.widgetTemplates['keyword-rankings'],
                        id: 'comp-2',
                        position: { x: 4, y: 0, width: 4, height: 2 }
                    },
                    {
                        ...this.widgetTemplates['traffic-sources'],
                        id: 'comp-3',
                        position: { x: 8, y: 0, width: 4, height: 2 }
                    },
                    {
                        ...this.widgetTemplates['competitor-analysis'],
                        id: 'comp-4',
                        position: { x: 0, y: 2, width: 8, height: 3 }
                    },
                    {
                        ...this.widgetTemplates['performance-vitals'],
                        id: 'comp-5',
                        position: { x: 8, y: 2, width: 4, height: 3 }
                    }
                ] as DashboardWidget[],
                layout: { columns: 12, rows: 8, gap: 16, responsive: true },
                theme: this.getDefaultTheme(),
                sharing: { isShared: false, allowComments: false, collaborators: [] }
            }
        });

        console.log('[DashboardBuilder] Templates initialized');
    }

    /**
     * Persist currently loaded templates to Firestore (idempotent upsert)
     * Stores only minimal required fields (no derived ratios) per data integrity policy.
     */
    private async persistLocalTemplates(): Promise<void> {
        try {
            // Dynamic import to avoid bundling Firestore in non-browser contexts unnecessarily
            const { db } = await import('../firebase');
            const { doc, setDoc, getDoc, collection } = await import('firebase/firestore');
            const colRef = collection(db, 'dashboardTemplates');
            for (const tpl of this.templates.values()) {
                const docRef = doc(colRef, tpl.id);
                const existing = await getDoc(docRef);
                if (!existing.exists()) {
                    // Store minimal template; layout.widgets preserved (core to template)
                    await setDoc(docRef, {
                        id: tpl.id,
                        name: tpl.name,
                        description: tpl.description,
                        category: tpl.category,
                        requiredTier: tpl.requiredTier,
                        estimatedSetupTime: tpl.estimatedSetupTime,
                        preview: tpl.preview,
                        layout: tpl.layout, // Contains widgets + layout meta
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        __provenance: 'seed'
                    });
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            console.warn('[DashboardBuilder] Persist templates skipped:', msg);
        }
    }

    /**
     * Load templates from Firestore and merge (does not override in-memory definitions unless new id)
     * Cached for TEMPLATE_SYNC_TTL.
     */
    private async syncTemplatesFromFirestore(force = false): Promise<void> {
        if (!force && Date.now() - this.lastTemplateSync < CustomDashboardBuilder.TEMPLATE_SYNC_TTL) return;
        try {
            const { db } = await import('../firebase');
            const { collection, getDocs } = await import('firebase/firestore');
            const snapshot = await getDocs(collection(db, 'dashboardTemplates'));
            snapshot.forEach(d => {
                const raw = d.data() as Partial<DashboardTemplate> & { layout?: any; };
                if (!raw?.id) return;
                if (!this.templates.has(raw.id)) {
                    this.templates.set(raw.id, {
                        id: raw.id,
                        name: raw.name || 'Unnamed Template',
                        description: raw.description || '',
                        category: (raw.category as any) || 'seo',
                        preview: raw.preview || '',
                        requiredTier: raw.requiredTier || 'free',
                        estimatedSetupTime: raw.estimatedSetupTime || 'unknown',
                        layout: raw.layout as any
                    });
                }
            });
            this.lastTemplateSync = Date.now();
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            console.warn('[DashboardBuilder] Template sync failed:', msg);
        }
    }

    /**
     * Public method to force refresh templates (e.g., admin action)
     */
    async refreshTemplates(): Promise<void> {
        await this.syncTemplatesFromFirestore(true);
    }

    private setupDataProviders(): void {
        // NeuroSEO Data Provider
        this.dataProviders.set('neuroseo', {
            query: async (queryType: string) => {
                // Mock NeuroSEO data - integrate with actual NeuroSEO orchestrator
                switch (queryType) {
                    case 'overview-metrics':
                        return {
                            overallScore: 78,
                            keywordCount: 245,
                            backlinks: 1340,
                            organicTraffic: 45200
                        };
                    case 'competitor-metrics':
                        return [
                            { domain: 'competitor1.com', score: 82, traffic: 52000 },
                            { domain: 'competitor2.com', score: 75, traffic: 38000 },
                            { domain: 'competitor3.com', score: 70, traffic: 31000 }
                        ];
                    default:
                        return { message: 'Data not available' };
                }
            }
        });

        // Keywords Data Provider
        this.dataProviders.set('keywords', {
            query: async (queryType: string) => {
                switch (queryType) {
                    case 'ranking-trends':
                        return Array.from({ length: 30 }, (_, i) => ({
                            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            position: Math.floor(Math.random() * 20) + 1
                        }));
                    default:
                        return [];
                }
            }
        });

        // Performance Data Provider
        this.dataProviders.set('performance', {
            query: async (queryType: string) => {
                switch (queryType) {
                    case 'vitals-history':
                        return Array.from({ length: 30 }, (_, i) => ({
                            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            lcp: 1.8 + Math.random() * 1.4,
                            cls: 0.05 + Math.random() * 0.1,
                            fid: 50 + Math.random() * 100
                        }));
                    default:
                        return [];
                }
            }
        });

        console.log('[DashboardBuilder] Data providers initialized');
    }

    private validateTierAccess(userTier: string, requiredTier: string): boolean {
        const tierOrder = ['free', 'starter', 'agency', 'enterprise', 'admin'];
        const userLevel = tierOrder.indexOf(userTier);
        const requiredLevel = tierOrder.indexOf(requiredTier);
        return userLevel >= requiredLevel;
    }

    private getDefaultTheme() {
        return {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            background: '#f8fafc',
            text: '#334155',
            accent: '#10b981'
        };
    }

    private setupRealTimeUpdate(widgetId: string, dataSource: { refreshInterval?: number }): void {
        if (dataSource?.refreshInterval && dataSource.refreshInterval > 0) {
            const interval = setInterval(async () => {
                // Emit real-time update event
                console.log(`[DashboardBuilder] Real-time update for widget ${widgetId}`);
            }, dataSource.refreshInterval * 1000);

            this.realTimeSubscriptions.set(widgetId, interval);
        }
    }

    private cleanupRealTimeUpdate(widgetId: string): void {
        const interval = this.realTimeSubscriptions.get(widgetId);
        if (interval) {
            clearInterval(interval);
            this.realTimeSubscriptions.delete(widgetId);
        }
    }

    private async generateExportData(dashboard: DashboardLayout, options?: { includeData?: boolean }): Promise<{ dashboard: { name: string; description: string; created: number; updated: number; }; widgets: Array<{ widget: DashboardWidget; data: unknown; }>; metadata: { exportedAt: number; format: string; options?: { includeData?: boolean }; }; }> {
        const exportData = {
            dashboard: {
                name: dashboard.name,
                description: dashboard.description,
                created: dashboard.metadata.created,
                updated: dashboard.metadata.updated
            },
            widgets: [] as Array<{ widget: DashboardWidget; data: unknown; }>,
            metadata: {
                exportedAt: Date.now(),
                format: 'export',
                options
            }
        };

        if (options?.includeData) {
            for (const widget of dashboard.widgets) {
                const widgetData = await this.getWidgetData(widget.id, widget);
                exportData.widgets.push({
                    widget,
                    data: widgetData
                });
            }
        }

        return exportData;
    }

    private async exportToPDF(_data: unknown): Promise<{ success: boolean; downloadUrl: string; }> {
        // Mock PDF export - integrate with actual PDF generation library
        return {
            success: true,
            downloadUrl: '/api/downloads/dashboard-export.pdf'
        };
    }

    private async exportToExcel(_data: unknown): Promise<{ success: boolean; downloadUrl: string; }> {
        // Mock Excel export - integrate with actual Excel generation library
        return {
            success: true,
            downloadUrl: '/api/downloads/dashboard-export.xlsx'
        };
    }

    private async exportToJSON(): Promise<{ success: boolean; downloadUrl: string; }> {
        return {
            success: true,
            downloadUrl: '/api/downloads/dashboard-export.json'
        };
    }

    private generateDashboardId(): string {
        return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateWidgetId(): string {
        return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateShareId(): string {
        return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const customDashboardBuilder = new CustomDashboardBuilder();
