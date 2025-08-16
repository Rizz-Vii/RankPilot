"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from '@/lib/i18n/internationalization-system';
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchFeatures } from "@/ai/flows/search";
import type { SearchOutput } from "@/ai/flows/search";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";

const placeholderQueries = [
  "Audit my competitor's site...",
  "Find keywords for 'vertical farming'...",
  "How can I improve my homepage title?",
  "Analyze my blog post for SEO...",
  "Show me my backlink profile",
  "Generate a content brief for 'AI ethics'",
];

// Small internal hook to cycle/animate placeholder text deterministically.
// Typing speed and pause replicates prior inline effect (80ms per char, 3s pause, 500ms initial delay).
function useRotatingPlaceholder(queries: string[], typingMs = 80, pauseMs = 3000, initialDelay = 500) {
  const [placeholder, setPlaceholder] = useState(() => queries[0] || "");
  const indexRef = useRef(0);
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout | null = null;
    let nextPlaceholderTimeout: NodeJS.Timeout | null = null;
    let startTypingTimeout: NodeJS.Timeout | null = null;

    const typeNextCharacter = (text: string, i: number) => {
      if (i <= text.length) {
        setPlaceholder(text.substring(0, i));
        typingTimeout = setTimeout(() => typeNextCharacter(text, i + 1), typingMs);
      } else {
        nextPlaceholderTimeout = setTimeout(() => {
          indexRef.current = (indexRef.current + 1) % queries.length;
          scheduleTyping();
        }, pauseMs);
      }
    };

    const scheduleTyping = () => {
      const current = queries[indexRef.current] || "";
      startTypingTimeout = setTimeout(() => typeNextCharacter(current, 0), 0);
    };

    // Maintain initial delay for first cycle to replicate original UX.
    startTypingTimeout = setTimeout(() => scheduleTyping(), initialDelay);

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (nextPlaceholderTimeout) clearTimeout(nextPlaceholderTimeout);
      if (startTypingTimeout) clearTimeout(startTypingTimeout);
    };
  }, [queries, typingMs, pauseMs, initialDelay]);
  return placeholder;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const { translate } = useI18n();
  const tr = (k: string, fallback: string) => { const v = translate(k); return v === k ? fallback : v; };
  const [results, setResults] = useState<SearchOutput["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const placeholder = useRotatingPlaceholder(placeholderQueries, 80, 3000, 500);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < 3) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await searchFeatures({ query: debouncedQuery });
        setResults(response.results);
        // store history (dedupe & cap 10) - debounced write
        setHistory(prev => {
          const next = [debouncedQuery, ...prev.filter(q => q !== debouncedQuery)].slice(0,10);
          return next;
        });
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rp_search_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Debounced write of history
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem('rp_search_history', JSON.stringify(history)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [history]);

  return (
    <div className="relative" ref={searchContainerRef}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-8 sm:w-[200px] lg:w-[300px] bg-background transition-all duration-300 ease-in-out focus:w-[300px] lg:focus:w-[400px]"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
      />
  <AnimatePresence>
        {isFocused && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full lg:w-[400px] bg-card border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {isLoading && (
              <div className="p-4 flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!isLoading && results.length > 0 && (
              <ul className="py-2">
                {results.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        setIsFocused(false);
                        setQuery("");
                      }}
                      className="block w-full px-4 py-2 text-left hover:bg-accent"
                    >
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading &&
              results.length === 0 &&
              debouncedQuery.length >= 3 && (
                <div className="p-4 text-center text-muted-foreground">
                  No results found for "{debouncedQuery}".
                </div>
              )}
            {!isLoading && debouncedQuery.length < 3 && query.length > 0 && (
              <div className="p-4 text-center text-muted-foreground space-y-3">
                <div>Keep typing to search...</div>
                {history.length > 0 && (
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs uppercase tracking-wide">{tr('globalSearch.recent','Recent')}</div>
                      <button
                        type="button"
                        onClick={() => { setHistory([]); localStorage.removeItem('rp_search_history'); }}
                        className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        aria-label={tr('globalSearch.clearRecent','Clear recent searches')}
                      >{tr('globalSearch.clear','Clear')}</button>
                    </div>
                    <ul className="space-y-1">
                      {history.map(h => (
                        <li key={h}>
                          <button
                            type="button"
                            onClick={() => { setQuery(h); setIsFocused(true); }}
                            className="w-full text-left px-2 py-1 rounded hover:bg-accent text-sm"
                          >{h}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
