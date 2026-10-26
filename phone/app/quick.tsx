import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useT } from '@/lib/i18n';
import { fileMissing, writeFile } from '@/lib/file-system';
import { vaultFileUri } from '@/lib/sync-state';
import { quickNoteFolder, quickNoteName } from '@noteriv/core/quick-note';

/**
 * Quick note, as on the web (/quick): type, save, and the note is filed into a folder (Inbox by default) under a
 * name taken from its first line. Opened from the home screen's flash button, or from the app icon's shortcut
 * (`noteriv://quick`).
 */
export default function QuickNoteScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const { vault, refreshFiles, isLoading } = useApp();
  const [text, setText] = useState('');
  const [folder, setFolder] = useState('Inbox');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const save = useCallback(() => {
    if (!vault || !text.trim()) return;
    const dir = quickNoteFolder(folder);
    if (dir === null) {
      setMessage({ text: t('phone.quick.invalidFolder'), error: true });
      return;
    }
    const now = new Date();
    const stamp = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const base = quickNoteName(text, t('web.quick.fallbackName', { stamp }));
    const pathOf = (name: string) => (dir ? `${dir}/${name}` : name);
    let path = pathOf(`${base}.md`);
    for (let i = 2; !fileMissing(vaultFileUri(vault.path, path)); i++) path = pathOf(`${base} ${i}.md`);
    const uri = vaultFileUri(vault.path, path);
    if (!writeFile(uri, text)) {
      // The text stays in the box, so nothing typed is lost.
      setMessage({ text: t('web.quick.failed'), error: true });
      return;
    }
    refreshFiles();
    setText('');
    setSaved(uri);
    setMessage({ text: t('web.quick.saved', { path, time: now.toLocaleTimeString() }), error: false });
  }, [vault, text, folder, t, refreshFiles]);

  // Opened from the icon's shortcut on a cold start, the vault is still loading.
  if (isLoading) return <View style={[styles.container, { backgroundColor: colors.bgPrimary }]} />;
  if (!vault) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{t('web.quick.noVault')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TextInput
        style={[styles.text, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (message?.error) setMessage(null);
        }}
        placeholder={t('web.quick.placeholder')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={t('web.quick.text')}
        multiline
        autoFocus
        textAlignVertical="top"
      />
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('web.quick.folder')}</Text>
        <TextInput
          style={[styles.folder, { color: colors.textPrimary, backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
          value={folder}
          onChangeText={setFolder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {message && (
        <Text style={[styles.message, { color: message.error ? colors.red : colors.green }]}>{message.text}</Text>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: text.trim() ? 1 : 0.5 }]}
          onPress={save}
          disabled={!text.trim()}
        >
          <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>{t('web.quick.save')}</Text>
        </TouchableOpacity>
        {saved && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.bgTertiary }]}
            onPress={() => router.replace({ pathname: '/editor', params: { path: saved } })}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>{t('phone.quick.openNote')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  text: { flex: 1, minHeight: 160, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14 },
  folder: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  message: { fontSize: 13 },
  button: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
