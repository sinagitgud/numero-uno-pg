import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { Colors } from '../_layout';

const STATUS_COLORS: Record<string, string> = {
  OPEN: Colors.danger,
  ACKNOWLEDGED: Colors.warning,
  IN_PROGRESS: Colors.primary,
  RESOLVED: Colors.success,
  CLOSED: Colors.textMuted,
};

export default function TicketsScreen() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res: any = await api.get('/tickets?status=OPEN');
      setTickets(res.data || []);
    } catch {}
  };

  useEffect(() => { fetch(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.category}>{t(`tickets.${item.category}`)}</Text>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] || Colors.textMuted }]}>
                {t(`tickets.${item.status}`)}
              </Text>
            </View>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.tenant}>From: {item.tenant?.user?.name}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No open tickets 🎉</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  category: { fontSize: 14, fontWeight: '700', color: Colors.text },
  status: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginBottom: 6 },
  tenant: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  time: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: 16 },
});
