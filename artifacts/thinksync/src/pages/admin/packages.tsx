import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPackagesQuery, useCreateAdminPackageMutation, useUpdateAdminPackageMutation } from "@/lib/api/hooks";
import type { AdminPackage } from "@/lib/types";

export default function AdminPackagesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<AdminPackage | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useAdminPackagesQuery({ page, pageSize: 20, search, status });
  const createMutation = useCreateAdminPackageMutation();
  const updateMutation = useUpdateAdminPackageMutation();

  const emptyPackage: Partial<AdminPackage> = {
    name: "", description: "", token_amount: 0, bonus_tokens: 0,
    price_usd_cents: 0, display_price: "", is_featured: false, sort_order: 0, status: "active",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Packages</h1>
        <Button onClick={() => setCreating(true)}>Create Package</Button>
      </div>

      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packages..." className="max-w-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>Package Management</CardTitle></CardHeader>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>{pkg.name}</TableCell>
                      <TableCell>{pkg.display_price}</TableCell>
                      <TableCell>{pkg.token_amount.toLocaleString()}</TableCell>
                      <TableCell>{pkg.bonus_tokens.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={pkg.status === "active" ? "secondary" : "outline"}>{pkg.status}</Badge></TableCell>
                      <TableCell>{pkg.is_featured ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(pkg)}>Edit</Button>
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
          <DialogHeader><DialogTitle>Create Package</DialogTitle></DialogHeader>
          <PackageForm pkg={emptyPackage} onSubmit={(payload) => { createMutation.mutate(payload); setCreating(false); }} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Package</DialogTitle></DialogHeader>
          {editing && <PackageForm pkg={editing} onSubmit={(payload) => { updateMutation.mutate({ id: editing.id, payload }); setEditing(null); }} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageForm({ pkg, onSubmit, onCancel }: { pkg: Partial<AdminPackage>; onSubmit: (payload: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...pkg });

  return (
    <div className="grid gap-3">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Token Amount</label>
          <Input type="number" value={String(form.token_amount ?? 0)} onChange={(e) => setForm({ ...form, token_amount: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Bonus Tokens</label>
          <Input type="number" value={String(form.bonus_tokens ?? 0)} onChange={(e) => setForm({ ...form, bonus_tokens: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Price (USD cents)</label>
          <Input type="number" value={String(form.price_usd_cents ?? 0)} onChange={(e) => setForm({ ...form, price_usd_cents: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Display Price</label>
          <Input value={String(form.display_price ?? "")} onChange={(e) => setForm({ ...form, display_price: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Sort Order</label>
          <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <select value={String(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
        Featured
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Save</Button>
      </div>
    </div>
  );
}
