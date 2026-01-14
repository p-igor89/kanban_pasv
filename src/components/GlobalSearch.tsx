'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, FileText, Calendar, Tag } from 'lucide-react';

interface SearchResult {
  id: string;
  board_id: string;
  board_name: string;
  status_id: string;
  status_name: string;
  title: string;
  description: string | null;
  priority: string | null;
  tags: string[];
  due_date: string | null;
  rank: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const dialogTitleId = useId();
  const listboxId = useId();

  const getOptionId = useCallback((index: number) => `search-option-${index}`, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSearched(false);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(`/boards/${result.board_id}?task=${result.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault();
          handleResultClick(results[activeIndex]);
        }
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(results.length - 1);
        break;
    }
  };

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 bg-black/50"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-2 sm:mx-4 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <label id={dialogTitleId} className="sr-only">
            Search tasks
          </label>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? getOptionId(activeIndex) : undefined}
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 text-lg"
          />
          {loading && (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden="true" />
          )}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!searched ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>Type at least 2 characters to search</p>
            </div>
          ) : loading ? (
            <div className="px-4 py-8 text-center" aria-live="polite" aria-busy="true">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" aria-hidden="true" />
              <span className="sr-only">Loading search results</span>
            </div>
          ) : results.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
              role="status"
              aria-live="polite"
            >
              <p>No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Search results"
              className="py-2"
            >
              {results.map((result, index) => (
                <div
                  key={result.id}
                  id={getOptionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full px-4 py-3 text-left transition-colors cursor-pointer ${
                    index === activeIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      {result.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {result.board_name} / {result.status_name}
                        </span>
                        {result.priority && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[result.priority]}`}
                          >
                            {result.priority}
                          </span>
                        )}
                        {result.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {new Date(result.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {result.tags.slice(0, 2).join(', ')}
                            {result.tags.length > 2 && ` +${result.tags.length - 2}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4"
          aria-hidden="true"
        >
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">↑↓</kbd> to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Enter</kbd> to
            select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
