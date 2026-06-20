import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiClient } from "@/lib/api";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

function TransactionRow({ item }: { item: any }) {
  const colors = useColors();
  return (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txType, { color: colors.foreground }]}>{item.transaction_type}</Text>
        <Text style={[styles.txDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {item.description || "No description"}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.amount >= 0 ? colors.success : colors.destructive }]}>
          {item.amount >= 0 ? "+" : ""}{item.amount}
        </Text>
        <Text style={[styles.txStatus, { color: colors.mutedForeground }]}>{item.status}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { token, profile, logout, isAdmin } = useAuth();
  const queryClient = useQueryClient();

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

  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: () => apiClient.getUsage(token!),
    enabled: !!token,
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiClient.getTransactions(token!),
    enabled: !!token,
  });

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
    balanceQuery.refetch();
    usageQuery.refetch();
    transactionsQuery.refetch();
  }, [profileQuery, statsQuery, balanceQuery, usageQuery, transactionsQuery]);

  const isLoading = profileQuery.isLoading || statsQuery.isLoading || balanceQuery.isLoading;

  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Sign in to view your profile</Text>
        <Pressable style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.content}>
        <Text style={[styles.header, { color: colors.foreground }]}>Profile</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.display_name || profile?.email || "?")[0].toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile?.display_name || "User"}
            </Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email}</Text>
            <View style={[styles.planBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.planText, { color: colors.secondaryForeground }]}>{profile?.plan_tier || "free"}</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {balanceQuery.data?.total_available ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Available</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {statsQuery.data?.total_requests ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Requests</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {statsQuery.data?.total_tokens ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tokens</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                ${(usageQuery.data?.total_cost_usd ?? 0).toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Cost</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transactions</Text>
        {transactionsQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
        ) : transactionsQuery.data?.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No transactions yet</Text>
        ) : (
          <View style={[styles.txList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {transactionsQuery.data?.map((item) => (
              <TransactionRow key={item.id} item={item} />
            ))}
          </View>
        )}

        <Pressable
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          onPress={async () => {
            await logout();
            router.replace("/");
          }}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  planBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  planText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
  },
  txList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  txLeft: {
    flex: 1,
  },
  txType: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  txDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txStatus: {
    fontSize: 11,
    marginTop: 2,
    textTransform: "capitalize",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  cta: {
    marginTop: 16,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
