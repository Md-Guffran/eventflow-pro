import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, Shield } from "lucide-react";

const ADMIN_KEY = "45789";
const ADMIN_PASSWORD = "admin123";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [name, setName] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [adminKeyVerified, setAdminKeyVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      // Store admin session in localStorage
      localStorage.setItem('adminSession', 'true');
      localStorage.setItem('adminEmail', 'admin@eventflow.com');
      localStorage.setItem('adminSessionExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString()); // 24 hours
      
      toast.success("Admin login successful!");
      navigate("/dashboard");
    } else {
      toast.error("Invalid admin password. Please try again.");
    }
  };

  const handleAdminKeyVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === ADMIN_KEY) {
      setAdminKeyVerified(true);
      toast.success("Admin key verified! You can now create an account.");
    } else {
      toast.error("Invalid admin key. Please try again.");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/scanner");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/scanner`,
          },
        });

        if (error) throw error;
        toast.success("Account created! Logging you in...");
        navigate("/scanner");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Event Management</CardTitle>
          <CardDescription>
            {isAdminLogin
              ? "Admin Login"
              : isLogin
              ? "Sign in to access the system"
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processing..." : "Login as Admin"}
              </Button>
            </form>
          ) : isLogin || adminKeyVerified ? (
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminKeyVerification} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <Label htmlFor="adminKey" className="text-primary font-semibold">
                    Admin Key Required
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter the admin key to proceed with account creation
                </p>
                <Input
                  id="adminKey"
                  type="password"
                  placeholder="Enter admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Verify Admin Key
              </Button>
            </form>
          )}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                if (isAdminLogin) {
                  setIsAdminLogin(false);
                } else {
                  setIsLogin(!isLogin);
                  setAdminKey("");
                  setAdminKeyVerified(false);
                }
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isAdminLogin
                ? "Back to User Login"
                : isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
            {!isAdminLogin && (
              <button
                type="button"
                onClick={() => setIsAdminLogin(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
              >
                Login as Admin
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;