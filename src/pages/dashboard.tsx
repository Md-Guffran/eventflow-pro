import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { RefreshCw } from "lucide-react";

type Attendee = {
  id: string;
  name: string;
  email: string;
  type: string;
  lunch_day_1: boolean;
  lunch_day_2: boolean;
  dinner_day_1: boolean;
  dinner_day_2: boolean;
  kit: boolean;
  entrance: boolean;
  al_day_1: boolean;
  al_day_2: boolean;
  fl_day_1: boolean;
  fl_day_2: boolean;
  vl_day_1: boolean;
  vl_day_2: boolean;
};

type Activity = {
  id: number;
  timestamp: string;
  activity: string;
  attendees: { name: string } | null;
};

const Dashboard = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      alumni: "Alumni",
      faculty: "Faculty",
      volunteer: "Volunteer",
      student: "Student",
      press: "Press",
    };
    return labels[type] || type;
  };

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("attendees").select("*");
    if (error) {
      toast.error("Error fetching attendees.");
      console.error("Error fetching attendees:", error);
    } else {
      setAttendees(data as unknown as Attendee[]);
    }
    setLoading(false);
  }, []);

  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("id, timestamp, activity, attendees(name)")
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Error fetching activities.");
      console.error("Error fetching activities:", error);
    } else {
      setActivities(data as unknown as Activity[]);
    }
  }, []);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const adminSession = localStorage.getItem('adminSession');
      const adminSessionExpiry = localStorage.getItem('adminSessionExpiry');
      
      if (adminSession === 'true' && adminSessionExpiry && Date.now() < parseInt(adminSessionExpiry)) {
        setIsAdmin(true);
        fetchAttendees();
        fetchActivities();
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== import.meta.env.VITE_ADMIN_EMAIL) {
        toast.error("Access denied. Admins only.");
        navigate("/auth");
        return;
      }
      
      setIsAdmin(true);
      fetchAttendees();
      fetchActivities();
    };
  
    checkAdminAccess();

    const attendeesChannel = supabase
      .channel('attendees-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        (payload) => {
          console.log('Change received!', payload);
          toast.info("Attendee data changed, refreshing...");
          fetchAttendees();
        }
      )
      .subscribe();

    const activityChannel = supabase
      .channel('activity-log-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        () => {
          toast.info('New activity detected, refreshing feed.');
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendeesChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [navigate, fetchAttendees, fetchActivities]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(
      (attendee) =>
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendees, searchTerm]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAttendees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees");
    XLSX.writeFile(workbook, "attendees.xlsx");
    toast.success("Attendee data exported to Excel.");
  };

  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => a.entrance).length;
    const kitPickedUp = attendees.filter((a) => a.kit).length;
    const lunchDay1 = attendees.filter((a) => a.lunch_day_1).length;
    const lunchDay2 = attendees.filter((a) => a.lunch_day_2).length;
    const dinnerDay1 = attendees.filter((a) => a.dinner_day_1).length;
    const dinnerDay2 = attendees.filter((a) => a.dinner_day_2).length;
    const students = attendees.filter((a) => a.type === 'student').length;
    const press = attendees.filter((a) => a.type === 'press').length;
    return { total, checkedIn, kitPickedUp, lunchDay1, lunchDay2, dinnerDay1, dinnerDay2, students, press };
  }, [attendees]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button onClick={fetchAttendees} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToExcel}>Export to Excel</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.checkedIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kit Picked Up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.kitPickedUp}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Press</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.press}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lunch Day 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.lunchDay1}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lunch Day 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.lunchDay2}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dinner Day 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.dinnerDay1}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dinner Day 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.dinnerDay2}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  {/* <TableHead>Entrance</TableHead>
                  <TableHead>Kit</TableHead>
                  <TableHead>Lunch D1</TableHead>
                  <TableHead>Lunch D2</TableHead>
                  <TableHead>Dinner D1</TableHead>
                  <TableHead>Dinner D2</TableHead> */}
                  {/* <TableHead>AL D1</TableHead>
                  <TableHead>AL D2</TableHead>
                  <TableHead>FL D1</TableHead>
                  <TableHead>FL D2</TableHead>
                  <TableHead>VL D1</TableHead>
                  <TableHead>VL D2</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell>{attendee.name}</TableCell>
                    <TableCell>{attendee.email}</TableCell>
                    <TableCell>{getTypeLabel(attendee.type)}</TableCell>
                    {/* <TableCell>{attendee.entrance ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.kit ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.lunch_day_1 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.lunch_day_2 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.dinner_day_1 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.dinner_day_2 ? "✅" : "❌"}</TableCell> */}
                    {/* <TableCell>{attendee.al_day_1 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.al_day_2 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.fl_day_1 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.fl_day_2 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.vl_day_1 ? "✅" : "❌"}</TableCell>
                    <TableCell>{attendee.vl_day_2 ? "✅" : "❌"}</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{activity.attendees?.name || 'Unknown Attendee'}</p>
                      <p className="text-sm text-muted-foreground">{activity.activity.replace(/_/g, ' ')}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;