import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default class ErrorCatcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.log('CAUGHT ERROR:', error);
    console.log('STACK:', info?.componentStack);
    this.setState({ error, info });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>APP CRASHED</Text>
            <Text style={styles.sub}>Chup man hinh nay gui admin</Text>

            <Text style={styles.label}>Loi:</Text>
            <Text style={styles.error}>{err?.toString() || 'Unknown'}</Text>

            {err?.stack && (
              <>
                <Text style={styles.label}>Stack:</Text>
                <Text style={styles.stack}>{err.stack.substring(0, 1500)}</Text>
              </>
            )}

            {this.state.info?.componentStack && (
              <>
                <Text style={styles.label}>Component:</Text>
                <Text style={styles.stack}>
                  {this.state.info.componentStack.substring(0, 800)}
                </Text>
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>Thu lai</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEF2F2' },
  scroll: { padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#DC2626', marginBottom: 6 },
  sub: { fontSize: 12, color: '#9CA3AF', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#7F1D1D', marginTop: 16, marginBottom: 6 },
  error: { fontSize: 13, color: '#111', backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  stack: { fontSize: 11, color: '#4B5563', backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  btn: {
    margin: 20, paddingVertical: 16, backgroundColor: '#DC2626',
    borderRadius: 12, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
