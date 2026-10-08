import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentNotice({
  visible,
  title,
  message,
  type = 'info',
  onClose,
}) {
  const color =
    type === 'success' ? '#16A34A' :
    type === 'error' ? '#DC2626' :
    type === 'warning' ? '#D97706' :
    '#2563EB';

  const icon =
    type === 'success' ? 'checkmark-circle' :
    type === 'error' ? 'close-circle' :
    type === 'warning' ? 'alert-circle' :
    'information-circle';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <View
            style={[
              s.icon,
              { backgroundColor: color + '16' },
            ]}
          >
            <Ionicons
              name={icon}
              size={44}
              color={color}
            />
          </View>

          <Text style={s.title}>{title}</Text>

          <Text style={s.message}>
            {message}
          </Text>

          <TouchableOpacity
            style={[
              s.button,
              { backgroundColor: color },
            ]}
            onPress={onClose}
          >
            <Text style={s.buttonText}>
              Đã hiểu
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
  },
  icon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
