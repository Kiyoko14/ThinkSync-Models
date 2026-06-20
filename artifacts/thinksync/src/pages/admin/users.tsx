import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsersQuery, useUpdateAdminUserMutation } from "@/lib/api/hooks";
import type { AdminUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planTier, setPlanTier] = useState("all");
  const [isActive, setIsActive] = useState("all");
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const { data, isLoading, error } = useAdminUsersQuery({ page, pageSize: 20, search, planTier, isActive });
  const updateMutation = useUpdateAdminUserMutation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="max-w-sm" />
        <select value={planTier} onChange={(e) => setPlanTier(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : error ? (
            <p className="text-destructive">{(error as Error).message}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.display_name || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{user.plan_tier}</Badge></TableCell>
                      <TableCell><Badge variant={user.is_active ? "secondary" : "outline"}>{user.is_active ? "active" : "inactive"}</Badge></TableCell>
                      <TableCell>{user.balance}</TableCell>
                      <TableCell>${user.total_spent}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(user)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {data?.meta.total_pages ?? 1} ({data?.meta.total ?? 0} total)</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.meta.total_pages ?? 1)}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editing && (
            <UserForm user={editing} onSubmit={(payload) => { updateMutation.mutate({ id: editing.id, payload }); setEditing(null); }} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ user, onSubmit, onCancel }: { user: AdminUser; onSubmit: (payload: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({
    display_name: user.display_name || "",
    plan_tier: user.plan_tier,
    is_active: user.is_active,
    rate_limit_rpm: user.rate_limit_rpm || "",
    rate_limit_tpm: user.rate_limit_tpm || "",
  });

  return (
    <div className="grid gap-3">
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input value={user.email} disabled />
      </div>
      <div>
        <label className="text-sm font-medium">Display Name</label>
        <Input value={String(form.display_name ?? "")} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Plan Tier</label>
        <select value={String(form.plan_tier)} onChange={(e) => setForm({ ...form, plan_tier: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Rate Limit RPM</label>
          <Input type="number" value={String(form.rate_limit_rpm ?? "")} onChange={(e) => setForm({ ...form, rate_limit_rpm: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <label className="text-sm font-medium">Rate Limit TPM</label>
          <Input type="number" value={String(form.rate_limit_tpm ?? "")} onChange={(e) => setForm({ ...form, rate_limit_tpm: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Active
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Save</Button>
      </div>
    </div>
  );
}
