import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search, Loader2, Package, Truck, Users, DollarSign,
  FileText, Building2, TicketCheck, ChevronRight, X
} from "lucide-react";
import { Link } from "react-router-dom";

const ENTITY_ICONS = {
  Load: { icon: Package, color: "cyan" },
  Driver: { icon: Users, color: "green" },
  Truck: { icon: Truck, color: "blue" },
  Invoice: { icon: DollarSign, color: "green" },
  Client: { icon: Building2, color: "orange" },
  Broker: { icon: Building2, color: "purple" },
  SupportTicket: { icon: TicketCheck, color: "red" },
  DriverDocument: { icon: FileText, color: "amber" },
  LoadDocument: { icon: FileText, color: "amber" }
};

const ENTITY_ROUTES = {
  Load: (id) => `/loads/${id}`,
  Driver: (id) => `/drivers/${id}`,
  Truck: (id) => `/fleet/${id}`,
  Invoice: (id) => `/finance?invoice=${id}`,
  Client: (id) => `/crm/${id}`,
  Broker: (id) => `/crm/${id}`,
  SupportTicket: (id) => `/support-tickets?ticket=${id}`,
  DriverDocument: (id) => `/driver/profile/documents?doc=${id}`,
  LoadDocument: (id) => `/documents?doc=${id}`
};

export default function GlobalSearch({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [entityFilter, setEntityFilter] = useState("all");
  const inputRef = useRef(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, entityFilter]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/functions/globalSearch?q=${encodeURIComponent(query)}&type=${entityFilter}&limit=15`
      );
      const data = await response.json();
      setResults(data.results || []);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      const result = results[selectedIndex];
      const url = ENTITY_ROUTES[result.entityType]?.(result.entityId);
      if (url) {
        window.location.href = url;
      }
    }
  };

  const ENTITY_TYPES = [
    { key: "all", label: "All" },
    { key: "Load", label: "Loads" },
    { key: "Driver", label: "Drivers" },
    { key: "Truck", label: "Trucks" },
    { key: "Invoice", label: "Invoices" },
    { key: "Client", label: "Clients" },
    { key: "Broker", label: "Brokers" },
    { key: "SupportTicket", label: "Support" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 pb-20 px-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass-card rounded-2xl border border-white/10 shadow-2xl">
        {/* Search Input */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search loads, drivers, trucks, invoices, clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none"
            />
            {loading && <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Entity Type Filters */}
          {query.trim().length >= 2 && (
            <div className="flex gap-1 flex-wrap mt-3">
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setEntityFilter(type.key)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    entityFilter === type.key
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {query.trim().length < 2 ? (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Type at least 2 characters to search</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Searching…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No results found for "{query}"</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
            {results.map((result, idx) => {
              const config = ENTITY_ICONS[result.entityType] || { icon: FileText, color: "slate" };
              const Icon = config.icon;
              const url = ENTITY_ROUTES[result.entityType]?.(result.entityId);
              const isSelected = idx === selectedIndex;

              return (
                <Link
                  key={`${result.entityType}-${result.entityId}`}
                  to={url || "#"}
                  onClick={(e) => {
                    if (!url) e.preventDefault();
                    onClose();
                  }}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${
                    isSelected ? "bg-orange-500/10 border-l-2 border-orange-500" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    config.color === "cyan" ? "bg-cyan-500/15 text-cyan-400" :
                    config.color === "green" ? "bg-green-500/15 text-green-400" :
                    config.color === "blue" ? "bg-blue-500/15 text-blue-400" :
                    config.color === "orange" ? "bg-orange-500/15 text-orange-400" :
                    config.color === "purple" ? "bg-purple-500/15 text-purple-400" :
                    config.color === "red" ? "bg-red-500/15 text-red-400" :
                    config.color === "amber" ? "bg-amber-500/15 text-amber-400" :
                    "bg-slate-500/15 text-slate-400"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {result.displayText}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {result.entityType}
                    </div>
                  </div>

                  {result.metadata?.primaryValue && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-slate-300 text-xs font-medium">
                        {result.metadata.primaryValue}
                      </div>
                      {result.metadata?.secondaryValue && (
                        <div className="text-slate-600 text-[10px]">
                          {result.metadata.secondaryValue}
                        </div>
                      )}
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="p-3 border-t border-white/5 text-center text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono">↑↓</kbd> to navigate,{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono">Enter</kbd> to open,{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono">Esc</kbd> to close
          </div>
        )}
      </div>
    </div>
  );
}