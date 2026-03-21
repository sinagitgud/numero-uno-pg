import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../_layout';

// Full implementation in Phase 4 — payment history, Razorpay, receipt download
export default function TenantRentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={styles.title}>Payment History & Receipts</Text>
      <Text style={styles.subtitle}>
        View all past payments, download receipts, and pay rent online.{'\n'}
        Full implementation in Phase 4.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
