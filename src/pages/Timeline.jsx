import { useState } from "react";
import { Clock } from "lucide-react";
import ActivityFeed from "@/components/timeline/ActivityFeed";

export default function Timeline() {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Activity Timeline</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Complete history of all operational events across HASTEN
          </p>
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed limit={100} />
    </div>
  );
}