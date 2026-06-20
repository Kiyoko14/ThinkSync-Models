import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminModelsQuery, useCreateAdminModelMutation, useUpdateAdminModelMutation } from "@/lib/api/hooks";
import type { AdminModel } from "@/lib/types";

export default function AdminModelsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [editing, setEditing] = useState<AdminModel | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useAdminModelsQuery({ page, pageSize: 20, search, isActive });
  const createMutation = useCreateAdminModelMutation();
  const updateMutation = useUpdateAdminModelMutation();

  const emptyModel: Partial<AdminModel> = {
    slug: "", provider_model_id: "", provider_name: "", display_name: "", description: "",
    pricing_input_per_m: 0, pricing_output_per_m: 0, supports_streaming: false, supports_functions: false,
    is_active: true, context_window: 0, max_output_tokens: 0, sort_order: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Models</h1>
        <Button onClick={() => setCreating(true)}>Create Model</Button>
      </div>

      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models..." className="max-w-sm" />
        <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>Model Management</CardTitle></CardHeader>
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
                    <TableHead>Slug</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-mono text-xs">{model.slug}</TableCell>
                      <TableCell>{model.display_name}</TableCell>
                      <TableCell>{model.provider_name}</TableCell>
                      <TableCell><Badge variant={model.is_active ? "secondary" : "outline"}>{model.is_active ? "active" : "inactive"}</Badge></TableCell>
                      <TableCell>${model.pricing_input_per_m}</TableCell>
                      <TableCell>${model.pricing_output_per_m}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(model)}>Edit</Button>
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

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Model</DialogTitle></DialogHeader>
          <ModelForm model={emptyModel} onSubmit={(payload) => { createMutation.mutate(payload); setCreating(false); }} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Model</DialogTitle></DialogHeader>
          {editing && <ModelForm model={editing} onSubmit={(payload) => { updateMutation.mutate({ id: editing.id, payload }); setEditing(null); }} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModelForm({ model, onSubmit, onCancel }: { model: Partial<AdminModel>; onSubmit: (payload: Record<string, unknown>) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...model });

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input value={String(form.slug ?? "")} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Provider Model ID</label>
          <Input value={String(form.provider_model_id ?? "")} onChange={(e) => setForm({ ...form, provider_model_id: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Display Name</label>
        <Input value={String(form.display_name ?? "")} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input value={String(form.description ?? "")} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Provider Name</label>
          <Input value={String(form.provider_name ?? "")} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Sort Order</label>
          <Input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Input Price (/1M)</label>
          <Input type="number" step="0.01" value={String(form.pricing_input_per_m ?? 0)} onChange={(e) => setForm({ ...form, pricing_input_per_m: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Output Price (/1M)</label>
          <Input type="number" step="0.01" value={String(form.pricing_output_per_m ?? 0)} onChange={(e) => setForm({ ...form, pricing_output_per_m: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Context Window</label>
          <Input type="number" value={String(form.context_window ?? 0)} onChange={(e) => setForm({ ...form, context_window: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-sm font-medium">Max Output Tokens</label>
          <Input type="number" value={String(form.max_output_tokens ?? 0)} onChange={(e) => setForm({ ...form, max_output_tokens: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.supports_streaming} onChange={(e) => setForm({ ...form, supports_streaming: e.target.checked })} />
          Streaming
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.supports_functions} onChange={(e) => setForm({ ...form, supports_functions: e.target.checked })} />
          Functions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Save</Button>
      </div>
    </div>
  );
}
