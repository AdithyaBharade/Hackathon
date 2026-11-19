import { DatabaseIcon, ServerIcon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { useHealth } from "@/services/health/health.service";
import { useAuthStore } from "@/store/auth.store";

export function Home() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useHealth();

  const items = [
    { label: "API", icon: ServerIcon, value: isError ? "down" : data?.status },
    { label: "Database", icon: DatabaseIcon, value: data?.db },
    { label: "Redis", icon: ZapIcon, value: data?.redis },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name ?? ""}`} description="System status at a glance." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, icon: Icon, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4" /> {label}
              </CardDescription>
              <CardTitle>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <Badge variant={value === "ok" || value === "connected" ? "secondary" : "destructive"}>{value ?? "unknown"}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </>
  );
}
