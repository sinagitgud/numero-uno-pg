import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../_layout';

// Phase 4: house rules, Wi-Fi, tenant directory, meal schedule
export default function TenantInfoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>ℹ️</Text>
      <Text style={styles.title}>Property Information</Text>
      <Text style={styles.subtitle}>
        House rules, Wi-Fi details, tenant directory, and meal schedule.{'\n'}
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
