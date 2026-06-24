import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Plus, Edit, User, Upload, CheckCircle, XCircle, PenTool,
  FileText, DollarSign, CheckSquare, XSquare, Eye, MessageSquare,
  Filter, ChevronDown, Loader2, Clock
} from "lucide-react";
import StatusBadge from "@/components/hasten/StatusBadge";

const ICON_MAP = {
  Plus: Plus,
  Edit: Edit,
  User: User,
  Upload: Upload,
  CheckCircle: CheckCircle,
  XCircle: XCircle,
  PenTool: PenTool,
  FileText: FileText,
  DollarSign: DollarSign,
  CheckSquare: CheckSquare,
  XSquare: XSquare,
  Eye: Eye,
  MessageSquare: MessageSquare,
  Clock: Clock
};

const COLOR_CLASS = {
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  green: "bg-green-500/15 text-green-400 border-green-500/25",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  red: "bg-red-500/15 text-red-400 border-red-500/25",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  slate: "bg-slate-500/15 text-slate-400 border-slate-500/25"
};

const ENTITY_ROUTES = {
  Load: (id) => `/loads/${id}`,
  Driver: (id) => `/drivers/${id}`,
  Truck: (id) => `/fleet/${id}`,
  Invoice: (id) => `/finance?invoice=${id}`,
  Document: (id) => `/documents?doc=${id}`,
  Message: (id) => `/messages?msg=${id}`,
  SupportTicket: (id) => `/support-tickets?ticket=${id}`
};

export default function ActivityFeed({ limit = 50, entityFilter = null }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Fetch timeline events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        let query = {};
        
        // Apply entity filter if specified
        if (entityFilter) {
          query.entityId = entityFilter;
        }

        const timelineEvents = await base44.entities.TimelineEvent.filter(
          query,
          '-timestamp',
          limit
        );

        setEvents(timelineEvents);
      } catch (error) {
        console.error('Failed to fetch timeline events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    const unsub = base44.entities.TimelineEvent.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        fetchEvents();
      }
    });

    return () => unsub();
  }, [limit, entityFilter]);

  // Filter events
  const filtered = events.filter(e => {
    if (selectedAction && e.action !== selectedAction) return false;
    if (selectedEntity && e.entityType !== selectedEntity) return false;
    return true;
  });

  // Get unique values for filters
  const actions = [...new Set(events.map(e => e.action))];
  const entities = [...new Set(events.map(e => e.entityType))];

  const getEntityRoute = (entityType, entityId) => {
    const routeFn = ENTITY_ROUTES[entityType];
    return routeFn ? routeFn(entityId) : null;
  };

  const TimelineItem = ({ event }) => {
    const Icon = ICON_MAP[event.icon] || Clock;
    const colorClass = COLOR_CLASS[event.color] || COLOR_CLASS.slate;
    const entityRoute = getEntityRoute(event.entityType, event.entityId);

    return (
      <div className="flex gap-4 pb-4 last:pb-0">
        {/* Timeline dot */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="w-0.5 h-8 bg-white/5 mt-2" />
        </div>

        {/* Content */}
        <div className="flex-1 pt-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">
                {entityRoute ? (
                  <Link to={entityRoute} className="hover:text-orange-400 transition-colors">
                    {event.summary}
                  </Link>
                ) : (
                  event.summary
                )}
              </div>
              {event.details && (
                <p className="text-slate-400 text-xs mt-1 line-clamp-2">{event.details}</p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="text-slate-500">
              {event.actorName || 'System'}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">
              {new Date(event.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span className="text-slate-700">•</span>
            <span className={`px-1.5 py-0.5 rounded border ${COLOR_CLASS[event.color] || COLOR_CLASS.slate}`}>
              {event.entityType}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      {!entityFilter && (
        <div className="flex items-center justify-between">
          <h2 className="text-white font-heading font-semibold">Activity Timeline</h2>
          <div className="flex gap-2">
            {/* Action filter */}
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors">
                <Filter className="w-3 h-3" />
                Action
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 min-w-40 bg-card border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                <button
                  onClick={() => setSelectedAction(null)}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${!selectedAction ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}
                >
                  All Actions
                </button>
                {actions.map(action => (
                  <button
                    key={action}
                    onClick={() => setSelectedAction(action)}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${selectedAction === action ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Entity filter */}
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors">
                <FileText className="w-3 h-3" />
                Entity
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 min-w-40 bg-card border border-white/5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                <button
                  onClick={() => setSelectedEntity(null)}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${!selectedEntity ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}
                >
                  All Types
                </button>
                {entities.map(entity => (
                  <button
                    key={entity}
                    onClick={() => setSelectedEntity(entity)}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-white/5 ${selectedEntity === entity ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}
                  >
                    {entity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="glass-card rounded-xl p-5 border border-white/5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(event => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}