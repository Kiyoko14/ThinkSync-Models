import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiClient } from "@/lib/api";

function ModelCard({ model }: { model: any }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {model.id}
        </Text>
        <View style={[styles.badge, { backgroundColor: model.active ? "#22c55e20" : "#ef444420" }]}>
          <Text style={[styles.badgeText, { color: model.active ? colors.success : colors.destructive }]}>
            {model.active ? "active" : "inactive"}
          </Text>
        </View>
      </View>
      <Text style={[styles.provider, { color: colors.mutedForeground }]}>{model.owned_by}</Text>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {model.context_window?.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Context</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {model.max_output_tokens?.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Max Output</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            ${model.pricing_input_per_m}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Input/1M</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            ${model.pricing_output_per_m}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Output/1M</Text>
        </View>
      </View>
    </View>
  );
}

export default function ModelsScreen() {
  const colors = useColors();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["models"],
    queryFn: () => apiClient.listModels(),
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ModelCard model={item} />}
        ListHeaderComponent={
          <Text style={[styles.header, { color: colors.foreground }]}>AI Models</Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>Failed to load models</Text>
          ) : (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>No models available</Text>
          )
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 17,
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
  provider: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  empty: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});
