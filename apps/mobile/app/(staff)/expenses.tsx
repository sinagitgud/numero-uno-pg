import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../_layout';

export default function ExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📋</Text>
      <Text style={styles.title}>Expense Tracking</Text>
      <Text style={styles.subtitle}>
        Log daily operational expenses by category and property.{'\n'}
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
