"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalLink,
  Heading1,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import React from "react";

export type SeoSource = {
  url: string;
  firstH1?: string;
  externalAnchors: Array<{ href: string; text: string }>;
  missingAltSamples: string[];
};

export interface SeoSourcesPanelProps {
  sources?: SeoSource[];
}

const SeoSourcesPanel: React.FC<SeoSourcesPanelProps> = ({ sources }) => {
  const items = sources || [];
  return (
    <Card data-testid="panel-seo-sources">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <LinkIcon className="h-4 w-4" /> SEO Sources
          <Badge
            variant="secondary"
            className="ml-1"
            aria-label={`sources count ${items.length}`}
          >
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Run an analysis to populate provenance of headings, anchors, and
            images.
          </p>
        )}
        {items.slice(0, 6).map((s, idx) => (
          <div key={idx} className="rounded border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="truncate text-sm font-medium text-primary hover:underline"
                title={s.url}
              >
                {s.url}
              </a>
              <ExternalLink
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            {s.firstH1 && (
              <div
                className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
                title={s.firstH1}
              >
                <Heading1 className="h-3 w-3" />
                <span className="truncate">H1: “{s.firstH1}”</span>
              </div>
            )}
            {s.externalAnchors?.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  External Anchors
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {s.externalAnchors.slice(0, 6).map((a, i) => (
                    <li
                      key={i}
                      className="text-xs truncate flex items-center gap-1"
                      title={`${a.text} → ${a.href}`}
                    >
                      <LinkIcon
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <a
                        className="truncate hover:underline"
                        href={a.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {a.text || a.href}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.missingAltSamples?.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  Images Missing Alt
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {s.missingAltSamples.slice(0, 4).map((src, i) => (
                    <li
                      key={i}
                      className="text-xs truncate flex items-center gap-1"
                      title={src}
                    >
                      <ImageIcon
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SeoSourcesPanel;
