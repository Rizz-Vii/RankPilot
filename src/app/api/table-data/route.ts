import { NextRequest, NextResponse } from "next/server";
import { enforceProvenance } from "@/lib/middleware/provenance";
import { adminDb } from "@/lib/firebase-admin";

type SortBy = "metric" | "value" | "change";
type Direction = "asc" | "desc";

// Simple deterministic generator for demo/server-side mock data
function generateRows(total: number, seed: string) {
    const rows: { metric: string; value: string; change: string }[] = [];
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s + seed.charCodeAt(i)) % 997;
    for (let i = 1; i <= total; i++) {
        const base = (i * 37 + s) % 1000;
        const value = 50000 + base * 123.45;
        const changeBase = ((i * 13 + s) % 40) - 20; // -20..19
        const sign = changeBase >= 0 ? "+" : "";
        rows.push({
            metric: `Metric ${i}`,
            value: `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            change: `${sign}${changeBase}%`,
        });
    }
    return rows;
}

function parseNumeric(val: string) {
    if (val.endsWith("%")) return parseFloat(val.replace(/%/g, ""));
    return parseFloat(val.replace(/[$,]/g, ""));
}

type TableRow = { metric: string; value: string; change: string };
interface RawRow {
    metric?: string; name?: string; label?: string;
    valueNum?: number; value?: string | number;
    changeNum?: number; change?: string | number;
    [k: string]: unknown;
}

function formatCurrency(val: number) {
    // Format like $50,000 (no decimals by default)
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPercent(val: number) {
    const sign = val >= 0 ? "+" : "";
    return `${sign}${Math.round(val)}%`;
}

function normalizeRow(docData: RawRow): TableRow {
    // Accept a variety of shapes and normalize to strings expected by client
    const metric = String(docData.metric ?? docData.name ?? docData.label ?? "Metric");

    // Value can be number or string; support valueNum as canonical numeric field
    let valueOut: string;
    if (typeof docData.valueNum === "number") valueOut = formatCurrency(docData.valueNum);
    else if (typeof docData.value === "number") valueOut = formatCurrency(docData.value);
    else if (typeof docData.value === "string") valueOut = docData.value;
    else valueOut = formatCurrency(0);

    // Change can be number or string with %; support changeNum as canonical numeric field
    let changeOut: string;
    if (typeof docData.changeNum === "number") changeOut = formatPercent(docData.changeNum);
    else if (typeof docData.change === "number") changeOut = formatPercent(docData.change);
    else if (typeof docData.change === "string") changeOut = docData.change;
    else changeOut = "+0%";

    return { metric, value: valueOut, change: changeOut };
}

async function fetchFromFirestore(opts: {
    widgetId: string;
    sortBy: SortBy;
    direction: Direction;
    page: number;
    pageSize: number;
    all: boolean;
    teamId?: string | null;
    userId?: string | null;
}): Promise<{ rows: TableRow[]; total: number } | null> {
    try {
        const { widgetId, sortBy, direction, page, pageSize, all, teamId, userId } = opts;
        let base: FirebaseFirestore.Query = adminDb
            .collection("dashboardTables")
            .doc(widgetId)
            .collection("rows");
        if (teamId) base = base.where("teamId", "==", teamId);
        if (userId) base = base.where("userId", "==", userId);

        // Try to get total via aggregation; fallback to rough count if unsupported
        let total = 0;
        try {
            // @ts-ignore - count() may not be typed in some versions
            const aggSnap = await (base as unknown).count().get();
            total = aggSnap.data().count || 0;
        } catch {
            // Fallback: attempt to get first 1 with offset large to detect existence; otherwise assume 0
            // We won't scan entire collection for performance.
            total = 0;
        }

        // Map sort fields. Prefer numeric shadow fields when available.
        const orderField =
            sortBy === "metric" ? "metric" : sortBy === "value" ? ("valueNum" as const) : ("changeNum" as const);

        async function pageQuery(limit: number, cursor?: FirebaseFirestore.QueryDocumentSnapshot) {
            let q: FirebaseFirestore.Query = base.orderBy(orderField, direction);
            if (cursor) q = q.startAfter(cursor);
            q = q.limit(limit);
            const snap = await q.get();
            return snap;
        }

        let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

        if (all) {
            // Stream all rows in sorted order in batches
            let last: FirebaseFirestore.QueryDocumentSnapshot | undefined = undefined;
            const batchSize = Math.max(100, Math.min(1000, pageSize || 500));
            // Guard against excessive export sizes; cap at 50k rows
            const maxRows = 50000;
            while (docs.length < maxRows) {
                const snap = await pageQuery(batchSize, last);
                if (snap.empty) break;
                docs.push(...snap.docs);
                last = snap.docs[snap.docs.length - 1];
                if (snap.size < batchSize) break;
            }
            // If total is unknown (0), set to docs length
            if (!total) total = docs.length;
        } else {
            // For paginated view, advance by pages using cursors
            const batchSize = pageSize;
            let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
            let fetched = 0;
            const targetStartIndex = page * pageSize;

            // Efficiently skip using cursors: fetch chunks until we pass targetStartIndex
            const step = Math.min(1000, Math.max(1, batchSize));
            while (fetched + step <= targetStartIndex) {
                const snap = await pageQuery(step, last);
                if (snap.empty) break;
                fetched += snap.size;
                last = snap.docs[snap.docs.length - 1];
                if (snap.size < step) break;
            }
            // Fetch the page
            const pageSnap = await pageQuery(batchSize, last);
            docs = pageSnap.docs;

            if (!total) {
                // Try to estimate total as last page start + this page size; better than zero
                total = fetched + docs.length;
            }
        }

        if (!docs.length) {
            // No data found in Firestore for this widget
            return { rows: [], total };
        }

        const rows = docs.map((d) => normalizeRow(d.data()));
        return { rows, total };
    } catch (e) {
        // Firestore might not be configured in this environment; fall back to mock
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const widgetId = searchParams.get("widgetId") || "global";
        const teamId = searchParams.get("teamId");
        const userId = searchParams.get("userId");
        // Support combined sort parameter: sort=metric.asc | valueNum.desc | changeNum.asc
        function parseSort(): { sortBy: SortBy; direction: Direction } {
            const combined = searchParams.get("sort");
            let sb = (searchParams.get("sortBy") || "metric").toLowerCase();
            let dir = (searchParams.get("direction") || "asc").toLowerCase();
            if (combined) {
                const [fieldRaw, dirRaw] = combined.split(".");
                const field = (fieldRaw || "metric").toLowerCase();
                const mappedField = field === "valuenum" ? "value" : field === "changenum" ? "change" : field;
                sb = ["metric", "value", "change"].includes(mappedField) ? mappedField : "metric";
                dir = (dirRaw === "desc" || dirRaw === "asc") ? dirRaw : "asc";
            }
            return { sortBy: sb as SortBy, direction: dir as Direction };
        }
        const { sortBy, direction } = parseSort();
        const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10) || 0);
        const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10) || 10);
        const format = (searchParams.get("format") || "json").toLowerCase();
        const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";
        // Try Firestore first (real datastore). If unavailable or empty, fall back to deterministic generator.
        let result = await fetchFromFirestore({ widgetId, sortBy, direction, page, pageSize, all, teamId, userId });
        let outRows: TableRow[] = [];
        let total: number;
        if (!result || result.rows.length === 0) {
            // If scoping is requested, do NOT fall back to synthetic data to avoid cross-tenant leakage.
            if (teamId || userId) {
                outRows = [];
                total = 0;
            } else {
                // For demo purposes or when Firestore has no data, use mock generator
                total = Math.min(2000, Math.max(50, parseInt(searchParams.get("total") || "500", 10) || 500));
                const rowsAll = generateRows(total, widgetId);
                const sorted = rowsAll.sort((a, b) => {
                    const dir = direction === "asc" ? 1 : -1;
                    if (sortBy === "metric") return a.metric.localeCompare(b.metric) * dir;
                    if (sortBy === "value") return (parseNumeric(a.value) - parseNumeric(b.value)) * dir;
                    return (parseNumeric(a.change) - parseNumeric(b.change)) * dir;
                });
                outRows = all ? sorted : sorted.slice(page * pageSize, page * pageSize + pageSize);
            }
        } else {
            outRows = result.rows;
            total = result.total;
        }

        if (format === "csv") {
            const header = "Metric,Value,Change";
            const body = outRows
                .map((r) => `${JSON.stringify(r.metric)},${JSON.stringify(r.value)},${JSON.stringify(r.change)}`)
                .join("\n");
            const csv = `${header}\n${body}`;
            const res = new NextResponse(csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Cache-Control": "no-store",
                    "Content-Disposition": `attachment; filename="table_${widgetId}.csv"`,
                },
            });
            res.headers.set("x-provenance", teamId || userId ? "live_or_empty" : (result ? "live" : "synthetic"));
            return res;
        }

        const provenance = teamId || userId ? (result ? "live" : "live") : (result ? "live" : "synthetic");
        return NextResponse.json(enforceProvenance({ rows: outRows, total, provenance }, { path: 'table-data' }), { status: 200 });
    } catch (err: unknown) {
        const message = typeof err === 'object' && err && 'message' in err ? (err as any).message : 'Unknown error';
        return NextResponse.json(enforceProvenance({ error: message, provenance: 'synthetic' }, { path: 'table-data', note: 'exception' }), { status: 500 });
    }
}
