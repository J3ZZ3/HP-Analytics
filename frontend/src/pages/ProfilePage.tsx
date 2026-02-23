import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingCart, DollarSign, Shield, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { analyticsApi } from "@/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["userSummary", days],
    queryFn: () => analyticsApi.userSummary(days),
  });

  const stats = [
    {
      label: "Total Views",
      value: summary?.views ?? 0,
      icon: Eye,
      color: "text-indigo-400",
    },
    {
      label: "Purchases",
      value: summary?.purchases ?? 0,
      icon: ShoppingCart,
      color: "text-emerald-400",
    },
    {
      label: "Total Spend",
      value: summary ? formatCurrency(summary.spend) : "$0.00",
      icon: DollarSign,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account and activity</p>
      </div>

      {/* User info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Role</p>
                <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                  {user?.role}
                </Badge>
              </div>
            </div>
            {user?.created_at && (
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity summary */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Activity Summary</h2>
        <Select value={days.toString()} onChange={(e) => setDays(Number(e.target.value))}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon size={28} className={stat.color} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
