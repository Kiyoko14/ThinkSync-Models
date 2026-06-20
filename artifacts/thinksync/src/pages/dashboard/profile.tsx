import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileQuery } from "@/lib/api/hooks";

export default function DashboardProfilePage() {
  const { data, isLoading, error } = useProfileQuery();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading ? <p>Loading profile...</p> : null}
          {error ? <p className="text-destructive">{(error as Error).message}</p> : null}
          {data && (
            <>
              <p><strong>ID:</strong> {data.id}</p>
              <p><strong>Email:</strong> {data.email}</p>
              <p><strong>Display name:</strong> {data.display_name ?? "-"}</p>
              <p><strong>Plan:</strong> {data.plan_tier}</p>
              <p><strong>Status:</strong> {data.is_active ? "active" : "inactive"}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
