import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/store/auth-store";

const apiClient = new ApiClient();

function useToken() {
  return useAuthStore((state) => state.token);
}

export function useHealthQuery() {
  return useQuery({ queryKey: queryKeys.health, queryFn: () => apiClient.health() });
}

export function useModelsQuery() {
  return useQuery({ queryKey: queryKeys.models, queryFn: () => apiClient.listModels() });
}

export function usePackagesQuery() {
  return useQuery({ queryKey: queryKeys.packages, queryFn: () => apiClient.listPackages() });
}

export function useProfileQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.profile, enabled: Boolean(token), queryFn: () => apiClient.getProfile(token as string) });
}

export function useStatsQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.stats, enabled: Boolean(token), queryFn: () => apiClient.getStats(token as string) });
}

export function useBalanceQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.balance, enabled: Boolean(token), queryFn: () => apiClient.getBalance(token as string) });
}

export function useUsageQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.usage, enabled: Boolean(token), queryFn: () => apiClient.getUsage(token as string) });
}

export function useTransactionsQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.transactions, enabled: Boolean(token), queryFn: () => apiClient.getTransactions(token as string) });
}

export function useApiKeysQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.apiKeys, enabled: Boolean(token), queryFn: () => apiClient.getApiKeys(token as string) });
}

export function useGenerateApiKeyMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; expiresInDays?: number }) => apiClient.generateApiKey(token as string, payload.name, payload.expiresInDays),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useRevokeApiKeyMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.revokeApiKey(token as string, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useRotateApiKeyMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.rotateApiKey(token as string, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

// Admin hooks
export function useAdminAnalyticsQuery() {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminAnalytics, enabled: Boolean(token), queryFn: () => apiClient.getAdminAnalytics(token as string) });
}

export function useAdminModelsQuery(params: { page: number; pageSize: number; search?: string; isActive?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminModels(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminModels(token as string, params) });
}

export function useCreateAdminModelMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createAdminModel(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

export function useUpdateAdminModelMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiClient.updateAdminModel(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

export function useAdminUsersQuery(params: { page: number; pageSize: number; search?: string; planTier?: string; isActive?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminUsers(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminUsers(token as string, params) });
}

export function useUpdateAdminUserMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiClient.updateAdminUser(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
}

export function useAdminTransactionsQuery(params: { page: number; pageSize: number; profileId?: string; transactionType?: string; status?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminTransactions(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminTransactions(token as string, params) });
}

export function useAdminPackagesQuery(params: { page: number; pageSize: number; search?: string; status?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminPackages(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminPackages(token as string, params) });
}

export function useCreateAdminPackageMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createAdminPackage(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPackages"] }),
  });
}

export function useUpdateAdminPackageMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiClient.updateAdminPackage(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPackages"] }),
  });
}

export function useAdminPromocodesQuery(params: { page: number; pageSize: number; search?: string; isActive?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminPromocodes(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminPromocodes(token as string, params) });
}

export function useCreateAdminPromocodeMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createAdminPromocode(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPromocodes"] }),
  });
}

export function useUpdateAdminPromocodeMutation() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiClient.updateAdminPromocode(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPromocodes"] }),
  });
}

export function useAdminLogsQuery(params: { page: number; pageSize: number; profileId?: string; modelSlug?: string; status?: string; search?: string }) {
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminLogs(params), enabled: Boolean(token), queryFn: () => apiClient.listAdminLogs(token as string, params) });
}
