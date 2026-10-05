import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { getMessages, sendMessage, markConversationRead } from '../../lib/chat';
import { supabase } from '../../lib/supabase';

export default function ChatDetailScreen({ user, conversation, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  const isMeStudent = conversation.student_id === user.id;
  const other = isMeStudent ? conversation.tutor : conversation.student;

  const load = async () => {
    const data = await getMessages(conversation.id, 100);
    setMessages(data);
    setLoading(false);
    await markConversationRead(conversation.id, user.id);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  useEffect(() => { load(); }, [conversation.id]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages-' + conversation.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, async (payload) => {
        // Bỏ qua nếu là tin mình vừa gửi (đã add optimistic)
        if (payload.new.sender_id === user.id) {
          // Update lại id thật + sender info
          setMessages(prev => {
            const withoutTemp = prev.filter(m => !String(m.id).startsWith('temp-'));
            const exists = withoutTemp.some(m => m.id === payload.new.id);
            if (exists) return withoutTemp;
            return [...withoutTemp, { ...payload.new, sender: { id: user.id, full_name: user.full_name } }];
          });
          return;
        }

        // Fetch với sender info cho tin người khác
        const { data } = await supabase
          .from('messages')
          .select(`*, sender:users!messages_sender_id_fkey (id, full_name)`)
          .eq('id', payload.new.id)
          .maybeSingle();

        if (data) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
          markConversationRead(conversation.id, user.id);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, user.id]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const content = input.trim();
    const tempId = 'temp-' + Date.now();

    // OPTIMISTIC: Hiện ngay lập tức
    const optimisticMsg = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: user.full_name },
      _sending: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    const res = await sendMessage({
      conversationId: conversation.id,
      senderId: user.id,
      content,
    });

    setSending(false);

    if (res.error) {
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(content);
      Alert.alert('Lỗi', res.error);
      return;
    }

    // Thay temp bằng tin thật
    setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
  };

  const renderItem = ({ item }) => {
    const isMine = item.sender_id === user.id;
    const time = new Date(item.created_at);
    const timeStr = time.getHours().toString().padStart(2, '0') + ':' +
                    time.getMinutes().toString().padStart(2, '0');

    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>
            {item.content}
          </Text>
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
              {timeStr}
            </Text>
            {isMine && item._sending && (
              <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <View style={styles.topBarInfo}>
          <Text style={styles.topBarName} numberOfLines={1}>
            {other?.full_name || 'Người dùng'}
          </Text>
          <Text style={styles.topBarSub}>{other?.phone || ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Bắt đầu trò chuyện</Text>
                <Text style={styles.emptyDesc}>Gửi tin nhắn đầu tiên để kết nối</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
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
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarInfo: { flex: 1, alignItems: 'center' },
  topBarName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  topBarSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  listContent: { padding: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
  },
  bubbleMine: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#111', lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { fontSize: 10, color: '#9CA3AF' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  input: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14,
    color: '#111', maxHeight: 100,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
});
