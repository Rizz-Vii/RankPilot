// Admin component for user tier migration
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { identifyAndCorrectUserTiers } from "@/lib/user-tier-migration";


export default function AdminTierMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const runMigration = async (): Promise<void> => {
    setIsRunning(true);
    setMigrationComplete(false);
    setLogs([]);

    // Capture originals here so we can always restore them in finally
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    try {
      // Capture console output into an array for UI display
      const capturedLogs: string[] = [];

      (console as any).log = (...args: any[]): void => {
        const message = args.join(" ");
        capturedLogs.push(`[LOG] ${message}`);
        setLogs([...capturedLogs]);
        originalLog.apply(console, args);
      };

      (console as any).warn = (...args: any[]): void => {
        const message = args.join(" ");
        capturedLogs.push(`[WARN] ${message}`);
        setLogs([...capturedLogs]);
        originalWarn.apply(console, args);
      };

      (console as any).error = (...args: any[]): void => {
        const message = args.join(" ");
        capturedLogs.push(`[ERROR] ${message}`);
        setLogs([...capturedLogs]);
        originalError.apply(console, args);
      };

      await identifyAndCorrectUserTiers();

      setMigrationComplete(true);
    } catch (error) {
      // Use original error logger to avoid relying on overridden console
      originalError("Migration failed:", error);
    } finally {
      // Restore original console methods and stop spinner
      (console as any).log = originalLog;
      (console as any).warn = originalWarn;
      (console as any).error = originalError;
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            User Tier Migration
          </CardTitle>
          <CardDescription>
            Identify and correct outdated subscription tiers (starter →
            professional, agency → enterprise)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
              {isRunning ? "Running Migration..." : "Run Tier Migration"}
            </Button>

            {migrationComplete && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Migration Complete
              </Badge>
            )}
          </div>

          {logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Migration Logs:</h4>
              <div className="bg-muted rounded-md p-3 max-h-96 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`${
                        log.includes("[ERROR]")
                          ? "text-destructive"
                          : log.includes("[WARN]")
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Tier Migration Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Old Tier Names:</h4>
              <div className="space-y-1">
                <Badge variant="outline">starter → agency</Badge>
                <Badge variant="outline">agency → enterprise</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Valid Tiers:</h4>
              <div className="space-y-1">
                <Badge variant="secondary">free</Badge>
                <Badge variant="secondary">agency ($49/mo)</Badge>
                <Badge variant="secondary">enterprise ($149/mo)</Badge>
              </div>
            </div>
          </div>

      <div className="p-3 bg-primary/10 dark:bg-primary/15 rounded-md">
            <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
        <div className="text-sm text-primary dark:text-primary/80">
                <p className="font-medium">What this migration does:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Scans all users in the database</li>
                  <li>
                    Identifies users with outdated tier names (starter, agency)
                  </li>
                  <li>
                    Updates their subscriptionTier field to the new naming
                  </li>
                  <li>Preserves all other subscription data</li>
                  <li>Adds migration metadata for audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
