import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

function useApiClient() {
  const baseUrl = useSettingsStore((state) => state.apiBaseUrl);
  return useMemo(() => new ApiClient(baseUrl), [baseUrl]);
}

function useToken() {
  return useAuthStore((state) => state.token);
}

export function useHealthQuery() {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.health, queryFn: () => api.health() });
}

export function useModelsQuery() {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.models, queryFn: () => api.listModels() });
}

export function usePackagesQuery() {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.packages, queryFn: () => api.listPackages() });
}

export function useProfileQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.profile, enabled: Boolean(token), queryFn: () => api.getProfile(token as string) });
}

export function useStatsQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.stats, enabled: Boolean(token), queryFn: () => api.getStats(token as string) });
}

export function useBalanceQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.balance, enabled: Boolean(token), queryFn: () => api.getBalance(token as string) });
}

export function useUsageQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.usage, enabled: Boolean(token), queryFn: () => api.getUsage(token as string) });
}

export function useTransactionsQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.transactions, enabled: Boolean(token), queryFn: () => api.getTransactions(token as string) });
}

export function useApiKeysQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.apiKeys, enabled: Boolean(token), queryFn: () => api.getApiKeys(token as string) });
}

export function useGenerateApiKeyMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; expiresInDays?: number }) => api.generateApiKey(token as string, payload.name, payload.expiresInDays),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useRevokeApiKeyMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.revokeApiKey(token as string, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

export function useRotateApiKeyMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.rotateApiKey(token as string, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });
}

// Admin hooks
export function useAdminAnalyticsQuery() {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminAnalytics, enabled: Boolean(token), queryFn: () => api.getAdminAnalytics(token as string) });
}

export function useAdminModelsQuery(params: { page: number; pageSize: number; search?: string; isActive?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminModels(params), enabled: Boolean(token), queryFn: () => api.listAdminModels(token as string, params) });
}

export function useCreateAdminModelMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAdminModel(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

export function useUpdateAdminModelMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateAdminModel(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

export function useAdminUsersQuery(params: { page: number; pageSize: number; search?: string; planTier?: string; isActive?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminUsers(params), enabled: Boolean(token), queryFn: () => api.listAdminUsers(token as string, params) });
}

export function useUpdateAdminUserMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateAdminUser(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
}

export function useAdminTransactionsQuery(params: { page: number; pageSize: number; profileId?: string; transactionType?: string; status?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminTransactions(params), enabled: Boolean(token), queryFn: () => api.listAdminTransactions(token as string, params) });
}

export function useAdminPackagesQuery(params: { page: number; pageSize: number; search?: string; status?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminPackages(params), enabled: Boolean(token), queryFn: () => api.listAdminPackages(token as string, params) });
}

export function useCreateAdminPackageMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAdminPackage(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPackages"] }),
  });
}

export function useUpdateAdminPackageMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateAdminPackage(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPackages"] }),
  });
}

export function useAdminPromocodesQuery(params: { page: number; pageSize: number; search?: string; isActive?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminPromocodes(params), enabled: Boolean(token), queryFn: () => api.listAdminPromocodes(token as string, params) });
}

export function useCreateAdminPromocodeMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAdminPromocode(token as string, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPromocodes"] }),
  });
}

export function useUpdateAdminPromocodeMutation() {
  const api = useApiClient();
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateAdminPromocode(token as string, id, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminPromocodes"] }),
  });
}

export function useAdminLogsQuery(params: { page: number; pageSize: number; profileId?: string; modelSlug?: string; status?: string; search?: string }) {
  const api = useApiClient();
  const token = useToken();
  return useQuery({ queryKey: queryKeys.adminLogs(params), enabled: Boolean(token), queryFn: () => api.listAdminLogs(token as string, params) });
}
