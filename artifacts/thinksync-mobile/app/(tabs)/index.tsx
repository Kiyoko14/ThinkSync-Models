import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiClient } from "@/lib/api";
import { router } from "expo-router";

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: color || colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, profile, isAdmin } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient.getProfile(token!),
    enabled: !!token,
  });

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => apiClient.getStats(token!),
    enabled: !!token,
  });

  const balanceQuery = useQuery({
    queryKey: ["balance"],
    queryFn: () => apiClient.getBalance(token!),
    enabled: !!token,
  });

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: () => apiClient.listModels(),
  });

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
    balanceQuery.refetch();
    modelsQuery.refetch();
  }, [profileQuery, statsQuery, balanceQuery, modelsQuery]);

  const isLoading = profileQuery.isLoading || statsQuery.isLoading || balanceQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 24 }}>
            <Text style={[styles.header, { color: colors.foreground }]}>ThinkSync</Text>
            <Text style={[styles.subHeader, { color: colors.mutedForeground }]}>
              {profile?.display_name || profile?.email || "AI API Gateway"}
            </Text>

            {!token && (
              <View style={styles.guestSection}>
                <Text style={[styles.guestText, { color: colors.mutedForeground }]}>
                  Sign in to view your dashboard and manage API keys
                </Text>
                <Pressable
                  style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/login")}
                >
                  <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign In</Text>
                </Pressable>
              </View>
            )}

            {token && (
              <>
                {isLoading ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
                ) : (
                  <View style={styles.statsGrid}>
                    <StatCard
                      label="Available"
                      value={String(balanceQuery.data?.total_available ?? 0)}
                      color={colors.success}
                    />
                    <StatCard label="Requests" value={String(statsQuery.data?.total_requests ?? 0)} />
                    <StatCard label="Tokens" value={String(statsQuery.data?.total_tokens ?? 0)} />
                    <StatCard label="Plan" value={profile?.plan_tier || "free"} />
                  </View>
                )}
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>
              Available Models
            </Text>
            {modelsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
            ) : modelsQuery.error ? (
              <Text style={[styles.error, { color: colors.destructive }]}>Failed to load models</Text>
            ) : (
              <View style={styles.modelsList}>
                {modelsQuery.data?.map((model) => (
                  <View key={model.id} style={[styles.modelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.modelHeader}>
                      <Text style={[styles.modelName, { color: colors.foreground }]} numberOfLines={1}>
                        {model.id}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: model.active ? "#22c55e20" : "#ef444420" }]}>
                        <Text style={[styles.badgeText, { color: model.active ? colors.success : colors.destructive }]}>
                          {model.active ? "active" : "inactive"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.modelMeta, { color: colors.mutedForeground }]}>
                      {model.owned_by} · {model.context_window.toLocaleString()} tokens
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isLoading && !!token} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 34,
    fontWeight: "700",
  },
  subHeader: {
    fontSize: 16,
    marginTop: 4,
  },
  guestSection: {
    marginTop: 24,
    gap: 16,
  },
  guestText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ctaButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  modelsList: {
    gap: 12,
  },
  modelCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modelMeta: {
    fontSize: 13,
    marginTop: 6,
  },
  error: {
    fontSize: 14,
    marginTop: 12,
  },
});
