import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { readFile, writeFile, listAllMarkdownFiles } from '@/lib/file-system';
import type { AiMessage } from '@noteriv/core/ai-types';

interface MobileAiConfig {
  providerType: 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'relay';
  apiKey: string;
  model: string;
  endpointUrl: string;
}

const DEFAULT_CONFIG: MobileAiConfig = {
  providerType: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-flash',
  endpointUrl: 'https://generativelanguage.googleapis.com/v1beta',
};

const STORAGE_KEY = '@noteriv_mobile_ai_config';

const createMsg = (role: 'user' | 'assistant' | 'system', content: string): AiMessage => ({
  id: Math.random().toString(36).substring(2, 9),
  role,
  content,
  createdAt: Date.now(),
});
export default function AiChatScreen() {
  const router = useRouter();
  const { filePath: paramFilePath, vaultPath: paramVaultPath } = useLocalSearchParams<{
    filePath?: string;
    vaultPath?: string;
  }>();

  const { colors } = useTheme();
  const { vault, currentFile, content: activeContent } = useApp();

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<MobileAiConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);

  // Note context
  const activeFilePath = paramFilePath || currentFile;
  const [attachedNote, setAttachedNote] = useState<{ path: string; name: string } | null>(() => {
    if (activeFilePath) {
      const name = activeFilePath.split('/').pop() || activeFilePath;
      return { path: activeFilePath, name };
    }
    return null;
  });

  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load config from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setConfig(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const saveConfig = async (newConfig: MobileAiConfig) => {
    setConfig(newConfig);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setShowSettings(false);
  };

  // Perform Local Mobile Tool Execution
  const executeLocalTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
    const vPath = paramVaultPath || vault?.path;
    if (!vPath) return 'Lỗi: Chưa mở vault nào.';

    try {
      if (name === 'list_notes') {
        const files = await listAllMarkdownFiles(vPath);
        return JSON.stringify(files.map((f) => ({ path: f.relativePath, name: f.fileName })));
      }
      if (name === 'read_note') {
        const notePath = String(args.path || '');
        const fullPath = notePath.startsWith(vPath) ? notePath : `${vPath}/${notePath.replace(/^\/+/, '')}`;
        const text = await readFile(fullPath);
        return text !== null ? text : `Lỗi: Không tìm thấy ghi chú ${notePath}`;
      }
      if (name === 'create_note') {
        const notePath = String(args.path || '');
        const content = String(args.content || '');
        const fullPath = notePath.startsWith(vPath) ? notePath : `${vPath}/${notePath.replace(/^\/+/, '')}`;
        const ok = writeFile(fullPath, content);
        return ok ? `Đã tạo ghi chú thành công: ${notePath}` : `Lỗi: Không thể ghi file ${notePath}`;
      }
      if (name === 'search_notes') {
        const query = String(args.query || '').toLowerCase();
        const files = await listAllMarkdownFiles(vPath);
        const matches: { path: string; snippet: string }[] = [];
        for (const f of files.slice(0, 30)) {
          const text = await readFile(f.filePath);
          if (text && text.toLowerCase().includes(query)) {
            const idx = text.toLowerCase().indexOf(query);
            const snippet = text.substring(Math.max(0, idx - 40), Math.min(text.length, idx + 80));
            matches.push({ path: f.relativePath, snippet });
          }
        }
        return JSON.stringify(matches);
      }
      return `Công cụ ${name} không được hỗ trợ trên thiết bị di động.`;
    } catch (err: unknown) {
      return `Lỗi khi thực thi công cụ ${name}: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    if (!config.apiKey && config.providerType !== 'ollama' && config.providerType !== 'relay') {
      Alert.alert('Cần cấu hình API Key', 'Vui lòng nhấn vào biểu tượng bánh răng để nhập API Key hoặc chọn Relay Server.');
      setShowSettings(true);
      return;
    }

    // Build context
    let contextHeader = '';
    if (attachedNote) {
      let noteText = '';
      if (attachedNote.path === currentFile && activeContent) {
        noteText = activeContent;
      } else {
        const read = await readFile(attachedNote.path);
        if (read) noteText = read;
      }
      if (noteText) {
        contextHeader = `[Đang xem ghi chú: ${attachedNote.name}]\n\`\`\`markdown\n${noteText.slice(0, 4000)}\n\`\`\`\n\n`;
      }
    }

    const userMessage = createMsg('user', trimmed);

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);

    const assistantMsgIndex = newMessages.length;
    setMessages((prev) => [...prev, createMsg('assistant', '')]);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      if (config.providerType === 'relay') {
        // Send to Relay Server (Desktop or Web server hosting Claude Code / OpenAI Codex)
        const endpoint = config.endpointUrl || 'http://localhost:3457';
        const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'Bạn là Noteriv AI Assistant trên mobile. Hỗ trợ người dùng tra cứu, đọc, viết ghi chú.' },
              ...newMessages.slice(-6).map((m, idx) => ({
                role: m.role,
                content: idx === newMessages.slice(-6).length - 1 ? contextHeader + m.content : m.content,
              })),
            ],
          }),
          signal: abortCtrl.signal,
        });

        if (!res.ok) {
          throw new Error(`Relay server trả về mã lỗi: ${res.status}`);
        }

        const data = await res.json();
        const reply = data.reply || data.content || '(Không nhận được phản hồi)';
        setMessages((prev) => {
          const next = [...prev];
          next[assistantMsgIndex] = { ...next[assistantMsgIndex], content: reply };
          return next;
        });
      } else if (config.providerType === 'gemini') {
        // Direct Gemini API
        const modelName = config.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;

        const promptText = contextHeader + trimmed;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...newMessages.slice(0, -1).map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
              })),
              { role: 'user', parts: [{ text: promptText }] },
            ],
          }),
          signal: abortCtrl.signal,
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Gemini API Error: ${res.status} - ${errBody}`);
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '(Không có nội dung trả về)';
        setMessages((prev) => {
          const next = [...prev];
          next[assistantMsgIndex] = { ...next[assistantMsgIndex], content: reply };
          return next;
        });
      } else {
        // OpenAI / Compatible API (Ollama, DeepSeek, OpenRouter)
        const baseUrl = config.endpointUrl || 'https://api.openai.com/v1';
        const model = config.model || (config.providerType === 'ollama' ? 'llama3' : 'gpt-4o-mini');

        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'Bạn là Noteriv AI Assistant trên mobile. Hỗ trợ người dùng tra cứu, đọc, viết ghi chú.' },
              ...newMessages.slice(-6).map((m, idx) => ({
                role: m.role,
                content: idx === newMessages.slice(-6).length - 1 ? contextHeader + m.content : m.content,
              })),
            ],
          }),
          signal: abortCtrl.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API Error: ${res.status} - ${errText}`);
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '(Không có nội dung trả về)';
        setMessages((prev) => {
          const next = [...prev];
          next[assistantMsgIndex] = { ...next[assistantMsgIndex], content: reply };
          return next;
        });
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) => {
          const next = [...prev];
          next[assistantMsgIndex] = { ...next[assistantMsgIndex], content: `⚠️ Lỗi: ${errorMsg}` };
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Active context bar */}
      {attachedNote && (
        <View style={styles.contextBar}>
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={styles.contextText} numberOfLines={1}>
            Ngữ cảnh: {attachedNote.name}
          </Text>
          <TouchableOpacity onPress={() => setAttachedNote(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles" size={48} color={colors.accent} style={{ opacity: 0.6, marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Noteriv AI Assistant</Text>
            <Text style={styles.emptySubtitle}>
              Hỏi đáp, tóm tắt, viết tiếp hoặc phân tích các ghi chú trong vault của bạn.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.messageBubbleWrapper, isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper]}>
              <View
                style={[
                  styles.messageBubble,
                  isUser ? [styles.userBubble, { backgroundColor: colors.accent }] : [styles.assistantBubble, { backgroundColor: colors.bgTertiary, borderColor: colors.border }],
                ]}
              >
                <Text style={[styles.messageText, { color: isUser ? '#ffffff' : colors.textPrimary }]}>
                  {item.content || (isGenerating ? 'Đang suy nghĩ...' : '')}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={[styles.inputContainer, { backgroundColor: colors.bgSecondary, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => setShowSettings(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Nhập câu hỏi hoặc yêu cầu..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            editable={!isGenerating}
          />

          {isGenerating ? (
            <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.red }]} onPress={handleStop}>
              <Ionicons name="stop" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: input.trim() ? colors.accent : colors.border }]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cài đặt AI Assistant</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nhà cung cấp (Provider):</Text>
              <View style={styles.providerRow}>
                {(['gemini', 'openai', 'ollama', 'relay'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.providerChip,
                      { borderColor: config.providerType === p ? colors.accent : colors.border },
                      config.providerType === p && { backgroundColor: `${colors.accent}20` },
                    ]}
                    onPress={() => setConfig((prev) => ({ ...prev, providerType: p }))}
                  >
                    <Text style={[styles.chipText, { color: config.providerType === p ? colors.accent : colors.textPrimary }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {config.providerType !== 'relay' && config.providerType !== 'ollama' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>API Key:</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                    value={config.apiKey}
                    onChangeText={(val) => setConfig((prev) => ({ ...prev, apiKey: val }))}
                    placeholder="sk-..."
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              )}

              {config.providerType === 'relay' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Relay Server URL:</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                    value={config.endpointUrl}
                    onChangeText={(val) => setConfig((prev) => ({ ...prev, endpointUrl: val }))}
                    placeholder="http://192.168.1.100:3457"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>
                    Dùng gói Claude Pro / ChatGPT Plus chạy trên máy tính desktop cùng mạng LAN.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tên Model:</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.textPrimary, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                    value={config.model}
                    onChangeText={(val) => setConfig((prev) => ({ ...prev, model: val }))}
                    placeholder={config.providerType === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={() => saveConfig(config)}
              >
                <Text style={styles.saveBtnText}>Lưu cài đặt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
}) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    contextBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.bgSecondary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 6,
    },
    contextText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    messagesContainer: {
      padding: 14,
      gap: 12,
      flexGrow: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      marginTop: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    messageBubbleWrapper: {
      flexDirection: 'row',
      marginVertical: 2,
    },
    userBubbleWrapper: {
      justifyContent: 'flex-end',
    },
    assistantBubbleWrapper: {
      justifyContent: 'flex-start',
    },
    messageBubble: {
      maxWidth: '85%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 16,
    },
    userBubble: {
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      borderBottomLeftRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    settingsIconBtn: {
      padding: 6,
    },
    input: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 8,
      fontSize: 14,
      maxHeight: 100,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalBody: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 6,
      marginTop: 10,
    },
    providerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    providerChip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      marginBottom: 6,
    },
    hintText: {
      fontSize: 11,
      lineHeight: 15,
      marginBottom: 10,
    },
    saveBtn: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
    },
    saveBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
