import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../_layout';

// Full implementation in Phase 2 — rent billing & collection module
export default function RentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={styles.title}>Rent Collection</Text>
      <Text style={styles.subtitle}>
        View invoices, record payments, track overdue accounts.{'\n'}
        Full implementation in Phase 2.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
