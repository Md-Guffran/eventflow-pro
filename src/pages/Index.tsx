import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Users, Shield, CheckCircle2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <QrCode className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              Event Management System
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              QR-based attendance, meal tracking, and kit distribution for your 2-day college event
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
                Get Started
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/scanner")}>
                Go to Scanner
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">QR Scanning</h3>
                <p className="text-sm text-muted-foreground">
                  Fast and accurate QR code scanning for instant attendee lookup and registration
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg">Spot Registration</h3>
                <p className="text-sm text-muted-foreground">
                  Register new attendees on-the-spot with automatic ID generation (AL, FL, VL, OT)
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-lg">Smart Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track entrance, meals, and kit distribution with intelligent duplicate prevention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Info */}
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Role-Based Access
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Volunteers Can:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Scan QR codes</li>
                    <li>• Register new attendees</li>
                    <li>• Mark attendance and meals</li>
                    <li>• Distribute kits</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Admins Can:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Everything volunteers can do</li>
                    <li>• View dashboard and analytics</li>
                    <li>• Control day 1/2 lockouts</li>
                    <li>• Export attendee data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
