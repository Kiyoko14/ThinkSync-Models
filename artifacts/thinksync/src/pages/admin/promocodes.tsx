import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPromocodesQuery, useCreateAdminPromocodeMutation, useUpdateAdminPromocodeMutation } from "@/lib/api/hooks";
import type { AdminPromocode } from "@/lib/types";

export default function AdminPromocodesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [editing, setEditing] = useState<AdminPromocode | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useAdminPromocodesQuery({ page, pageSize: 20, search, isActive });
  const createMutation = useCreateAdminPromocodeMutation();
  const updateMutation = useUpdateAdminPromocodeMutation();

  const emptyPromocode: Partial<AdminPromocode> = {
    code: "", description: "", discount_type: "percentage", discount_value: 0,
    max_uses: 100, max_uses_per_user: 1, min_package_price_cents: null,
    is_active: true, starts_at: null, expires_at: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promocodes</h1>
        <Button onClick={() => setCreating(true)}>Create Promocode</Button>
      </div>

      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search promocodes..." className="max-w-sm" />
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>Promocode Management</CardTitle></CardHeader>
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
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Max Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((pc) => (
                    <TableRow key={pc.id}>
                      <TableCell className="font-mono">{pc.code}</TableCell>
                      <TableCell>{pc.discount_type === "percentage" ? `${pc.discount_value}%` : `$${pc.discount_value}`}</TableCell>
                      <TableCell>{pc.current_uses}</TableCell>
                      <TableCell>{pc.max_uses}</TableCell>
                      <TableCell><Badge variant={pc.is_active ? "secondary" : "outline"}>{pc.is_active ? "active" : "inactive"}</Badge></TableCell>
                      <TableCell>{pc.expires_at ? new Date(pc.expires_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(pc)}>Edit</Button>
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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Promocode</DialogTitle></DialogHeader>
          <PromocodeForm promocode={emptyPromocode} onSubmit={(payload) => { createMutation.mutate(payload); setCreating(false); }} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Promocode</DialogTitle></DialogHeader>
          {editing && <PromocodeForm promocode={editing} onSubmit={(payload) => { updateMutation.mutate({ id: editing.id, payload }); setEditing(null); }} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromocodeForm({ promocode, onSubmit, onCancel }: { promocode: Partial<AdminPromocode>; onSubmit: (payload: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...promocode });

  return (
    <div className="grid gap-3">
      <div>
        <label className="text-sm font-medium">Code</label>
        <Input value={String(form.code ?? "")} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Discount Type</label>
          <select value={String(form.discount_type)} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Discount Value</label>
          <Input type="number" value={String(form.discount_value ?? 0)} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Max Uses</label>
          <Input type="number" value={String(form.max_uses ?? 0)} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Max Uses Per User</label>
          <Input type="number" value={String(form.max_uses_per_user ?? 0)} onChange={(e) => setForm({ ...form, max_uses_per_user: Number(e.target.value) })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Min Package Price (cents)</label>
        <Input type="number" value={String(form.min_package_price_cents ?? "")} onChange={(e) => setForm({ ...form, min_package_price_cents: e.target.value ? Number(e.target.value) : null })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Starts At</label>
          <Input type="datetime-local" value={String(form.starts_at ?? "")} onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })} />
        </div>
        <div>
          <label className="text-sm font-medium">Expires At</label>
          <Input type="datetime-local" value={String(form.expires_at ?? "")} onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })} />
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
