import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, LogOut, Shield, User } from "lucide-react";
import QRScanner from "@/components/QRScanner";
import AttendeeProfile from "@/components/AttendeeProfile";
import RegistrationForm from "@/components/RegistrationForm";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

const Scanner = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [attendeeData, setAttendeeData] = useState<any>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendeeType, setAttendeeType] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminRole(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdminRole(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleQRScan = async (qrCode: string) => {
    setScannedQR(qrCode);
    setLoading(true);

    const qrPrefix = qrCode.split('-')[0].toUpperCase();
    let attendeeTypeFromQR: string | null = null;

    switch (qrPrefix) {
      case 'AL':
        attendeeTypeFromQR = 'alumni';
        break;
      case 'FL':
        attendeeTypeFromQR = 'faculty';
        break;
      case 'STU':
        attendeeTypeFromQR = 'student';
        break;
      case 'PR':
        attendeeTypeFromQR = 'press';
        break;
      case 'VL':
        attendeeTypeFromQR = 'volunteer';
        break;
      default:
        break;
    }
    
    setAttendeeType(attendeeTypeFromQR);

    try {
      const { data, error } = await supabase
        .from("attendees")
        .select("*")
        .eq("qr_code", qrCode)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAttendeeData(data);
        setShowRegistration(false);
      } else {
        setAttendeeData(null);
        setShowRegistration(true);
      }
    } catch (error: any) {
      toast.error("Error scanning QR: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToScanner = () => {
    setScannedQR(null);
    setAttendeeData(null);
    setShowRegistration(false);
    setAttendeeType(null);
  };

  const handleRegistrationComplete = () => {
    if (scannedQR) {
      handleQRScan(scannedQR);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Event Scanner</h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Admin Access" : "Volunteer"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!scannedQR ? (
          <QRScanner onScan={handleQRScan} />
        ) : showRegistration ? (
          <RegistrationForm
            qrCode={scannedQR}
            attendeeType={attendeeType}
            onBack={handleBackToScanner}
            onComplete={handleRegistrationComplete}
          />
        ) : attendeeData ? (
          <AttendeeProfile
            attendee={attendeeData}
            onBack={handleBackToScanner}
          />
        ) : null}
      </main>
    </div>
  );
};

export default Scanner;