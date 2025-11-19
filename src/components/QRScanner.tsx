import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Keyboard } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
}

const QRScanner = ({ onScan }: QRScannerProps) => {
  const [manualCode, setManualCode] = useState("");
  const [useManual, setUseManual] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!useManual) {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success callback
          onScan(decodedText.trim().toUpperCase());
          scanner.clear();
        },
        (error) => {
          // Error callback - silent, no need to log every frame
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [useManual, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    } else {
      toast.error("Please enter a QR code");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Scan QR Code</CardTitle>
          <CardDescription>
            Point the camera at a QR code or enter it manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!useManual ? (
            <div className="space-y-4">
              <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setUseManual(true)}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Enter Code Manually
              </Button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrCode">QR Code</Label>
                <Input
                  id="qrCode"
                  placeholder="e.g., AL-001, FL-042, VL-015"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Scan Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUseManual(false)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="bg-accent/10 border-accent/20">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm">
            <p className="font-medium text-accent-foreground">Quick Tips:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• First scan registers new attendee</li>
              <li>• Subsequent scans show attendee profile</li>
              <li>• QR codes are unique to each attendee</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
