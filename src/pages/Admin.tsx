import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Download, Search } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventSettings, setEventSettings] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    alumni: 0,
    faculty: 0,
    volunteer: 0,
    other: 0,
    day1Entrance: 0,
    day2Entrance: 0,
    day1Lunch: 0,
    day2Lunch: 0,
    day1Dinner: 0,
    kits: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterAttendees();
  }, [searchQuery, attendees]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      toast.error("Admin access required");
      navigate("/scanner");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const fetchData = async () => {
    const [attendeesRes, settingsRes] = await Promise.all([
      supabase.from("attendees").select("*").order("created_at", { ascending: false }),
      supabase.from("event_settings").select("*").single(),
    ]);

    if (attendeesRes.data) {
      setAttendees(attendeesRes.data);
      calculateStats(attendeesRes.data);
    }

    if (settingsRes.data) {
      setEventSettings(settingsRes.data);
    }
  };

  const calculateStats = (data: any[]) => {
    setStats({
      total: data.length,
      alumni: data.filter((a) => a.type === "alumni").length,
      faculty: data.filter((a) => a.type === "faculty").length,
      volunteer: data.filter((a) => a.type === "volunteer").length,
      other: data.filter((a) => a.type === "other").length,
      day1Entrance: data.filter((a) => a.day1_entrance).length,
      day2Entrance: data.filter((a) => a.day2_entrance).length,
      day1Lunch: data.filter((a) => a.day1_lunch).length,
      day2Lunch: data.filter((a) => a.day2_lunch).length,
      day1Dinner: data.filter((a) => a.day1_dinner).length,
      kits: data.filter((a) => a.day1_kit || a.day2_kit).length,
    });
  };

  const filterAttendees = () => {
    if (!searchQuery.trim()) {
      setFilteredAttendees(attendees);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.phone.includes(query) ||
        a.attendee_id.toLowerCase().includes(query) ||
        a.qr_code.toLowerCase().includes(query)
    );
    setFilteredAttendees(filtered);
  };

  const toggleDaySetting = async (day: 1 | 2, enabled: boolean) => {
    const field = day === 1 ? "day1_enabled" : "day2_enabled";
    
    const { error } = await supabase
      .from("event_settings")
      .update({ [field]: enabled })
      .eq("id", eventSettings.id);

    if (error) {
      toast.error("Failed to update settings");
      return;
    }

    setEventSettings({ ...eventSettings, [field]: enabled });
    toast.success(`Day ${day} ${enabled ? "enabled" : "disabled"}`);
  };

  const exportCSV = () => {
    const headers = [
      "Attendee ID",
      "Type",
      "Name",
      "Email",
      "Phone",
      "QR Code",
      "Day1 Entrance",
      "Day1 Lunch",
      "Day1 Dinner",
      "Day1 Kit",
      "Day2 Entrance",
      "Day2 Lunch",
      "Day2 Kit",
    ];

    const rows = attendees.map((a) => [
      a.attendee_id,
      a.type,
      a.name,
      a.email,
      a.phone,
      a.qr_code,
      a.day1_entrance ? "Yes" : "No",
      a.day1_lunch ? "Yes" : "No",
      a.day1_dinner ? "Yes" : "No",
      a.day1_kit ? "Yes" : "No",
      a.day2_entrance ? "Yes" : "No",
      a.day2_lunch ? "Yes" : "No",
      a.day2_kit ? "Yes" : "No",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `attendees_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("CSV exported successfully");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/scanner")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Scanner
          </Button>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Event Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Event Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="day1">Day 1 (April 21)</Label>
              <Switch
                id="day1"
                checked={eventSettings?.day1_enabled}
                onCheckedChange={(checked) => toggleDaySetting(1, checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="day2">Day 2 (April 22)</Label>
              <Switch
                id="day2"
                checked={eventSettings?.day2_enabled}
                onCheckedChange={(checked) => toggleDaySetting(2, checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Attendees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Day 1 Entrance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.day1Entrance}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Day 2 Entrance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.day2Entrance}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kits Distributed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.kits}</div>
            </CardContent>
          </Card>
        </div>

        {/* Attendee List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendees</CardTitle>
              <Button onClick={exportCSV} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID, or QR code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{attendee.name}</span>
                      <Badge variant="outline">{attendee.attendee_id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{attendee.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{attendee.type}</Badge>
                    {(attendee.day1_entrance || attendee.day2_entrance) && (
                      <Badge variant="secondary">Checked In</Badge>
                    )}
                  </div>
                </div>
              ))}
              {filteredAttendees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No attendees found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
