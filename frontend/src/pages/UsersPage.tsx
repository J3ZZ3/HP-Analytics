import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, Copy, Check, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface CreatedUser {
  email: string;
  tempPassword: string;
  createdAt: string;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const special = "!@#$%&*";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  return pw;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Shield size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Only administrators can manage users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const tempPassword = generateTempPassword();

    try {
      await authApi.register(email, tempPassword);
      setCreatedUsers((prev) => [
        { email, tempPassword, createdAt: new Date().toLocaleString() },
        ...prev,
      ]);
      setEmail("");
      toast("success", `Account created for ${email}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
              ?.message
          : "Failed to create user";
      setError(msg || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials(idx: number, entry: CreatedUser) {
    const text = `Email: ${entry.email}\nTemporary Password: ${entry.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function togglePasswordVisibility(idx: number) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Create accounts for your team members
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={18} />
              Invite New User
            </CardTitle>
            <CardDescription>
              Enter the user's email to generate an account with a temporary
              password. Share the credentials securely so they can sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={18} />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <p>Enter the new user's email address and click Create Account.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <p>
                A temporary password is generated automatically. Copy the
                credentials using the button below.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <p>
                Share the credentials securely with the user (e.g. encrypted
                message, in person). They can sign in immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently created users */}
      {createdUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Created Accounts</CardTitle>
            <CardDescription>
              Credentials are only shown in this session. Copy and share them
              before leaving this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {createdUsers.map((entry, idx) => (
                <div
                  key={`${entry.email}-${entry.createdAt}`}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {entry.email}
                      </span>
                      <Badge variant="outline">user</Badge>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      <span>
                        {visiblePasswords.has(idx)
                          ? entry.tempPassword
                          : "••••••••••••"}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(idx)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {visiblePasswords.has(idx) ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {entry.createdAt}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCredentials(idx, entry)}
                    className="shrink-0"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={14} className="mr-1.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1.5" />
                        Copy Credentials
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
