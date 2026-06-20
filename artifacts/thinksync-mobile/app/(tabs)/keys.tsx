import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiClient } from "@/lib/api";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

function KeyCard({ keyItem }: { keyItem: any }) {
  const colors = useColors();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showRaw, setShowRaw] = useState(false);

  const revokeMutation = useMutation({
    mutationFn: () => apiClient.revokeApiKey(token!, keyItem.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  const handleRevoke = () => {
    Alert.alert("Revoke API Key", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => revokeMutation.mutate(),
      },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.name, { color: colors.foreground }]}>{keyItem.name || "API Key"}</Text>
        <View style={[styles.badge, { backgroundColor: keyItem.status === "active" ? "#22c55e20" : "#ef444420" }]}>
          <Text style={[styles.badgeText, { color: keyItem.status === "active" ? colors.success : colors.destructive }]}>
            {keyItem.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.prefix, { color: colors.mutedForeground }]}>{keyItem.key_prefix}...</Text>
      {keyItem.raw_key && (
        <>
          <Pressable onPress={() => setShowRaw(!showRaw)}>
            <Text style={[styles.rawToggle, { color: colors.primary }]}>
              {showRaw ? "Hide" : "Show"} raw key
            </Text>
          </Pressable>
          {showRaw && (
            <Text style={[styles.rawKey, { color: colors.foreground }]} selectable>
              {keyItem.raw_key}
            </Text>
          )}
        </>
      )}
      {keyItem.status === "active" && (
        <Pressable style={[styles.revokeBtn, { borderColor: colors.destructive }]} onPress={handleRevoke}>
          <Feather name="trash-2" size={14} color={colors.destructive} />
          <Text style={[styles.revokeText, { color: colors.destructive }]}>Revoke</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function KeysScreen() {
  const colors = useColors();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const keysQuery = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => apiClient.getApiKeys(token!),
    enabled: !!token,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateApiKey(token!, newKeyName.trim() || "Mobile Key"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setNewKeyName("");
      setShowForm(false);
    },
  });

  const onRefresh = useCallback(() => keysQuery.refetch(), [keysQuery]);

  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Sign in to manage API keys</Text>
        <Pressable style={[styles.cta, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={keysQuery.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <KeyCard keyItem={item} />}
        ListHeaderComponent={
          <View style={{ paddingBottom: 16 }}>
            <Text style={[styles.header, { color: colors.foreground }]}>API Keys</Text>
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(!showForm)}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.addText, { color: colors.primaryForeground }]}>Generate Key</Text>
            </Pressable>

            {showForm && (
              <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Key name"
                  placeholderTextColor={colors.mutedForeground}
                  value={newKeyName}
                  onChangeText={setNewKeyName}
                />
                <Pressable
                  style={[styles.createBtn, { backgroundColor: colors.primary }]}
                  onPress={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.createText, { color: colors.primaryForeground }]}>Create</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          keysQuery.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>No API keys yet</Text>
          )
        }
        refreshControl={<RefreshControl refreshing={keysQuery.isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginBottom: 16,
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  createBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    fontSize: 16,
    fontWeight: "600",
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
  prefix: {
    fontSize: 13,
    marginTop: 6,
  },
  rawToggle: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  rawKey: {
    fontSize: 13,
    marginTop: 6,
    fontFamily: "monospace",
  },
  revokeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
  },
  revokeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
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
});
