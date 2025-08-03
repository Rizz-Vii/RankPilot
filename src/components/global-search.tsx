"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchOutput["results"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [placeholder, setPlaceholder] = useState(placeholderQueries[0]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    let nextPlaceholderTimeout: NodeJS.Timeout;

    const currentQuery = placeholderQueries[placeholderIndex];

    const typeNextCharacter = (text: string, index: number) => {
      if (index <= text.length) {
        setPlaceholder(text.substring(0, index));
        typingTimeout = setTimeout(
          () => typeNextCharacter(text, index + 1),
          80
        ); // Typing speed
      } else {
        // Wait for a bit before switching to the next placeholder
        nextPlaceholderTimeout = setTimeout(() => {
          setPlaceholderIndex(
            (prevIndex) => (prevIndex + 1) % placeholderQueries.length
          );
        }, 3000); // 3-second delay after typing finishes
      }
    };

    // Start typing the current placeholder
    const startTyping = setTimeout(
      () => typeNextCharacter(currentQuery, 0),
      500
    );

    // Cleanup function to clear timeouts
    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(nextPlaceholderTimeout);
      clearTimeout(startTyping);
    };
  }, [placeholderIndex]);

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
      } catch (_error) {
        console.error("Search failed:", _error);
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
              <div className="p-4 text-center text-muted-foreground">
                Keep typing to search...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
