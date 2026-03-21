import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { Colors } from '../_layout';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: Colors.success,
  NOTICE_PERIOD: Colors.warning,
  VACATED: Colors.textMuted,
};

export default function TenantsScreen() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res: any = await api.get('/tenants?status=ACTIVE');
      setTenants(res.data || []);
    } catch {}
  };

  useEffect(() => { fetch(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.user?.name}</Text>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
            </View>
            <Text style={styles.location}>
              {item.bed?.room?.property?.name} · Room {item.bed?.room?.number} · {item.bed?.label}
            </Text>
            <View style={styles.row}>
              <Text style={styles.rent}>₹{Number(item.rate).toLocaleString('en-IN')}/mo</Text>
              <Text style={styles.phone}>{item.user?.phone}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('common.noData')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  location: { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  rent: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  phone: { fontSize: 13, color: Colors.textMuted },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40 },
});
