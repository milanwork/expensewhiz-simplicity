
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Activity } from "../types";

interface ActivityLogProps {
  activities: Activity[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityLog({ activities, isOpen, onOpenChange }: ActivityLogProps) {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onOpenChange}
      className="bg-white rounded-lg shadow"
    >
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Log</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="border-b pb-4">
                  <div className="text-sm font-medium">{activity.activity_type}</div>
                  <div className="text-sm text-gray-600">{activity.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-sm text-gray-500 text-center">
                  No activities yet
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
