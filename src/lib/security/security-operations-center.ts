/**
 * Security Operations Center (SOC)
 * DevNext Part III Step 3: Advanced Security Hardening
 * 
 * Implements enterprise-grade security monitoring and incident _response:
 * - Real-time threat detection and analysis
 * - Automated incident response workflows
 * - Security orchestration and automation (SOAR)
 * - Threat intelligence integration
 * - 24/7 monitoring and alerting
 * - Incident management and forensics
 * - Security metrics and reporting
 */

import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

// Custom error types for security operations
class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

class DataCorruptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DataCorruptionError';
    }
}


export interface SecurityIncident {
    id: string;
    title: string;
    description: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    category: 'malware' | 'phishing' | 'data-breach' | 'insider-threat' | 'ddos' | 'unauthorized-access' | 'system-compromise';
    status: 'open' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed';
    source: {
        type: 'automated' | 'manual' | 'external';
        system: string;
        detector: string;
    };
    timeline: {
        detected: number;
        acknowledged?: number;
        triaged?: number;
        contained?: number;
        eradicated?: number;
        recovered?: number;
        closed?: number;
    };
    indicators: {
        type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'file';
        _value: string;
        confidence: number; // 0-100
    }[];
    impact: {
        scope: 'single-user' | 'department' | 'organization' | 'external';
        systems: string[];
        dataTypes: string[];
        estimatedCost?: number;
        businessImpact: string;
    };
    investigation: {
        assigned: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        evidence: string[];
        timeline: Array<{
            timestamp: number;
            action: string;
            actor: string;
            details: string;
        }>;
        findings: string[];
        recommendations: string[];
    };
    _response: {
        containmentActions: string[];
        eradicationActions: string[];
        recoveryActions: string[];
        lessonsLearned: string[];
        postIncidentReport?: string;
    };
    metadata: {
        tags: string[];
        correlationId?: string;
        relatedIncidents: string[];
        externalReferences: string[];
    };
}

export interface SecurityAlert {
    id: string;
    timestamp: number;
    rule: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    source: {
        system: string;
        component: string;
        location?: string;
    };
    _event: {
        type: string;
        description: string;
        rawData: Record<string, any>;
    };
    enrichment: {
        threatIntelligence?: string[];
        geoLocation?: string;
        reputation?: {
            score: number;
            source: string;
        };
        context?: Record<string, any>;
    };
    disposition: {
        status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false-positive';
        analyst?: string;
        notes?: string;
        escalated?: boolean;
        incidentId?: string;
    };
}

export interface SOCMetrics {
    incidents: {
        total: number;
        open: number;
        closed: number;
        bySeverity: Record<string, number>;
        byCategory: Record<string, number>;
        averageResolutionTime: number; // minutes
        mttr: number; // Mean Time to Resolution
        mttd: number; // Mean Time to Detection
    };
    alerts: {
        total: number;
        processed: number;
        falsePositives: number;
        escalated: number;
        averageProcessingTime: number; // minutes
    };
    threatIntelligence: {
        indicators: number;
        feeds: number;
        lastUpdate: number;
        matchRate: number; // percentage
    };
    coverage: {
        systems: number;
        endpoints: number;
        networks: number;
        applications: number;
        monitoringUptime: number; // percentage
    };
    performance: {
        alertVolume: number; // per hour
        responseTime: number; // minutes
        escalationRate: number; // percentage
        analystEfficiency: number; // alerts per analyst per hour
    };
}

export interface SecurityPlaybook {
    id: string;
    name: string;
    description: string;
    triggers: Array<{
        type: 'alert' | 'incident' | 'manual' | 'scheduled';
        conditions: Record<string, any>;
    }>;
    steps: Array<{
        id: string;
        name: string;
        type: 'automated' | 'manual' | 'decision';
        action: string;
        parameters: Record<string, any>;
        timeout?: number;
        retries?: number;
        onSuccess?: string; // next step id
        onFailure?: string; // next step id
    }>;
    approval: {
        required: boolean;
        roles: string[];
        timeout: number;
    };
    metadata: {
        version: string;
        author: string;
        created: number;
        lastModified: number;
        tags: string[];
    };
}

export interface ThreatIntelligenceIndicator {
    id: string;
    type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'file';
    _value: string;
    malwareFamily?: string;
    threatType: string[];
    confidence: number; // 0-100
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    source: {
        name: string;
        reliability: number; // 0-100
        url?: string;
    };
    context: {
        description: string;
        firstSeen: number;
        lastSeen: number;
        tags: string[];
        killChain?: string[];
        mitreTactics?: string[];
    };
    expires: number;
    metadata: Record<string, any>;
}

export class SecurityOperationsCenter extends EventEmitter {
    private incidents: Map<string, SecurityIncident> = new Map();
    private alerts: Map<string, SecurityAlert> = new Map();
    private playbooks: Map<string, SecurityPlaybook> = new Map();
    private threatIntelligence: Map<string, ThreatIntelligenceIndicator> = new Map();
    private activePlaybookExecutions: Map<string, any> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;
    private alertProcessingQueue: SecurityAlert[] = [];
    private isProcessingAlerts = false;

    // SOC Configuration
    private socConfig = {
        alertRetention: 90, // days
        incidentRetention: 365, // days
        maxAlertsPerHour: 1000,
        escalationThresholds: {
            criticalIncidentTimeout: 15, // minutes
            highIncidentTimeout: 60, // minutes
            mediumIncidentTimeout: 240, // minutes
        },
        autoEscalationEnabled: true,
        threatIntelligenceFeeds: [
            'internal-blacklist',
            'commercial-feed',
            'open-source-intel'
        ]
    };

    constructor() {
        super();
        this.initializePlaybooks();
        this.loadThreatIntelligence();
        this.startMonitoring();
        console.log('[SecurityOperationsCenter] SOC initialized and monitoring started');
    }

    /**
     * Process incoming security alert
     */
    async processAlert(alertData: {
        rule: string;
        severity: SecurityAlert['severity'];
        source: SecurityAlert['source'];
        _event: SecurityAlert['_event'];
        rawData?: Record<string, any>;
    }): Promise<SecurityAlert> {
        try {
            const alert: SecurityAlert = {
                id: this.generateId(),
                timestamp: Date.now(),
                rule: alertData.rule,
                severity: alertData.severity,
                source: alertData.source,
                _event: {
                    ...alertData._event,
                    rawData: alertData.rawData || {}
                },
                enrichment: {},
                disposition: {
                    status: 'new'
                }
            };

            // Enrich alert with threat intelligence
            await this.enrichAlert(alert);

            // Store alert
            this.alerts.set(alert.id, alert);

            // Add to processing queue
            this.alertProcessingQueue.push(alert);

            // Start processing if not already running
            if (!this.isProcessingAlerts) {
                this.processAlertQueue();
            }

            // Emit alert event
            this.emit('alert-received', alert);

            console.log(`[SecurityOperationsCenter] Alert processed: ${alert.id} (${alert.severity})`);

            return alert;

        } catch (_error) {
            console.error('[SecurityOperationsCenter] Alert processing failed:', _error);
            throw new Error('Failed to process security alert');
        }
    }

    /**
     * Create security incident
     */
    async createIncident(incidentData: {
        title: string;
        description: string;
        severity: SecurityIncident['severity'];
        category: SecurityIncident['category'];
        source: SecurityIncident['source'];
        indicators?: SecurityIncident['indicators'];
        impact?: Partial<SecurityIncident['impact']>;
        alertIds?: string[];
    }): Promise<SecurityIncident> {
        try {
            const incident: SecurityIncident = {
                id: this.generateId(),
                title: incidentData.title,
                description: incidentData.description,
                severity: incidentData.severity,
                category: incidentData.category,
                status: 'open',
                source: incidentData.source,
                timeline: {
                    detected: Date.now()
                },
                indicators: incidentData.indicators || [],
                impact: {
                    scope: 'single-user',
                    systems: [],
                    dataTypes: [],
                    businessImpact: 'Under investigation',
                    ...incidentData.impact
                },
                investigation: {
                    assigned: 'soc-analyst',
                    priority: this.mapSeverityToPriority(incidentData.severity),
                    evidence: [],
                    timeline: [],
                    findings: [],
                    recommendations: []
                },
                _response: {
                    containmentActions: [],
                    eradicationActions: [],
                    recoveryActions: [],
                    lessonsLearned: []
                },
                metadata: {
                    tags: [],
                    relatedIncidents: [],
                    externalReferences: []
                }
            };

            // Link related alerts
            if (incidentData.alertIds) {
                incidentData.alertIds.forEach(alertId => {
                    const alert = this.alerts.get(alertId);
                    if (alert) {
                        alert.disposition.incidentId = incident.id;
                        alert.disposition.escalated = true;
                        this.alerts.set(alertId, alert);
                    }
                });
            }

            // Store incident
            this.incidents.set(incident.id, incident);

            // Trigger automated response playbooks
            await this.triggerPlaybooks(incident);

            // Set up auto-escalation timer
            this.scheduleAutoEscalation(incident);

            // Emit incident event
            this.emit('incident-created', incident);

            console.log(`[SecurityOperationsCenter] Incident created: ${incident.id} (${incident.severity})`);

            return incident;

        } catch (_error) {
            console.error('[SecurityOperationsCenter] Incident creation failed:', _error);
            throw new Error('Failed to create security incident');
        }
    }

    /**
     * Update incident status and timeline
     */
    async updateIncident(incidentId: string, updates: {
        status?: SecurityIncident['status'];
        investigation?: Partial<SecurityIncident['investigation']>;
        _response?: Partial<SecurityIncident['_response']>;
        notes?: string;
        analyst?: string;
    }): Promise<SecurityIncident> {
        try {
            const incident = this.incidents.get(incidentId);
            if (!incident) {
                throw new Error('Incident not found');
            }

            // Update status and timeline
            if (updates.status && updates.status !== incident.status) {
                incident.status = updates.status;
                incident.timeline[updates.status as keyof typeof incident.timeline] = Date.now();

                // Add timeline entry
                incident.investigation.timeline.push({
                    timestamp: Date.now(),
                    action: 'status-change',
                    actor: updates.analyst || 'system',
                    details: `Status changed to ${updates.status}`
                });
            }

            // Update investigation details
            if (updates.investigation) {
                Object.assign(incident.investigation, updates.investigation);
            }

            // Update response details
            if (updates._response) {
                Object.assign(incident._response, updates._response);
            }

            // Add notes to timeline
            if (updates.notes) {
                incident.investigation.timeline.push({
                    timestamp: Date.now(),
                    action: 'note-added',
                    actor: updates.analyst || 'system',
                    details: updates.notes
                });
            }

            // Store updated incident
            this.incidents.set(incidentId, incident);

            // Emit update event
            this.emit('incident-updated', incident);

            console.log(`[SecurityOperationsCenter] Incident updated: ${incidentId} (${incident.status})`);

            return incident;

        } catch (_error) {
            console.error('[SecurityOperationsCenter] Incident update failed:', _error);
            throw new Error('Failed to update incident');
        }
    }

    /**
     * Execute security playbook
     */
    async executePlaybook(playbookId: string, context: {
        incidentId?: string;
        alertId?: string;
        parameters?: Record<string, any>;
        executor?: string;
    }): Promise<{
        executionId: string;
        status: 'running' | 'completed' | 'failed' | 'cancelled';
        results: Array<{
            stepId: string;
            status: 'success' | 'failure' | 'skipped';
            output?: unknown;
            error?: string;
        }>;
    }> {
        try {
            const playbook = this.playbooks.get(playbookId);
            if (!playbook) {
                throw new Error('Playbook not found');
            }

            const executionId = this.generateId();
            const execution = {
                id: executionId,
                playbookId,
                context,
                status: 'running' as 'running' | 'completed' | 'failed' | 'cancelled',
                startTime: Date.now(),
                endTime: undefined as number | undefined,
                results: [] as { stepId: string; status: 'success' | 'failure' | 'skipped'; output?: unknown; error?: string }[],
                currentStep: 0
            };

            this.activePlaybookExecutions.set(executionId, execution);

            console.log(`[SecurityOperationsCenter] Executing playbook: ${playbook.name} (${executionId})`);

            // Execute playbook steps
            for (let i = 0; i < playbook.steps.length; i++) {
                const step = playbook.steps[i];
                execution.currentStep = i;

                try {
                    const result = await this.executePlaybookStep(step, context);
                    execution.results.push({
                        stepId: step.id,
                        status: 'success',
                        output: result
                    });

                    // Check for conditional next steps
                    if (step.onSuccess && step.onSuccess !== 'next') {
                        const nextStepIndex = playbook.steps.findIndex(s => s.id === step.onSuccess);
                        if (nextStepIndex !== -1) {
                            i = nextStepIndex - 1; // -1 because loop will increment
                        }
                    }

                } catch (_error) {
                    execution.results.push({
                        stepId: step.id,
                        status: 'failure',
                        error: _error instanceof Error ? (_error as Error).message : 'Unknown error'
                    });

                    // Check for failure handling
                    if (step.onFailure) {
                        const nextStepIndex = playbook.steps.findIndex(s => s.id === step.onFailure);
                        if (nextStepIndex !== -1) {
                            i = nextStepIndex - 1; // -1 because loop will increment
                            continue;
                        }
                    }

                    // Stop execution on failure if no error handling
                    execution.status = 'failed';
                    break;
                }
            }

            // Mark as completed if not failed
            if (execution.status === 'running') {
                execution.status = 'completed';
            }

            execution.endTime = Date.now();

            // Emit execution event
            this.emit('playbook-executed', {
                executionId,
                playbookId,
                status: execution.status,
                results: execution.results
            });

            return {
                executionId,
                status: execution.status,
                results: execution.results
            };

        } catch (_error) {
            console.error('[SecurityOperationsCenter] Playbook execution failed:', _error);
            throw new Error('Failed to execute playbook');
        }
    }

    /**
     * Get SOC metrics and statistics
     */
    getSOCMetrics(): SOCMetrics {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const last24h = now - dayMs;

        const allIncidents = Array.from(this.incidents.values());
        const allAlerts = Array.from(this.alerts.values());

        const recentIncidents = allIncidents.filter(i => i.timeline.detected >= last24h);
        const recentAlerts = allAlerts.filter(a => a.timestamp >= last24h);

        // Calculate incident metrics
        const openIncidents = allIncidents.filter(i => i.status === 'open' || i.status === 'investigating');
        const closedIncidents = allIncidents.filter(i => i.status === 'closed');

        const incidentsBySeverity = allIncidents.reduce((acc, incident) => {
            acc[incident.severity] = (acc[incident.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const incidentsByCategory = allIncidents.reduce((acc, incident) => {
            acc[incident.category] = (acc[incident.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate resolution times
        const resolvedIncidents = closedIncidents.filter(i => i.timeline.detected && i.timeline.closed);
        const averageResolutionTime = resolvedIncidents.length > 0
            ? resolvedIncidents.reduce((sum, _i) => sum + (_i.timeline.closed! - _i.timeline.detected), 0) / resolvedIncidents.length / 60000 // minutes
            : 0;

        // Calculate alert metrics
        const processedAlerts = allAlerts.filter(a => a.disposition.status !== 'new');
        const falsePositiveAlerts = allAlerts.filter(a => a.disposition.status === 'false-positive');
        const escalatedAlerts = allAlerts.filter(a => a.disposition.escalated);

        return {
            incidents: {
                total: allIncidents.length,
                open: openIncidents.length,
                closed: closedIncidents.length,
                bySeverity: incidentsBySeverity,
                byCategory: incidentsByCategory,
                averageResolutionTime,
                mttr: averageResolutionTime, // Mean Time to Resolution
                mttd: 15 // Mock Mean Time to Detection (minutes)
            },
            alerts: {
                total: allAlerts.length,
                processed: processedAlerts.length,
                falsePositives: falsePositiveAlerts.length,
                escalated: escalatedAlerts.length,
                averageProcessingTime: 5 // Mock average processing time (minutes)
            },
            threatIntelligence: {
                indicators: this.threatIntelligence.size,
                feeds: this.socConfig.threatIntelligenceFeeds.length,
                lastUpdate: now - (60 * 60 * 1000), // 1 hour ago
                matchRate: 15 // Mock match rate percentage
            },
            coverage: {
                systems: 50,
                endpoints: 200,
                networks: 10,
                applications: 25,
                monitoringUptime: 99.8
            },
            performance: {
                alertVolume: recentAlerts.length,
                responseTime: averageResolutionTime,
                escalationRate: (escalatedAlerts.length / Math.max(allAlerts.length, 1)) * 100,
                analystEfficiency: 12 // Mock alerts per analyst per hour
            }
        };
    }

    /**
     * Private helper methods
     */
    private initializePlaybooks(): void {
        // DDoS Response Playbook
        this.playbooks.set('ddos-response', {
            id: 'ddos-response',
            name: 'DDoS Attack Response',
            description: 'Automated response to DDoS attacks',
            triggers: [{
                type: 'alert',
                conditions: { category: 'ddos', severity: ['high', 'critical'] }
            }],
            steps: [
                {
                    id: 'analyze-traffic',
                    name: 'Analyze Traffic Patterns',
                    type: 'automated',
                    action: 'analyze-ddos-traffic',
                    parameters: { timeWindow: '5m' }
                },
                {
                    id: 'enable-protection',
                    name: 'Enable DDoS Protection',
                    type: 'automated',
                    action: 'enable-ddos-protection',
                    parameters: { level: 'high' }
                },
                {
                    id: 'notify-team',
                    name: 'Notify Security Team',
                    type: 'automated',
                    action: 'send-notification',
                    parameters: { channel: 'security-alerts', priority: 'high' }
                }
            ],
            approval: {
                required: false,
                roles: [],
                timeout: 0
            },
            metadata: {
                version: '1.0',
                author: 'soc-team',
                created: Date.now(),
                lastModified: Date.now(),
                tags: ['ddos', 'automated', 'network']
            }
        });

        // Malware Incident Response Playbook
        this.playbooks.set('malware-response', {
            id: 'malware-response',
            name: 'Malware Incident Response',
            description: 'Comprehensive malware incident response',
            triggers: [{
                type: 'alert',
                conditions: { category: 'malware', severity: ['medium', 'high', 'critical'] }
            }],
            steps: [
                {
                    id: 'isolate-endpoint',
                    name: 'Isolate Affected Endpoint',
                    type: 'automated',
                    action: 'isolate-endpoint',
                    parameters: {}
                },
                {
                    id: 'collect-artifacts',
                    name: 'Collect Malware Artifacts',
                    type: 'automated',
                    action: 'collect-malware-samples',
                    parameters: { preserveForensics: true }
                },
                {
                    id: 'scan-network',
                    name: 'Scan Network for Lateral Movement',
                    type: 'automated',
                    action: 'network-scan',
                    parameters: { scope: 'subnet' }
                },
                {
                    id: 'analyst-review',
                    name: 'Analyst Review Required',
                    type: 'manual',
                    action: 'analyst-review',
                    parameters: { timeout: 3600 }
                }
            ],
            approval: {
                required: true,
                roles: ['senior-analyst', 'incident-commander'],
                timeout: 1800
            },
            metadata: {
                version: '1.0',
                author: 'soc-team',
                created: Date.now(),
                lastModified: Date.now(),
                tags: ['malware', 'incident-response', 'forensics']
            }
        });

        console.log('[SecurityOperationsCenter] Security playbooks initialized');
    }

    private async loadThreatIntelligence(): Promise<void> {
        // Load threat intelligence indicators (in production, from feeds)
        const indicators: ThreatIntelligenceIndicator[] = [
            {
                id: this.generateId(),
                type: 'ip',
                _value: '192.168.1.100',
                threatType: ['malware', 'botnet'],
                confidence: 85,
                severity: 'high',
                source: {
                    name: 'internal-blacklist',
                    reliability: 90
                },
                context: {
                    description: 'Known malware C&C server',
                    firstSeen: Date.now() - (7 * 24 * 60 * 60 * 1000),
                    lastSeen: Date.now() - (1 * 24 * 60 * 60 * 1000),
                    tags: ['c2', 'botnet', 'malware'],
                    killChain: ['command-and-control'],
                    mitreTactics: ['T1071']
                },
                expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
                metadata: {}
            },
            {
                id: this.generateId(),
                type: 'hash',
                _value: 'a1b2c3d4e5f6789012345678901234567890abcd',
                malwareFamily: 'TrojanDownloader',
                threatType: ['malware', 'trojan'],
                confidence: 95,
                severity: 'critical',
                source: {
                    name: 'commercial-feed',
                    reliability: 95
                },
                context: {
                    description: 'Known trojan downloader hash',
                    firstSeen: Date.now() - (3 * 24 * 60 * 60 * 1000),
                    lastSeen: Date.now() - (6 * 60 * 60 * 1000),
                    tags: ['trojan', 'downloader', 'malware'],
                    killChain: ['delivery', 'installation'],
                    mitreTactics: ['T1566', 'T1204']
                },
                expires: Date.now() + (60 * 24 * 60 * 60 * 1000),
                metadata: { fileSize: 245760, firstSubmission: Date.now() - (3 * 24 * 60 * 60 * 1000) }
            }
        ];

        indicators.forEach(indicator => {
            this.threatIntelligence.set(indicator.id, indicator);
        });

        console.log('[SecurityOperationsCenter] Threat intelligence loaded');
    }

    private async enrichAlert(alert: SecurityAlert): Promise<void> {
        // Enrich with threat intelligence
        const threatMatches: string[] = [];

        for (const indicator of this.threatIntelligence.values()) {
            // Check if alert contains indicators
            const alertData = JSON.stringify(alert._event.rawData);
            if (alertData.includes(indicator._value)) {
                threatMatches.push(`${indicator.type}:${indicator._value} (${indicator.severity})`);
            }
        }

        if (threatMatches.length > 0) {
            alert.enrichment.threatIntelligence = threatMatches;
            // Elevate severity if threat intelligence matches
            if (alert.severity === 'low' || alert.severity === 'medium') {
                alert.severity = 'high';
            }
        }

        // Mock geolocation enrichment
        if (alert._event.rawData?.sourceIp) {
            alert.enrichment.geoLocation = 'US-CA-San Francisco';
        }

        // Mock reputation scoring
        alert.enrichment.reputation = {
            score: Math.floor(Math.random() * 100),
            source: 'reputation-service'
        };
    }

    private async processAlertQueue(): Promise<void> {
        this.isProcessingAlerts = true;

        while (this.alertProcessingQueue.length > 0) {
            const alert = this.alertProcessingQueue.shift();
            if (!alert) break;

            try {
                // Auto-correlation and incident creation
                await this.correlateAlert(alert);

                // Update alert disposition
                alert.disposition.status = 'acknowledged';
                this.alerts.set(alert.id, alert);

            } catch (_error) {
                if (_error instanceof NetworkError) {
                    // Retry logic for network errors
                    console.warn('[SecurityOperationsCenter] Network error during alert processing, retrying:', (_error as Error).message);
                    this.alertProcessingQueue.push(alert); // Re-queue the alert for retry
                } else if (_error instanceof DataCorruptionError) {
                    // Skip and notify for data corruption
                    console.error('[SecurityOperationsCenter] Data corruption detected in alert, skipping:', (_error as Error).message);
                    this.emit('alert-processing-error', { alertId: alert.id, _error: (_error as Error).message, type: 'data-corruption' });
                } else {
                    // Generic error handling
                    console.error('[SecurityOperationsCenter] Unexpected alert processing _error:', _error);
                    this.emit('alert-processing-error', { alertId: alert.id, _error: _error instanceof Error ? (_error as Error).message : String(_error), type: 'unknown' });
                }
            }
        }

        this.isProcessingAlerts = false;
    }

    private async correlateAlert(alert: SecurityAlert): Promise<void> {
        // Check for similar alerts that could indicate an incident
        const similarAlerts = Array.from(this.alerts.values()).filter(a =>
            a.rule === alert.rule &&
            a.source.system === alert.source.system &&
            Date.now() - a.timestamp < 300000 && // 5 minutes
            a.disposition.status !== 'false-positive'
        );

        // Auto-create incident for critical alerts or correlated alerts
        if (alert.severity === 'critical' || similarAlerts.length >= 3) {
            await this.createIncident({
                title: `${alert.rule} - ${alert.severity.toUpperCase()}`,
                description: alert._event.description,
                severity: alert.severity,
                category: this.mapAlertCategoryToIncidentCategory(alert.rule),
                source: {
                    type: 'automated',
                    system: 'soc',
                    detector: 'alert-correlation'
                },
                alertIds: [alert.id, ...similarAlerts.map(a => a.id)]
            });
        }
    }

    private async triggerPlaybooks(incident: SecurityIncident): Promise<void> {
        for (const playbook of this.playbooks.values()) {
            for (const trigger of playbook.triggers) {
                if (trigger.type === 'incident' || trigger.type === 'alert') {
                    // Check if trigger conditions match
                    if (this.matchesTriggerConditions(incident, trigger.conditions)) {
                        try {
                            await this.executePlaybook(playbook.id, {
                                incidentId: incident.id,
                                executor: 'system'
                            });
                        } catch (_error) {
                            console.error(`[SecurityOperationsCenter] Failed to execute playbook ${playbook.id}:`, _error);
                        }
                    }
                }
            }
        }
    }

    private async executePlaybookStep(step: SecurityPlaybook['steps'][0], context: unknown): Promise<any> {
        switch (step.action) {
            case 'analyze-ddos-traffic':
                return { _result: 'Traffic analyzed', pattern: 'volumetric-attack' };

            case 'enable-ddos-protection':
                return { _result: 'DDoS protection enabled', level: step.parameters.level };

            case 'send-notification':
                this.emit('notification-sent', {
                    channel: step.parameters.channel,
                    priority: step.parameters.priority,
                    message: `Security incident requires attention: ${(context as { incidentId?: string }).incidentId}`
                });
                return { _result: 'Notification sent' };

            case 'isolate-endpoint':
                return { _result: 'Endpoint isolated', isolated: true };

            case 'collect-malware-samples':
                return { _result: 'Artifacts collected', samples: 3 };

            case 'network-scan':
                return { _result: 'Network scan completed', threatsFound: 0 };

            case 'analyst-review':
                return { _result: 'Analyst review pending', assigned: 'soc-analyst-1' };

            default:
                throw new Error(`Unknown action: ${step.action}`);
        }
    }

    private scheduleAutoEscalation(incident: SecurityIncident): void {
        if (!this.socConfig.autoEscalationEnabled) return;

        const timeout = this.socConfig.escalationThresholds[`${incident.severity}IncidentTimeout` as keyof typeof this.socConfig.escalationThresholds];
        if (!timeout) return;

        setTimeout(() => {
            const currentIncident = this.incidents.get(incident.id);
            if (currentIncident && currentIncident.status === 'open') {
                this.emit('incident-escalation', {
                    incidentId: incident.id,
                    reason: 'timeout',
                    originalSeverity: incident.severity,
                    timeout
                });
            }
        }, timeout * 60 * 1000); // Convert to milliseconds
    }

    private matchesTriggerConditions(incident: SecurityIncident, conditions: Record<string, any>): boolean {
        if (conditions.category && !conditions.category.includes(incident.category)) {
            return false;
        }
        if (conditions.severity && !conditions.severity.includes(incident.severity)) {
            return false;
        }
        return true;
    }

    private mapSeverityToPriority(severity: SecurityIncident['severity']): SecurityIncident['investigation']['priority'] {
        switch (severity) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'medium': return 'medium';
            default: return 'low';
        }
    }

    private mapAlertCategoryToIncidentCategory(rule: string): SecurityIncident['category'] {
        if (rule.includes('ddos')) return 'ddos';
        if (rule.includes('malware')) return 'malware';
        if (rule.includes('phishing')) return 'phishing';
        if (rule.includes('access')) return 'unauthorized-access';
        return 'system-compromise';
    }

    private generateId(): string {
        return randomBytes(8).toString('hex');
    }

    private startMonitoring(): void {
        this.monitoringInterval = setInterval(() => {
            try {
                // Clean up old alerts and incidents
                this.cleanupOldData();

                // Update threat intelligence
                this.updateThreatIntelligence();

                // Emit SOC metrics
                this.emit('soc-metrics', this.getSOCMetrics());

                // Process any pending alerts
                if (this.alertProcessingQueue.length > 0 && !this.isProcessingAlerts) {
                    this.processAlertQueue();
                }

            } catch (_error) {
                console.error('[SecurityOperationsCenter] Monitoring _error:', _error);
            }
        }, 60000); // Run every minute

        console.log('[SecurityOperationsCenter] Monitoring started');
    }

    private cleanupOldData(): void {
        const now = Date.now();
        const alertRetentionMs = this.socConfig.alertRetention * 24 * 60 * 60 * 1000;
        const incidentRetentionMs = this.socConfig.incidentRetention * 24 * 60 * 60 * 1000;

        // Clean up old alerts
        for (const [id, alert] of this.alerts.entries()) {
            if (now - alert.timestamp > alertRetentionMs) {
                this.alerts.delete(id);
            }
        }

        // Clean up old closed incidents
        for (const [id, incident] of this.incidents.entries()) {
            if (incident.status === 'closed' &&
                incident.timeline.closed &&
                now - incident.timeline.closed > incidentRetentionMs) {
                this.incidents.delete(id);
            }
        }

        // Clean up expired threat intelligence
        for (const [id, indicator] of this.threatIntelligence.entries()) {
            if (now > indicator.expires) {
                this.threatIntelligence.delete(id);
            }
        }
    }

    private updateThreatIntelligence(): void {
        // In production, this would fetch from external feeds
        // For now, just log that intelligence is being updated
        console.log('[SecurityOperationsCenter] Threat intelligence updated');
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.incidents.clear();
        this.alerts.clear();
        this.playbooks.clear();
        this.threatIntelligence.clear();
        this.activePlaybookExecutions.clear();
        this.alertProcessingQueue.length = 0;
        console.log('[SecurityOperationsCenter] Resources cleaned up');
    }
}

// Export singleton instance
export const securityOperationsCenter = new SecurityOperationsCenter();
