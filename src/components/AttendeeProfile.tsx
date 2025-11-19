import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Circle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendeeProfileProps {
  attendee: any;
  onBack: () => void;
}

const AttendeeProfile = ({ attendee: initialAttendee, onBack }: AttendeeProfileProps) => {
  const [attendee, setAttendee] = useState(initialAttendee);
  const [eventSettings, setEventSettings] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recentActions, setRecentActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEventSettings();
    const today = new Date().getDate();
    setCurrentDay(today === 21 ? 1 : today === 22 ? 2 : 1);
  }, []);

  const fetchEventSettings = async () => {
    const { data } = await supabase
      .from("event_settings")
      .select("*")
      .single();
    setEventSettings(data);
  };

  const handleAction = async (action: string, day: number) => {
    const actionKey = `${action}_day${day}`;
    
    // Check if action was recently performed (within 10 seconds)
    if (recentActions.has(actionKey)) {
      toast.error("Action was just performed - avoiding duplicate");
      return;
    }

    // Check if already done
    const fieldName = `day${day}_${action}`;
    if (attendee[fieldName]) {
      toast.error("Already completed - duplicate scan blocked");
      return;
    }

    // Check day lockout
    if (day === 1 && !eventSettings?.day1_enabled) {
      toast.error("Day 1 actions are closed");
      return;
    }
    if (day === 2 && !eventSettings?.day2_enabled) {
      toast.error("Day 2 actions are closed");
      return;
    }

    // Check kit rules
    if (action === "kit") {
      if (attendee.day1_kit || attendee.day2_kit) {
        toast.error("Kit already taken");
        return;
      }
    }

    setLoading(true);

    try {
      // Update attendee
      const { error: updateError } = await supabase
        .from("attendees")
        .update({ [fieldName]: true })
        .eq("id", attendee.id);

      if (updateError) throw updateError;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        attendee_id: attendee.attendee_id,
        action: fieldName,
        day,
        performed_by: user?.id,
      });

      // Update local state
      setAttendee({ ...attendee, [fieldName]: true });

      // Add to recent actions temporarily
      setRecentActions((prev) => new Set(prev).add(actionKey));
      setTimeout(() => {
        setRecentActions((prev) => {
          const next = new Set(prev);
          next.delete(actionKey);
          return next;
        });
      }, 10000);

      toast.success(`${action} marked!`, {
        icon: <CheckCircle2 className="w-4 h-4 text-success" />,
      });

      // Auto return to scanner after 2 seconds
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNormalizedAttendeeType = (type: string): string => {
    if (!type) return '';
    const lowerType = type.toLowerCase();
    const typeMap: Record<string, string> = {
      'al': 'alumni',
      'fl': 'faculty',
      'vl': 'volunteer',
      'stu': 'student',
      'pr': 'press',
    };
    return typeMap[lowerType] || lowerType;
  }

  const getAvailableActions = (attendeeType: string, day: number) => {
    const normalizedType = getNormalizedAttendeeType(attendeeType);
    const fullAccessTypes = ['alumni', 'faculty'];
    const limitedAccessTypes = ['volunteer', 'student', 'press'];
    
    if (fullAccessTypes.includes(normalizedType)) {
      const actions = ['entrance', 'lunch', 'kit'];
      if (day === 1) {
        actions.push('dinner');
      }
      return actions;
    } else if (limitedAccessTypes.includes(normalizedType)) {
      return ['entrance', 'lunch'];
    }
    
    return [];
  };
  
  const getTypeLabel = (type: string) => {
    const normalizedType = getNormalizedAttendeeType(type);
    const labels: Record<string, string> = {
      alumni: "Alumni",
      faculty: "Faculty", 
      volunteer: "Volunteer",
      student: "Student",
      press: "Press",
    };
    return labels[normalizedType] || normalizedType;
  };
  
  const getTypeBadgeVariant = (type: string) => {
    const normalizedType = getNormalizedAttendeeType(type);
    const variants: Record<string, any> = {
      alumni: "default",
      faculty: "secondary", 
      volunteer: "outline",
      student: "destructive",
      press: "warning",
    };
    return variants[normalizedType] || "default";
  };

  const ActionButton = ({ action, day, label }: any) => {
    const fieldName = `day${day}_${action}`;
    const isDone = attendee[fieldName];
    const isDayLocked = day === 1 ? !eventSettings?.day1_enabled : !eventSettings?.day2_enabled;
    const isKitTaken = action === "kit" && (attendee.day1_kit || attendee.day2_kit);

    return (
      <Button
        variant={isDone ? "outline" : "default"}
        className="w-full"
        onClick={() => handleAction(action, day)}
        disabled={loading || isDone || isDayLocked || isKitTaken}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
        ) : isDayLocked || isKitTaken ? (
          <XCircle className="w-4 h-4 mr-2 text-destructive" />
        ) : (
          <Circle className="w-4 h-4 mr-2" />
        )}
        {label}
        {isDayLocked && " (Closed)"}
        {isKitTaken && action === "kit" && " (Taken)"}
      </Button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Scanner
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{attendee.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{attendee.email}</p>
            </div>
            <Badge variant={getTypeBadgeVariant(attendee.type)} className="text-sm">
              {getTypeLabel(attendee.type)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Badge variant="secondary" className="font-mono">
              {attendee.qr_code}
            </Badge>
            <span className="text-sm text-muted-foreground">{attendee.phone}</span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Day 1 */}
        <Card className={!eventSettings?.day1_enabled ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Day 1 - April 21</span>
              {!eventSettings?.day1_enabled && (
                <Badge variant="destructive">Closed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getAvailableActions(attendee.type, 1).map((action) => (
              <ActionButton
                key={action}
                action={action}
                day={1}
                label={action.charAt(0).toUpperCase() + action.slice(1)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Day 2 */}
        <Card className={!eventSettings?.day2_enabled ? "opacity-60" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Day 2 - April 22</span>
              {!eventSettings?.day2_enabled && (
                <Badge variant="destructive">Closed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getAvailableActions(attendee.type, 2)
              .filter((action) => action !== "kit")
              .map((action) => (
                <ActionButton
                  key={action}
                  action={action}
                  day={2}
                  label={action.charAt(0).toUpperCase() + action.slice(1)}
                />
              ))}
            {getAvailableActions(attendee.type, 2).includes("kit") && (
              <>
                {!attendee.day1_kit && (
                  <ActionButton action="kit" day={2} label="Kit" />
                )}
                {attendee.day1_kit && (
                  <div className="text-sm text-muted-foreground text-center py-2 border rounded-lg">
                    Kit already taken on Day 1
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Day 1</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  {attendee.day1_entrance ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Entrance
                </li>
                <li className="flex items-center gap-2">
                  {attendee.day1_lunch ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Lunch
                </li>
                <li className="flex items-center gap-2">
                  {attendee.day1_dinner ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Dinner
                </li>
                <li className="flex items-center gap-2">
                  {attendee.day1_kit ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Kit
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Day 2</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  {attendee.day2_entrance ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Entrance
                </li>
                <li className="flex items-center gap-2">
                  {attendee.day2_lunch ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Lunch
                </li>
                <li className="flex items-center gap-2">
                  {attendee.day2_kit ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  Kit
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendeeProfile;