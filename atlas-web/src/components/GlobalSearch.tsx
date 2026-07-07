import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  globalSearch,
  type GlobalSearchResult,
} from "../services/globalSearch.service";

function getResultIcon(type: GlobalSearchResult["type"]) {
  if (type === "repair") return "🔧";
  return "👤";
}

function getResultLabel(type: GlobalSearchResult["type"]) {
  if (type === "repair") return "Reparação";
  return "Cliente";
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let isCurrent = true;

    setIsSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const data = await globalSearch(cleanQuery);

        if (isCurrent) {
          setResults(data);
          setIsOpen(true);
        }
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  function clearSearch() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  const shouldShowPanel = isOpen && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm transition focus-within:border-cyan-400/70 focus-within:ring-2 focus-within:ring-cyan-400/10">
        <span className="text-slate-500">⌘</span>

        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          placeholder="Pesquisa global: cliente, telefone, NIF, máquina ou reparação..."
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          >
            Limpar
          </button>
        ) : (
          <span className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-600">
            Ctrl K
          </span>
        )}
      </div>

      {shouldShowPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
              Pesquisa Atlas
            </p>
          </div>

          {isSearching ? (
            <div className="px-4 py-5 text-sm text-slate-400">
              A procurar no Atlas...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto p-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={result.href}
                  onClick={clearSearch}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-slate-900"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg">
                    {getResultIcon(result.type)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-white">
                        {result.title}
                      </span>
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                        {getResultLabel(result.type)}
                      </span>
                    </span>

                    <span className="mt-1 block truncate text-sm text-slate-400">
                      {result.subtitle}
                    </span>
                  </span>

                  <span className="text-xs font-semibold text-cyan-300">
                    {result.meta}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5">
              <p className="text-sm font-semibold text-white">
                Nada encontrado.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tenta pesquisar por telefone, NIF, nº de reparação, cliente ou máquina.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
