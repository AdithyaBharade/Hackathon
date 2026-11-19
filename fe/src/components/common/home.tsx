import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealth } from "@/services/health/health.service";
import { useAuthStore } from "@/store/auth.store";

export function Home() {
  const user = useAuthStore((s) => s.user);
  const { data, isError } = useHealth();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {user?.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 text-sm">
        API: <Badge variant={isError ? "destructive" : "secondary"}>{isError ? "down" : data?.status ?? "..."}</Badge>
        DB: <Badge variant="secondary">{data?.db ?? "..."}</Badge>
        Redis: <Badge variant="secondary">{data?.redis ?? "..."}</Badge>
      </CardContent>
    </Card>
  );
}
