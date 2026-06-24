import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Clock, MessageCircle } from "lucide-react";

export default function DriverDetentionAlert({ load, stop }) {
  const [detention, setDetention] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [issueInProgress, setIssueInProgress] = useState(false);

  useEffect(() => {
    fetchDetention();
    const interval = setInterval(fetchDetention, 10000);
    return () => clearInterval(interval);
  }, [stop.id]);

  useEffect(() => {
    if (!detention || !detention.free_until) return;
    const timer = setInterval(() => {
      const now = new Date();
      const free = new Date(detention.free_until);
      const remaining = Math.max(0, Math.floor((free.getTime() - now.getTime()) / 60000));
      setTimeRemaining(remaining);
      
      // Alert driver when 10 minutes left
      if (remaining === 10 && detention.status === "free_wait") {
        alert("⏱️ Free wait time ending in 10 minutes — detention billing will begin!");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [detention?.free_until, detention?.status]);

  const fetchDetention = async () => {
    try {
      const detentions = await base44.entities.DetentionRecord.filter(
        { load_id: load.id, stop_id: stop.id },
        "-created_date",
        1
      );
      if (detentions.length > 0) {
        setDetention(detentions[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestDispatcherReview = async () => {
    setIssueInProgress(true);
    try {
      const user = await base44.auth.me();
      
      // Create notification for dispatcher
      await base44.entities.Notification.create({
        user_id: load.dispatcher_id,
        role: "dispatcher",
        title: "Driver Detention Review Request",
        message: `Driver ${user.full_name} requesting review of detention at Stop ${stop.stop_number}: ${stop.facility_name}`,
        type: "custom",
        priority: "high",
        related_entity_type: "DetentionRecord",
        related_entity_id: detention.id,
        delivery_channels: ["in_app"],
        action_url: `/loads/${load.id}`,
        cta_label: "Review",
      });

      // Update detention with dispute
      await base44.functions.invoke("detentionTimerEngine", {
        action: "dispute_detention",
        load_id: load.id,
        stop_id: stop.id,
        notes: "Driver requested review of detention circumstances",
        user_id: user.id,
      });

      await fetchDetention();
      alert("Request sent to dispatcher for review");
    } catch (err) {
      console.error(err);
      alert("Failed to send request");
    } finally {
      setIssueInProgress(false);
    }
  };

  if (!detention) return null;

  if (detention.status === "free_wait" && timeRemaining !== null) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
        <div className="flex gap-3">
          <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-blue-400 font-semibold text-sm">Free Wait Time Remaining</div>
            <div className="text-blue-300/90 text-sm mt-1">{timeRemaining} minutes left before detention billing starts</div>
            <div className="text-blue-200/70 text-xs mt-2">Rate: ${detention.rate_per_hour}/hour after free time</div>
          </div>
        </div>
      </div>
    );
  }

  if (detention.status === "active") {
    return (
      <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-4 mb-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-red-400 font-semibold text-sm">Detention Billing Active</div>
            <div className="text-red-300/90 text-sm mt-1">
              Billable Amount: <span className="font-bold">${detention.billable_amount.toFixed(2)}</span>
            </div>
            <div className="text-red-200/70 text-xs mt-2">{detention.billable_minutes} minutes billable at ${detention.rate_per_hour}/hour</div>
            
            <button
              onClick={requestDispatcherReview}
              disabled={issueInProgress}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Request Dispatcher Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}