import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import {
  listAttachments,
  deleteAttachment,
  formatFileSize,
  markdownLinkForAttachment,
  getAttachmentsDir,
  Attachment,
} from '@/lib/attachments';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { createDir } from '@/lib/file-system';
import * as Clipboard from 'expo-clipboard';
import { useT, t } from '@/lib/i18n';

type FilterType = 'all' | 'image' | 'audio' | 'video' | 'pdf';

const FILTER_TABS = (): { key: FilterType; label: string; icon: string }[] => [
  { key: 'all', label: t('phone.attachments.filterAll'), icon: 'grid-outline' },
  { key: 'image', label: t('phone.attachments.filterImages'), icon: 'image-outline' },
  { key: 'audio', label: t('phone.attachments.filterAudio'), icon: 'musical-notes-outline' },
  { key: 'video', label: t('phone.attachments.filterVideo'), icon: 'videocam-outline' },
  { key: 'pdf', label: 'PDF', icon: 'document-outline' },
];

const typeLabel = (type: Attachment['type']): string => {
  switch (type) {
    case 'image': return t('phone.attachments.typeImage');
    case 'audio': return t('phone.attachments.typeAudio');
    case 'video': return t('phone.attachments.typeVideo');
    case 'pdf': return 'PDF';
    default: return t('phone.attachments.typeOther');
  }
};

const TYPE_ICONS: Record<Attachment['type'], string> = {
  image: 'image-outline',
  audio: 'musical-notes-outline',
  video: 'videocam-outline',
  pdf: 'document-outline',
  other: 'attach-outline',
};

export default function AttachmentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const t = useT();
  const { vault } = useApp();

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const loadAttachments = useCallback(() => {
    if (!vault?.path) return;
    const list = listAttachments(vault.path);
    setAttachments(list);
    setLoading(false);
  }, [vault?.path]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const filtered = useMemo(() => {
    if (filter === 'all') return attachments;
    return attachments.filter((a) => a.type === filter);
  }, [attachments, filter]);

  const handleDelete = useCallback(
    (attachment: Attachment) => {
      Alert.alert(t('phone.attachments.deleteTitle'), t('phone.attachments.deleteMessage', { name: attachment.name }), [
        { text: t('phone.attachments.cancel'), style: 'cancel' },
        {
          text: t('phone.attachments.delete'),
          style: 'destructive',
          onPress: () => {
            deleteAttachment(attachment.path);
            if (previewAttachment?.path === attachment.path) {
              setPreviewAttachment(null);
            }
            loadAttachments();
          },
        },
      ]);
    },
    [previewAttachment, loadAttachments, t]
  );

  const handleCopyLink = useCallback(
    async (attachment: Attachment) => {
      if (!vault) return;
      const link = markdownLinkForAttachment(attachment, vault.path);
      try {
        await Clipboard.setStringAsync(link);
        Alert.alert(t('phone.attachments.copiedTitle'), t('phone.attachments.copiedMessage'));
      } catch {
        Alert.alert(t('phone.attachments.linkTitle'), link);
      }
    },
    [vault, t]
  );

  const handleImport = useCallback(async () => {
    if (!vault) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const attachDir = getAttachmentsDir(vault.path);
      createDir(attachDir);

      const destPath = `${attachDir.endsWith('/') ? attachDir : attachDir + '/'}${asset.name}`;
      const source = new ExpoFile(asset.uri);
      const dest = new ExpoFile(destPath);
      source.move(dest);

      loadAttachments();
    } catch (err) {
      Alert.alert(t('phone.attachments.errorTitle'), t('phone.attachments.importFailed'));
    }
  }, [vault, loadAttachments, t]);

  const handleTap = useCallback((attachment: Attachment) => {
    setPreviewAttachment(attachment);
  }, []);

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  // Preview mode
  if (previewAttachment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setPreviewAttachment(null)}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {previewAttachment.name}
          </Text>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={() => handleCopyLink(previewAttachment)}
            >
              <Ionicons name="link-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={() => handleDelete(previewAttachment)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.previewBody}>
          {previewAttachment.type === 'image' ? (
            <Image
              source={{ uri: previewAttachment.path }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.previewInfo}>
              <Ionicons
                name={TYPE_ICONS[previewAttachment.type] as any}
                size={64}
                color={colors.textMuted}
              />
              <Text style={styles.previewFileName}>
                {previewAttachment.name}
              </Text>
              <Text style={styles.previewMeta}>
                {typeLabel(previewAttachment.type).toUpperCase()} &middot;{' '}
                {formatFileSize(previewAttachment.size)}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // List mode
  return (
    <SafeAreaView style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS().map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={filter === tab.key ? colors.bgPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterTabText,
                filter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="attach-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('phone.attachments.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('phone.attachments.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.attachmentItem}
              onPress={() => handleTap(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              {item.type === 'image' ? (
                <Image
                  source={{ uri: item.path }}
                  style={styles.thumbnail}
                />
              ) : (
                <View style={styles.iconThumb}>
                  <Ionicons
                    name={TYPE_ICONS[item.type] as any}
                    size={24}
                    color={colors.accent}
                  />
                </View>
              )}
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.attachmentMeta}>
                  {formatFileSize(item.size)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyLinkBtn}
                onPress={() => handleCopyLink(item)}
              >
                <Ionicons name="link-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleImport}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.bgPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.bgTertiary,
    },
    filterTabActive: {
      backgroundColor: colors.accent,
    },
    filterTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTabTextActive: {
      color: colors.bgPrimary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.bgSecondary,
      borderRadius: 10,
      marginBottom: 6,
    },
    thumbnail: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.bgTertiary,
    },
    iconThumb: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.bgTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    attachmentInfo: {
      flex: 1,
    },
    attachmentName: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    attachmentMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    copyLinkBtn: {
      padding: 8,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    // Preview
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bgSecondary,
    },
    backBtn: {
      padding: 8,
      borderRadius: 8,
    },
    previewTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      paddingHorizontal: 8,
    },
    previewActions: {
      flexDirection: 'row',
      gap: 4,
    },
    previewActionBtn: {
      padding: 8,
      borderRadius: 8,
    },
    previewBody: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewInfo: {
      alignItems: 'center',
      gap: 12,
    },
    previewFileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    previewMeta: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
