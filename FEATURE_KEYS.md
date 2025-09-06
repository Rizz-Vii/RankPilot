# Feature Keys Registry

This registry enumerates feature keys used for gating across the app. Added columns:

Type values:

- core: primary navigable feature
- capability: non-navigable capability flag
- alias: legacy key mapping to canonical feature (see FEATURE_ALIASES)
- entitlement: subscription/account benefit (not a UI gate)
- umbrella: historical umbrella grouping
- planned: future roadmap (inactive)
- deprecated: scheduled for removal (no new usage)

| Key | Required Tier | Admin | Status | Type | Notes |
| --- | ------------- | ----- | ------ | ---- | ----- |
| dashboard |  |  | active | core | Main dashboard composite |
| keyword_analysis |  |  | active | core | Basic keyword tools |
| link_analysis | starter |  | alias | alias | -> link_view |
| serp_analysis | starter |  | alias | alias | Folded into NeuroSEO outputs |
| performance_metrics | starter |  | alias | alias | -> dashboard (metrics panels) |
| export_pdf | starter |  | alias | capability | -> export_formats |
| export_csv | agency |  | alias | capability | -> export_formats (adds CSV at agency) |
| export_formats | starter |  | active | capability | Unified export gating (PDF/CSV/Excel) |
| competitor_analysis | agency |  | active | core | Competitor intelligence |
| bulk_operations | agency |  | planned | planned | Pending spec (Q4 evaluation) |
| white_label | agency |  | active | capability | Report branding |
| api_access | agency |  | active | capability | API + integrations |
| priority_support | agency |  | deprecated | entitlement | Entitlement moved to plan metadata |
| custom_integrations | enterprise |  | active | core | Custom integration module |
| dedicated_support | enterprise |  | deprecated | entitlement | Account manager benefit |
| enterprise_sla | enterprise |  | deprecated | entitlement | Contractual SLA |
| advanced_security | enterprise |  | planned | planned | Future security center (rename likely) |
| admin_panel |  | yes | deprecated | umbrella | Consolidated into distributed admin surfaces |
| user_management |  | yes | deprecated | umbrella | Superseded by team_management + settings |
| system_settings |  | yes | deprecated | umbrella | Settings distributed |
| analytics_admin |  | yes | planned | planned | Replace with observability_dashboard |
| integration_hub | enterprise | yes | planned | planned | Enterprise integration launcher |
| neuroseo | starter |  | alias | umbrella | Umbrella -> semantic_map representative |
| ai_content_generation | agency |  | alias | umbrella | -> rewrite_gen / content_briefs split |
| ai_insights | starter |  | deprecated | umbrella | Folded into analytics surfaces |
| team_management | agency |  | active | core | Team & collaboration |
| advanced_analytics | enterprise |  | planned | planned | Custom reports / cohorts (spec needed) |
| marketing_email_campaigns | enterprise |  | planned | planned | Marketing suite expansion |
| marketing_lead_generation | enterprise |  | planned | planned | Lead capture automation |
| marketing_social_presence | enterprise |  | planned | planned | Social scheduling |
| marketing_content_generation | enterprise |  | planned | planned | Marketing asset generator |
| automation_recipes | agency |  | active | core | Scheduled automation workflows |
| sales_pipeline | starter |  | active | core | Sales funnel overview |
| sales_deals | agency |  | active | core | Deal management |
| sales_outreach | agency |  | active | core | Outreach sequencing |
| finance_billing_overview | starter |  | active | core | Billing overview |
| finance_invoices | starter |  | active | core | Invoice history |
| finance_revenue_analytics | agency |  | planned | planned | Revenue & churn analytics |
| finance_accounting | agency |  | planned | planned | Accounting snapshots |
| content_briefs | agency |  | active | core | Briefs dashboard |
| billing_portal_access | starter |  | active | capability | Billing portal entry (live data) |
| voice_agent | agency |  | active | core | Outbound/inbound phone agent UI |
