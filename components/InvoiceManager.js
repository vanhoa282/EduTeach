import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const BLUE = '#2563EB';
const DARK = '#0F172A';

const money = n =>
  Number(n || 0).toLocaleString('vi-VN') + 'đ';

const date = d =>
  d ? new Date(d).toLocaleString('vi-VN') : '—';

const friendly = e => {
  const msg = String(e?.message || e || '');

  if (msg.includes('LIMIT_2_PENDING_INVOICES')) {
    return 'Bạn đang có 2 hóa đơn chờ thanh toán. Vui lòng hoàn tất hoặc hủy một hóa đơn trước khi tạo mới.';
  }

  return 'Chưa thể tải thông tin hóa đơn. Vui lòng kiểm tra kết nối và thử lại.';
};

const statusInfo = o => {
  if (o.status === 'paid') {
    return {
      label: 'Đã thanh toán',
      color: '#16A34A',
      bg: '#DCFCE7',
    };
  }

  if (o.status === 'cancelled') {
    return {
      label: o.cancel_reason === 'expired'
        ? 'Đã hết hạn'
        : 'Đã hủy',
      color: '#DC2626',
      bg: '#FEE2E2',
    };
  }

  return {
    label: 'Chờ thanh toán',
    color: '#D97706',
    bg: '#FEF3C7',
  };
};

function Stat({ title, value, color }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{title}</Text>
      <Text
        style={[
          s.statValue,
          { color: color || DARK },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function InvoiceManager({
  studentId,
  visible = true,
  onClose,
  onNotice,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select(
          'id,order_code,student_id,course_id,amount,status,created_at,expires_at,paid_at,cancelled_at,cancel_reason'
        )
        .eq('student_id', studentId)
        .order('created_at', {
          ascending: false,
        });

      if (queryError) throw queryError;

      setOrders(data || []);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const remaining = o => {
    if (o.status !== 'pending') return '';

    const seconds = Math.max(
      0,
      Math.floor(
        (new Date(o.expires_at).getTime() - now) / 1000
      )
    );

    if (!seconds) return 'Đã hết thời gian thanh toán';

    return 'Còn ' +
      Math.floor(seconds / 60) +
      ':' +
      String(seconds % 60).padStart(2, '0');
  };

  const cancel = async () => {
    if (!confirmOrder || busy) return;

    const target = confirmOrder;
    setBusy(true);

    try {
      const secret = await AsyncStorage.getItem(
        '@eduteach_invoice_secret_' + target.id
      );

      if (!secret) {
        throw new Error('missing_secret');
      }

      const { data, error: rpcError } = await supabase.rpc(
        'cancel_eduteach_invoice',
        {
          p_order_id: target.id,
          p_secret: secret,
        }
      );

      if (rpcError) throw rpcError;

      if (data?.status === 'cancelled') {
        setConfirmOrder(null);
        setSelected(null);
        await load();

        onNotice?.(
          'Đã hủy hóa đơn',
          'Hóa đơn đã được hủy thành công. Bạn có thể tạo hóa đơn mới.',
          'success'
        );
      } else if (data?.status === 'not_pending') {
        setConfirmOrder(null);
        await load();

        onNotice?.(
          'Không thể hủy hóa đơn',
          'Hóa đơn đã được xử lý hoặc không còn ở trạng thái chờ thanh toán.',
          'warning'
        );
      } else {
        throw new Error('unauthorized');
      }
    } catch (_) {
      setConfirmOrder(null);

      onNotice?.(
        'Chưa thể hủy hóa đơn',
        'Không thể xác nhận quyền hủy hóa đơn trên thiết bị này. Vui lòng liên hệ hỗ trợ nếu cần.',
        'warning'
      );
    } finally {
      setBusy(false);
    }
  };

  const total = orders.length;
  const paid = orders.filter(o => o.status === 'paid');
  const pending = orders.filter(
    o => o.status === 'pending' &&
      new Date(o.expires_at).getTime() > now
  );
  const cancelled = orders.filter(
    o => o.status === 'cancelled' ||
      (
        o.status === 'pending' &&
        new Date(o.expires_at).getTime() <= now
      )
  );

  const revenue = paid.reduce(
    (sum, o) => sum + Number(o.amount || 0),
    0
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={onClose}
          style={s.back}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={DARK}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={s.title}>
            Quản Lý Hóa Đơn
          </Text>
          <Text style={s.subtitle}>
            Tất cả hóa đơn của bạn
          </Text>
        </View>

        <TouchableOpacity onPress={load}>
          <Ionicons
            name="refresh-outline"
            size={24}
            color={BLUE}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <View style={s.stats}>
          <Stat
            title="Tổng hóa đơn"
            value={total}
          />
          <Stat
            title="Đã thanh toán"
            value={paid.length}
            color="#16A34A"
          />
          <Stat
            title="Chờ thanh toán"
            value={`${pending.length}/2`}
            color="#D97706"
          />
          <Stat
            title="Đã hủy / hết hạn"
            value={cancelled.length}
            color="#DC2626"
          />
        </View>

        <View style={s.revenue}>
          <View style={s.revenueIcon}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View>
            <Text style={s.revenueLabel}>
              Tổng tiền đã thanh toán
            </Text>
            <Text style={s.revenueValue}>
              {money(revenue)}
            </Text>
          </View>
        </View>

        <Text style={s.heading}>
          Danh sách hóa đơn
        </Text>

        {!!error && (
          <View style={s.messageBox}>
            <Text style={s.messageText}>
              {error}
            </Text>
            <TouchableOpacity onPress={load}>
              <Text style={s.retry}>
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <ActivityIndicator
            color={BLUE}
            style={{ margin: 20 }}
          />
        )}

        {!loading && !error && !orders.length && (
          <View style={s.empty}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color="#94A3B8"
            />
            <Text style={s.emptyTitle}>
              Chưa có hóa đơn
            </Text>
            <Text style={s.emptyText}>
              Hóa đơn của bạn sẽ xuất hiện tại đây.
            </Text>
          </View>
        )}

        {!loading && orders.map(o => {
          const expired =
            o.status === 'pending' &&
            new Date(o.expires_at).getTime() <= now;

          const st = expired
            ? {
                label: 'Đã hết hạn',
                color: '#DC2626',
                bg: '#FEE2E2',
              }
            : statusInfo(o);

          return (
            <View key={o.id} style={s.invoice}>
              <View style={s.invoiceTop}>
                <Text style={s.code}>
                  #{o.order_code}
                </Text>

                <View
                  style={[
                    s.badge,
                    { backgroundColor: st.bg },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeText,
                      { color: st.color },
                    ]}
                  >
                    {st.label}
                  </Text>
                </View>
              </View>

              <Text style={s.amount}>
                {money(o.amount)}
              </Text>

              <Text style={s.date}>
                Tạo lúc {date(o.created_at)}
              </Text>

              {o.status === 'pending' && !expired && (
                <View style={s.timer}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color="#D97706"
                  />
                  <Text style={s.timerText}>
                    {remaining(o)}
                  </Text>
                </View>
              )}

              <View style={s.actions}>
                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => setSelected(o)}
                >
                  <Text style={s.detailText}>
                    Xem chi tiết
                  </Text>
                </TouchableOpacity>

                {o.status === 'pending' && !expired && (
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => setConfirmOrder(o)}
                  >
                    <Text style={s.cancelText}>
                      Hủy hóa đơn
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Ionicons
              name="receipt-outline"
              size={40}
              color={BLUE}
            />

            <Text style={s.modalTitle}>
              Chi tiết hóa đơn
            </Text>

            {selected && (
              <>
                <Text style={s.modalLine}>
                  Mã: {selected.order_code}
                </Text>
                <Text style={s.modalLine}>
                  Số tiền: {money(selected.amount)}
                </Text>
                <Text style={s.modalLine}>
                  Trạng thái: {
                    statusInfo(selected).label
                  }
                </Text>
                <Text style={s.modalLine}>
                  Ngày tạo: {date(selected.created_at)}
                </Text>
                <Text style={s.modalLine}>
                  Hạn thanh toán: {
                    date(selected.expires_at)
                  }
                </Text>
              </>
            )}

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => setSelected(null)}
            >
              <Text style={s.primaryText}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!confirmOrder}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmOrder(null);
        }}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="#DC2626"
            />

            <Text style={s.modalTitle}>
              Hủy hóa đơn?
            </Text>

            <Text style={s.modalDesc}>
              Bạn có chắc muốn hủy hóa đơn {
                confirmOrder?.order_code
              }? Hóa đơn đã hủy sẽ không thể thanh toán lại.
            </Text>

            <TouchableOpacity
              style={[
                s.primaryBtn,
                { backgroundColor: '#DC2626' },
              ]}
              disabled={busy}
              onPress={cancel}
            >
              {busy
                ? <ActivityIndicator color="#FFFFFF" />
                : (
                  <Text style={s.primaryText}>
                    Xác nhận hủy
                  </Text>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryBtn}
              disabled={busy}
              onPress={() => setConfirmOrder(null)}
            >
              <Text style={s.secondaryText}>
                Giữ hóa đơn
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  back: {
    padding: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: DARK,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  stat: {
    width: '48%',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 7,
  },
  revenue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1D4ED8',
    padding: 18,
    borderRadius: 18,
    marginTop: 14,
  },
  revenueIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueLabel: {
    color: '#BFDBFE',
    fontSize: 12,
  },
  revenueValue: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
    marginTop: 24,
    marginBottom: 14,
  },
  invoice: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 18,
    marginBottom: 12,
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    color: DARK,
    fontWeight: '800',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amount: {
    fontSize: 23,
    fontWeight: '800',
    color: DARK,
    marginTop: 14,
  },
  date: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 7,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  timerText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  detailBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  detailText: {
    color: BLUE,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  cancelText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  messageBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  messageText: {
    color: '#9A3412',
    lineHeight: 20,
  },
  retry: {
    color: BLUE,
    fontWeight: '800',
    marginTop: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: DARK,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 16,
  },
  modalLine: {
    alignSelf: 'stretch',
    color: '#475569',
    fontSize: 14,
    marginBottom: 10,
  },
  modalDesc: {
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryBtn: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 13,
    marginTop: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryBtn: {
    padding: 15,
  },
  secondaryText: {
    color: '#64748B',
    fontWeight: '700',
  },
});
