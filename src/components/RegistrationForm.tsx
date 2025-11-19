import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface RegistrationFormProps {
  qrCode: string;
  onBack: () => void;
  onComplete: () => void;
}

const RegistrationForm = ({ qrCode, onBack, onComplete }: RegistrationFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "alumni" as "alumni" | "faculty" | "volunteer" | "other",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get next attendee ID
      const { data: attendeeId, error: idError } = await supabase
        .rpc("get_next_attendee_id", { attendee_type: formData.type });

      if (idError) throw idError;

      // Create attendee
      const { error: insertError } = await supabase
        .from("attendees")
        .insert({
          attendee_id: attendeeId,
          type: formData.type,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          qr_code: qrCode,
          assigned: true,
        });

      if (insertError) throw insertError;

      toast.success(`Registration complete! ID: ${attendeeId}`);
      onComplete();
    } catch (error: any) {
      toast.error("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Scanner
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">New Attendee</CardTitle>
          <CardDescription>
            Register a new attendee with QR: <span className="font-mono font-bold text-foreground">{qrCode}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Attendee Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumni">Alumni (AL-XXX)</SelectItem>
                  <SelectItem value="faculty">Faculty (FL-XXX)</SelectItem>
                  <SelectItem value="volunteer">Volunteer (VL-XXX)</SelectItem>
                  <SelectItem value="other">Others (OT-XXX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Complete Registration"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBack}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationForm;
