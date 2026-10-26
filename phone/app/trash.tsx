import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { listTrash, restoreFromTrash, deleteFile } from '@/lib/file-system';
import { useT } from '@/lib/i18n';

export default function TrashScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const t = useT();
  const { vault } = useApp();
  const [items, setItems] = useState(() => vault ? listTrash(vault.path) : []);

  const refresh = useCallback(() => {
    if (vault) setItems(listTrash(vault.path));
  }, [vault]);

  const handleRestore = useCallback((path: string, name: string) => {
    if (!vault) return;
    const ok = restoreFromTrash(path, vault.path);
    if (ok) {
      refresh();
    } else {
      Alert.alert(t('phone.trash.restoreFailedTitle'), t('phone.trash.restoreFailed', { name }));
    }
  }, [vault, refresh, t]);

  const handleDelete = useCallback((path: string, name: string) => {
    Alert.alert(t('phone.trash.deleteTitle'), t('phone.trash.deleteMessage', { name }), [
      { text: t('phone.trash.cancel'), style: 'cancel' },
      {
        text: t('phone.trash.delete'),
        style: 'destructive',
        onPress: () => { deleteFile(path); refresh(); },
      },
    ]);
  }, [refresh, t]);

  const handleEmptyTrash = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert(t('phone.trash.emptyTitle'), t('phone.trash.emptyMessage'), [
      { text: t('phone.trash.cancel'), style: 'cancel' },
      {
        text: t('phone.trash.emptyConfirm'),
        style: 'destructive',
        onPress: () => { items.forEach((i) => deleteFile(i.path)); refresh(); },
      },
    ]);
  }, [items, refresh, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('phone.trash.title')}</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyBtn}>
            <Text style={[styles.emptyText, { color: colors.red }]}>{t('phone.trash.empty')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trash-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyLabel, { color: colors.textMuted }]}>{t('phone.trash.isEmpty')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent + '20' }]}
                onPress={() => handleRestore(item.path, item.name)}
              >
                <Text style={[styles.actionText, { color: colors.accent }]}>{t('phone.trash.restore')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.red + '20' }]}
                onPress={() => handleDelete(item.path, item.name)}
              >
                <Text style={[styles.actionText, { color: colors.red }]}>{t('phone.trash.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  emptyBtn: { padding: 4 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyLabel: { fontSize: 16 },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  icon: { flexShrink: 0 },
  name: { flex: 1, fontSize: 15 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
