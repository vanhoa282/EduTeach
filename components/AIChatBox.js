import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { sendMessage } from '../lib/ai/chat';
import { getLocalMessages, fetchCloudMessages, clearLocalMessages, deleteCloudMessages } from '../lib/ai/storage';
import { buildUserContext } from '../lib/ai/context';

// ============ LATEX → UNICODE ============
function convertLatex(text) {
  if (!text) return text;
  let t = text;
  t = t.replace(/\$\$/g, '').replace(/\$/g, '');
  t = t.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '$1√$2');
  t = t.replace(/\\sqrt\{([^}]+)\}/g, '√$1');
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  t = t.replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β');
  t = t.replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ');
  t = t.replace(/\\Delta/g, 'Δ').replace(/\\epsilon/g, 'ε');
  t = t.replace(/\\theta/g, 'θ').replace(/\\lambda/g, 'λ');
  t = t.replace(/\\mu/g, 'μ').replace(/\\pi/g, 'π');
  t = t.replace(/\\sigma/g, 'σ').replace(/\\Sigma/g, 'Σ');
  t = t.replace(/\\phi/g, 'φ').replace(/\\omega/g, 'ω');
  t = t.replace(/\\Omega/g, 'Ω');
  t = t.replace(/\\times/g, '×').replace(/\\div/g, '÷');
  t = t.replace(/\\pm/g, '±').replace(/\\mp/g, '∓');
  t = t.replace(/\\cdot/g, '·');
  t = t.replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥');
  t = t.replace(/\\ne(q)?/g, '≠').replace(/\\approx/g, '≈');
  t = t.replace(/\\equiv/g, '≡').replace(/\\infty/g, '∞');
  t = t.replace(/\\sum/g, '∑').replace(/\\int/g, '∫');
  t = t.replace(/\\partial/g, '∂');
  t = t.replace(/\\rightarrow|\\to/g, '→').replace(/\\leftarrow/g, '←');
  t = t.replace(/\\Rightarrow/g, '⇒').replace(/\\Leftarrow/g, '⇐');
  t = t.replace(/\\Leftrightarrow|\\iff/g, '⇔');
  t = t.replace(/\\in/g, '∈').replace(/\\notin/g, '∉');
  t = t.replace(/\\subset/g, '⊂').replace(/\\cup/g, '∪').replace(/\\cap/g, '∩');
  t = t.replace(/\\forall/g, '∀').replace(/\\exists/g, '∃');
  t = t.replace(/\\angle/g, '∠').replace(/\\degree/g, '°');
  t = t.replace(/\\perp/g, '⊥').replace(/\\parallel/g, '∥').replace(/\\triangle/g, '△');
  const sup = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','+':'⁺','-':'⁻','a':'ᵃ','b':'ᵇ','i':'ⁱ','x':'ˣ','y':'ʸ'};
  t = t.replace(/\^\{([^}]+)\}/g, (_, e) => e.split('').map(c => sup[c] || c).join(''));
  t = t.replace(/\^([0-9n+\-abixy])/g, (_, e) => sup[e] || '^' + e);
  const sub = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ','i':'ᵢ','j':'ⱼ','n':'ₙ'};
  t = t.replace(/_\{([^}]+)\}/g, (_, s) => s.split('').map(c => sub[c] || c).join(''));
  t = t.replace(/_([0-9ijnaexo+\-])/g, (_, s) => sub[s] || '_' + s);
  t = t.replace(/\\[a-zA-Z]+/g, '');
  t = t.replace(/\{|\}/g, '');
  return t;
}

// ============ MARKDOWN TABLE → BULLET CONVERTER ============
function convertTables(text) {
  if (!text) return text;
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Detect table: line có >= 2 dấu | và dòng tiếp theo là separator (---)
    const isTableRow = (l: string) => (l.match(/\|/g) || []).length >= 2;
    const isSeparator = (l: string) => /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(l) && l.includes('-');

    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      // Parse header
      const parseRow = (l: string) =>
        l.split('|').map(c => c.trim()).filter(c => c.length > 0);
      const headers = parseRow(line);
      i += 2; // skip header + separator

      // Collect rows
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isSeparator(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      // Convert to bullet format
      rows.forEach((row, rIdx) => {
        out.push(`**${rIdx + 1}. ${row[0] || ''}**`);
        for (let c = 1; c < headers.length; c++) {
          if (row[c]) {
            out.push(`- ${headers[c]}: ${row[c]}`);
          }
        }
        out.push(''); // dòng trống giữa các item
      });
      continue;
    }
    out.push(line);
    i++;
  }

  return out.join('\n');
}
// ============ END CONVERTER ============

// ============ CODE BLOCK ============
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      Alert.alert('Lỗi', 'Không copy được');
    }
  };
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <View style={styles.codeLangBadge}>
          <Ionicons name="code-slash" size={12} color="#9CA3AF" />
          <Text style={styles.codeLangText}>{language || 'code'}</Text>
        </View>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? '#10B981' : '#E5E7EB'} />
          <Text style={[styles.copyText, copied && { color: '#10B981' }]}>
            {copied ? 'Đã copy' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText} selectable>{code}</Text>
      </ScrollView>
    </View>
  );
}

// ============ MARKDOWN RENDER ============
function renderInline(text, isMine, keyPrefix = '') {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key} style={isMine ? styles.boldMine : styles.boldAI}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <Text key={key} style={isMine ? styles.italicMine : styles.italicAI}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={key} style={isMine ? styles.codeMine : styles.codeAI}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={key}>{part}</Text>;
  });
}

function MarkdownText({ content, isMine }) {
  let processed = convertLatex(content);
  processed = convertTables(processed);

  const segments = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeBlockRegex.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: processed.substring(lastIndex, match.index) });
    }
    segments.push({ type: 'code', language: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < processed.length) {
    segments.push({ type: 'text', content: processed.substring(lastIndex) });
  }

  return (
    <View>
      {segments.map((seg, sIdx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={`code-${sIdx}`} code={seg.content} language={seg.language} />;
        }
        const lines = seg.content.split('\n');
        return lines.map((line, idx) => {
          const trimmed = line.trim();
          const key = `t-${sIdx}-${idx}`;
          if (/^[-•]\s+/.test(trimmed)) {
            return (
              <View key={key} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, isMine && { color: '#fff' }]}>•</Text>
                <Text style={[styles.msgText, isMine && styles.msgTextMine, { flex: 1 }]}>
                  {renderInline(trimmed.replace(/^[-•]\s+/, ''), isMine, key)}
                </Text>
              </View>
            );
          }
          if (/^\d+\.\s+/.test(trimmed)) {
            const m = trimmed.match(/^(\d+)\.\s+(.*)$/);
            return (
              <View key={key} style={styles.bulletRow}>
                <Text style={[styles.bulletNumber, isMine && { color: '#fff' }]}>{m[1]}.</Text>
                <Text style={[styles.msgText, isMine && styles.msgTextMine, { flex: 1 }]}>
                  {renderInline(m[2], isMine, key)}
                </Text>
              </View>
            );
          }
          if (/^#{1,3}\s+/.test(trimmed)) {
            return (
              <Text key={key} style={[styles.heading, isMine && { color: '#fff' }]}>
                {renderInline(trimmed.replace(/^#{1,3}\s+/, ''), isMine, key)}
              </Text>
            );
          }
          if (trimmed === '') return <View key={key} style={{ height: 6 }} />;
          return (
            <Text key={key} style={[styles.msgText, isMine && styles.msgTextMine]}>
              {renderInline(line, isMine, key)}
            </Text>
          );
        });
      })}
    </View>
  );
}

export default function AIChatBox({ visible, onClose, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userContext, setUserContext] = useState('');
  const flatRef = useRef(null);

  useEffect(() => {
    if (!visible || !user?.id) return;
    (async () => {
      const local = await getLocalMessages(user.id);
      if (local.length > 0) setMessages(local);
      else setMessages(await fetchCloudMessages(user.id));
      setUserContext(await buildUserContext(user));
    })();
  }, [visible, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: 'user', content: input.trim(), createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    const res = await sendMessage({
      userId: user.id,
      messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      context: userContext,
    });
    setSending(false);
    if (res.error) { Alert.alert('Lỗi', res.error); return; }
    setMessages(res.messages);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClear = () => {
    Alert.alert('Xoá lịch sử chat', 'Bạn muốn xoá toàn bộ lịch sử chat với AI?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        await clearLocalMessages(user.id);
        await deleteCloudMessages(user.id);
        setMessages([]);
      }},
    ]);
  };

  const renderItem = ({ item }) => {
    const isMine = item.role === 'user';
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleAI]}>
          <MarkdownText content={item.content} isMine={isMine} />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.box} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>EduTeach AI</Text>
                <Text style={styles.headerSub}>Trợ lý học tập 24/7</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(item, i) => i.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="sparkles" size={40} color="#7C3AED" />
                  </View>
                  <Text style={styles.emptyTitle}>Xin chào! Mình là EduTeach AI</Text>
                  <Text style={styles.emptyDesc}>Mình có thể giúp bạn:</Text>
                  <View style={styles.suggestBox}>
                    <Text style={styles.suggestItem}>📚 Giải bài tập Toán, Lý, Hóa...</Text>
                    <Text style={styles.suggestItem}>❓ Hướng dẫn dùng app</Text>
                    <Text style={styles.suggestItem}>💡 Giải thích khái niệm khó</Text>
                    <Text style={styles.suggestItem}>💻 Viết code mẫu (Python, JS...)</Text>
                    <Text style={styles.suggestItem}>🔍 Tìm gia sư phù hợp</Text>
                  </View>
                </View>
              }
            />
            {sending && (
              <View style={styles.typingBox}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.typingText}>AI đang trả lời...</Text>
              </View>
            )}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi..."
                placeholderTextColor="#9CA3AF"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || sending}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#F9FAFB', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  headerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8 },
  listContent: { padding: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  msgText: { fontSize: 14, color: '#111', lineHeight: 21 },
  msgTextMine: { color: '#fff' },
  boldAI: { fontWeight: 'bold', color: '#7C3AED', backgroundColor: '#F5F3FF', paddingHorizontal: 3, borderRadius: 3 },
  boldMine: { fontWeight: 'bold', color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 3, borderRadius: 3 },
  italicAI: { fontStyle: 'italic', color: '#4B5563' },
  italicMine: { fontStyle: 'italic', color: '#DBEAFE' },
  codeAI: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, color: '#DC2626', backgroundColor: '#FEF2F2', paddingHorizontal: 4, borderRadius: 3 },
  codeMine: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, color: '#FEF3C7', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 4, borderRadius: 3 },
  heading: { fontSize: 15, fontWeight: 'bold', color: '#111', marginTop: 6, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  bulletDot: { fontSize: 14, color: '#7C3AED', marginRight: 6, lineHeight: 21 },
  bulletNumber: { fontSize: 14, color: '#7C3AED', fontWeight: 'bold', marginRight: 6, lineHeight: 21 },
  codeBlock: { backgroundColor: '#1E1E2E', borderRadius: 10, marginVertical: 8, overflow: 'hidden', maxWidth: '100%' },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#2D2D3D', borderBottomWidth: 1, borderBottomColor: '#3D3D4D' },
  codeLangBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeLangText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  copyText: { fontSize: 11, color: '#E5E7EB', fontWeight: '600' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12.5, color: '#E5E7EB', lineHeight: 19, paddingHorizontal: 12, paddingVertical: 10, minWidth: 200 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111' },
  emptyDesc: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  suggestBox: { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  suggestItem: { fontSize: 13, color: '#4B5563' },
  typingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111', maxHeight: 100, borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
});
