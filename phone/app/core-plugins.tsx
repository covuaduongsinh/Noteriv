import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useCorePlugins } from '@/context/CorePluginsContext';
import { CORE_PLUGINS, corePluginLabels, corePluginText } from '@/lib/core-plugins';

export default function CorePluginsScreen() {
  const { colors } = useTheme();
  const { isEnabled, setEnabled } = useCorePlugins();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleToggle = (id: string, enabled: boolean) => {
    setSaveError(null);
    setEnabled(id, enabled).catch((err) => {
      setSaveError(`${corePluginLabels.saveFailed}: ${err instanceof Error ? err.message : String(err)}`);
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{corePluginLabels.intro}</Text>
      {saveError && <Text style={[styles.error, { color: colors.red }]}>{saveError}</Text>}
      {CORE_PLUGINS.map((plugin) => {
        const { name, description } = corePluginText(plugin.id);
        const on = isEnabled(plugin.id);
        return (
          <View
            key={plugin.id}
            style={[styles.card, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
          >
            <View style={styles.cardBody}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
              {!plugin.onPhone && (
                <Text style={[styles.note, { color: colors.textMuted }]}>{corePluginLabels.notOnPhone}</Text>
              )}
            </View>
            <Switch
              value={on}
              onValueChange={(value) => handleToggle(plugin.id, value)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.textPrimary}
              accessibilityLabel={name}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  error: { fontSize: 13, marginBottom: 12 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardBody: { flex: 1, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  note: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
});
