import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  adminGetDisputes,
  adminResolveDispute,
} from '../../lib/adminSettings';

const STATUS_CFG = {
  open: {
    label: 'Chờ xử lý',
    color: '#D97706',
    bg: '#FFFBEB',
    icon: 'time-outline',
  },
  resolved: {
    label: 'Đã chấp nhận',
    color: '#059669',
    bg: '#ECFDF5',
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    label: 'Đã bác bỏ',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: 'close-circle-outline',
  },
};

const FILTERS = [
  { key: 'open', label: 'Chờ xử lý' },
  { key: 'resolved', label: 'Đã chấp nhận' },
  { key: 'rejected', label: 'Bác bỏ' },
  { key: 'all', label: 'Tất cả' },
];

export default function DisputesScreen({ onBack }) {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('open');

  const [resolveModal, setResolveModal] = useState(null);
  const [resolveAction, setResolveAction] = useState('resolved');
  const [resolveNote, setResolveNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await adminGetDisputes();

      if (res?.error) {
        console.error('adminGetDisputes:', res.error);
        return;
      }

      if (res?.disputes) {
        setDisputes(res.disputes);
      }
    } catch (error) {
      console.error('Load disputes error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleOpenResolve = (dispute, action) => {
    setResolveModal(dispute);
    setResolveAction(action);
    setResolveNote('');
  };

  const closeResolveModal = () => {
    if (submitting) return;

    setResolveModal(null);
    setResolveNote('');
  };

  const handleSubmitResolve = async () => {
    if (!resolveModal || submitting) return;

    const cleanNote = resolveNote.trim();

    if (!cleanNote) {
      return Alert.alert(
        'Thiếu ghi chú',
        'Vui lòng nhập ghi chú xử lý khiếu nại.'
      );
    }

    const disputeId = resolveModal.id;
    const action = resolveAction;

    setSubmitting(true);

    try {
      const res = await adminResolveDispute(
        disputeId,
        cleanNote,
        action
      );

      if (res?.error) {
        return Alert.alert('Không thể xử lý', res.error);
      }

      // Cập nhật giao diện ngay, không cần chờ query lại.
      setDisputes(current =>
        current.map(item =>
          item.id === disputeId
            ? {
                ...item,
                status: action,
                resolution_note: cleanNote,
                resolved_at: new Date().toISOString(),
              }
            : item
        )
      );

      setResolveModal(null);
      setResolveNote('');

      // Đồng bộ lại dữ liệu thật từ Supabase.
      await load();

      Alert.alert(
        action === 'resolved'
          ? 'Đã chấp nhận'
          : 'Đã bác bỏ',
        action === 'resolved'
          ? 'Khiếu nại đã được chấp nhận.'
          : 'Khiếu nại đã bị bác bỏ. Buổi học được tự động xác nhận và học sinh không cần xác nhận lại.'
      );
    } catch (error) {
      console.error('Resolve dispute error:', error);

      Alert.alert(
        'Lỗi',
        error?.message || 'Không thể xử lý khiếu nại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = disputes.filter(item =>
    filter === 'all'
      ? true
      : item.status === filter
  );

  const openCount = disputes.filter(
    item => item.status === 'open'
  ).length;

  const resolvedCount = disputes.filter(
    item => item.status === 'resolved'
  ).length;

  const rejectedCount = disputes.filter(
    item => item.status === 'rejected'
  ).length;

  const formatDate = value => {
    if (!value) return '--';

    try {
      return new Date(value).toLocaleString('vi-VN');
    } catch {
      return '--';
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color="#DC2626"
          />

          <Text style={styles.loadingText}>
            Đang tải khiếu nại...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top']}
    >
      {/* HEADER DUY NHẤT */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111827"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Khiếu nại
        </Text>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color="#6B7280"
            />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#6B7280"
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* OVERVIEW */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={25}
                color="#DC2626"
              />
            </View>

            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>
                Quản lý khiếu nại
              </Text>

              <Text style={styles.heroSubtitle}>
                Theo dõi và xử lý các vấn đề của buổi học
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: '#D97706' },
                ]}
              >
                {openCount}
              </Text>

              <Text style={styles.statLabel}>
                Chờ xử lý
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: '#059669' },
                ]}
              >
                {resolvedCount}
              </Text>

              <Text style={styles.statLabel}>
                Chấp nhận
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  { color: '#DC2626' },
                ]}
              >
                {rejectedCount}
              </Text>

              <Text style={styles.statLabel}>
                Bác bỏ
              </Text>
            </View>
          </View>
        </View>

        {/* FILTER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(item => {
            const active = filter === item.key;

            let count = disputes.length;

            if (item.key !== 'all') {
              count = disputes.filter(
                d => d.status === item.key
              ).length;
            }

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    active && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      active &&
                        styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* EMPTY */}
        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  filter === 'open'
                    ? 'checkmark-done-outline'
                    : 'file-tray-outline'
                }
                size={34}
                color="#9CA3AF"
              />
            </View>

            <Text style={styles.emptyTitle}>
              {filter === 'open'
                ? 'Không còn khiếu nại chờ xử lý'
                : 'Chưa có dữ liệu'}
            </Text>

            <Text style={styles.emptyText}>
              {filter === 'open'
                ? 'Tất cả khiếu nại đã được xử lý.'
                : 'Không có khiếu nại trong mục này.'}
            </Text>
          </View>
        )}

        {/* CARDS */}
        {filtered.map(dispute => {
          const cfg =
            STATUS_CFG[dispute.status] ||
            STATUS_CFG.open;

          const session = dispute.session;
          const course = session?.course;
          const student = course?.student;
          const tutor = course?.tutor;
          const isOpen = dispute.status === 'open';

          return (
            <View
              key={dispute.id}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: cfg.bg },
                  ]}
                >
                  <Ionicons
                    name={cfg.icon}
                    size={23}
                    color={cfg.color}
                  />
                </View>

                <View style={styles.cardHeading}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    {course?.subject || 'Khóa học'}
                  </Text>

                  <Text style={styles.sessionText}>
                    Buổi {session?.session_number || '?'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: cfg.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: cfg.color },
                    ]}
                  >
                    {cfg.label}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#9CA3AF"
                />

                <Text style={styles.timeText}>
                  Gửi lúc {formatDate(dispute.created_at)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.personBlock}>
                <View style={styles.personIcon}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color="#2563EB"
                  />
                </View>

                <View style={styles.personInfo}>
                  <Text style={styles.personLabel}>
                    Học sinh
                  </Text>

                  <Text style={styles.personName}>
                    {student?.full_name || 'Chưa có thông tin'}
                  </Text>

                  {!!student?.phone && (
                    <Text style={styles.personPhone}>
                      {student.phone}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.personBlock}>
                <View
                  style={[
                    styles.personIcon,
                    { backgroundColor: '#F0FDF4' },
                  ]}
                >
                  <Ionicons
                    name="school-outline"
                    size={17}
                    color="#059669"
                  />
                </View>

                <View style={styles.personInfo}>
                  <Text style={styles.personLabel}>
                    Gia sư
                  </Text>

                  <Text style={styles.personName}>
                    {tutor?.full_name || 'Chưa có thông tin'}
                  </Text>

                  {!!tutor?.phone && (
                    <Text style={styles.personPhone}>
                      {tutor.phone}
                    </Text>
                  )}
                </View>
              </View>

              {/* REASON */}
              <View style={styles.reasonBox}>
                <View style={styles.reasonHeader}>
                  <Ionicons
                    name="chatbox-ellipses-outline"
                    size={17}
                    color="#DC2626"
                  />

                  <Text style={styles.reasonLabel}>
                    Nội dung khiếu nại
                  </Text>
                </View>

                <Text style={styles.reasonText}>
                  {dispute.reason ||
                    'Không có nội dung khiếu nại.'}
                </Text>
              </View>

              {/* RESULT */}
              {!isOpen && (
                <View
                  style={[
                    styles.resultBox,
                    {
                      backgroundColor:
                        dispute.status === 'resolved'
                          ? '#ECFDF5'
                          : '#FEF2F2',
                    },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={
                        dispute.status === 'resolved'
                          ? 'checkmark-circle'
                          : 'close-circle'
                      }
                      size={18}
                      color={
                        dispute.status === 'resolved'
                          ? '#059669'
                          : '#DC2626'
                      }
                    />

                    <Text
                      style={[
                        styles.resultTitle,
                        {
                          color:
                            dispute.status === 'resolved'
                              ? '#047857'
                              : '#B91C1C',
                        },
                      ]}
                    >
                      {dispute.status === 'resolved'
                        ? 'Admin đã chấp nhận'
                        : 'Admin đã bác bỏ'}
                    </Text>
                  </View>

                  {!!dispute.resolution_note && (
                    <Text style={styles.resultText}>
                      {dispute.resolution_note}
                    </Text>
                  )}

                  {!!dispute.resolved_at && (
                    <Text style={styles.resultTime}>
                      Xử lý lúc{' '}
                      {formatDate(dispute.resolved_at)}
                    </Text>
                  )}
                </View>
              )}

              {/* ACTIONS */}
              {isOpen && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.rejectBtn,
                    ]}
                    onPress={() =>
                      handleOpenResolve(
                        dispute,
                        'rejected'
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={19}
                      color="#DC2626"
                    />

                    <Text style={styles.rejectBtnText}>
                      Bác bỏ
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.approveBtn,
                    ]}
                    onPress={() =>
                      handleOpenResolve(
                        dispute,
                        'resolved'
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text style={styles.approveBtnText}>
                      Chấp nhận
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* RESOLVE MODAL */}
      <Modal
        visible={!!resolveModal}
        transparent
        animationType="slide"
        onRequestClose={closeResolveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalActionIcon,
                  {
                    backgroundColor:
                      resolveAction === 'resolved'
                        ? '#ECFDF5'
                        : '#FEF2F2',
                  },
                ]}
              >
                <Ionicons
                  name={
                    resolveAction === 'resolved'
                      ? 'checkmark-circle-outline'
                      : 'close-circle-outline'
                  }
                  size={25}
                  color={
                    resolveAction === 'resolved'
                      ? '#059669'
                      : '#DC2626'
                  }
                />
              </View>

              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>
                  {resolveAction === 'resolved'
                    ? 'Chấp nhận khiếu nại'
                    : 'Bác bỏ khiếu nại'}
                </Text>

                <Text style={styles.modalSub}>
                  Buổi{' '}
                  {resolveModal?.session
                    ?.session_number || '?'}{' '}
                  ·{' '}
                  {resolveModal?.session?.course
                    ?.subject || 'Khóa học'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={closeResolveModal}
                disabled={submitting}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {resolveAction === 'rejected' && (
              <View style={styles.warningBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color="#B45309"
                />

                <Text style={styles.warningText}>
                  Khi bác bỏ, buổi học sẽ được tự động
                  xác nhận và hệ thống tiến hành thanh
                  toán cho gia sư.
                </Text>
              </View>
            )}

            {resolveAction === 'resolved' && (
              <View style={styles.approveInfoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color="#047857"
                />

                <Text style={styles.approveInfoText}>
                  Khi chấp nhận, buổi học sẽ được đánh
                  dấu hủy để chờ xử lý theo quyết định
                  của Admin.
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>
              Ghi chú xử lý
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={
                resolveAction === 'resolved'
                  ? 'Nhập kết quả hoặc hướng xử lý...'
                  : 'Nhập lý do bác bỏ khiếu nại...'
              }
              value={resolveNote}
              onChangeText={setResolveNote}
              multiline
              maxLength={1000}
              editable={!submitting}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.charCount}>
              {resolveNote.length}/1000
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeResolveModal}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>
                  Hủy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  resolveAction === 'rejected'
                    ? styles.confirmRejectBtn
                    : styles.confirmApproveBtn,
                  (!resolveNote.trim() || submitting) &&
                    styles.disabledBtn,
                ]}
                onPress={handleSubmitResolve}
                disabled={
                  !resolveNote.trim() || submitting
                }
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        resolveAction === 'resolved'
                          ? 'checkmark-circle-outline'
                          : 'close-circle-outline'
                      }
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text style={styles.confirmBtnText}>
                      {resolveAction === 'resolved'
                        ? 'Chấp nhận'
                        : 'Bác bỏ'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F1F3',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 3,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 21,
    fontWeight: '800',
  },

  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },

  filterRow: {
    gap: 8,
    paddingBottom: 14,
    paddingRight: 8,
  },

  filterChip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  filterChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },

  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  filterCountText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
  },

  filterCountTextActive: {
    color: '#FFFFFF',
  },

  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F0F1F3',
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },

  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 5,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEEF1',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardHeading: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  sessionText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 5,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },

  personBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  personIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  personInfo: {
    flex: 1,
    marginLeft: 10,
  },

  personLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  personName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 1,
  },

  personPhone: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },

  reasonBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginTop: 3,
  },

  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 6,
    textTransform: 'uppercase',
  },

  reasonText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
    marginTop: 7,
  },

  resultBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  resultText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
    marginTop: 7,
  },

  resultTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 7,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },

  actionBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 6,
  },

  approveBtn: {
    backgroundColor: '#10B981',
  },

  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'flex-end',
  },

  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalHeading: {
    flex: 1,
    marginLeft: 11,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },

  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#92400E',
    marginLeft: 7,
  },

  approveInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },

  approveInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#065F46',
    marginLeft: 7,
  },

  modalLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },

  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 13,
    minHeight: 100,
    maxHeight: 160,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 13,
    color: '#111827',
  },

  charCount: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 5,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  cancelBtn: {
    flex: 0.75,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },

  confirmBtn: {
    flex: 1.25,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmApproveBtn: {
    backgroundColor: '#10B981',
  },

  confirmRejectBtn: {
    backgroundColor: '#DC2626',
  },

  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  disabledBtn: {
    opacity: 0.45,
  },
});
