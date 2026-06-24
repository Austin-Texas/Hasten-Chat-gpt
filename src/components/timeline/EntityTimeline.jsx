import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Edit, User, Upload, CheckCircle, XCircle, PenTool,
  FileText, DollarSign, CheckSquare, XSquare, Eye, MessageSquare,
  ChevronDown, ChevronUp, Loader2, Clock
} from "lucide-react";

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
  orange: "bg-orange-500/15 text-orange-400",
  green: "bg-green-500/15 text-green-400",
  blue: "bg-blue-500/15 text-blue-400",
  red: "bg-red-500/15 text-red-400",
  amber: "bg-amber-500/15 text-amber-400",
  purple: "bg-purple-500/15 text-purple-400",
  cyan: "bg-cyan-500/15 text-cyan-400",
  slate: "bg-slate-500/15 text-slate-400"
};

export default function EntityTimeline({ entityId, entityType, compact = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const timelineEvents = await base44.entities.TimelineEvent.filter(
          { entityId },
          '-timestamp',
          50
        );
        setEvents(timelineEvents);
      } catch (error) {
        console.error('Failed to fetch entity timeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    const unsub = base44.entities.TimelineEvent.subscribe((event) => {
      if (event.data?.entityId === entityId) {
        fetchEvents();
      }
    });

    return () => unsub();
  }, [entityId]);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-xs">No events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-slate-300 text-xs font-semibold">History</span>
          <span className="text-slate-600 text-[10px]">{events.length}</span>
        </div>
        {compact && (
          expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Events */}
      {expanded && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {events.slice(0, compact ? 5 : 20).map(event => {
            const Icon = ICON_MAP[event.icon] || Clock;
            const colorClass = COLOR_CLASS[event.color] || COLOR_CLASS.slate;

            return (
              <div key={event.id} className="flex gap-2 px-2 py-1.5 hover:bg-white/3 rounded transition-colors">
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-[11px] font-medium leading-tight truncate">
                    {event.summary}
                  </p>
                  <p className="text-slate-600 text-[10px] mt-0.5">
                    {new Date(event.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {events.length > 5 && compact && (
            <p className="text-center text-slate-600 text-[10px] py-1">
              +{events.length - 5} more events
            </p>
          )}
        </div>
      )}
    </div>
  );
}