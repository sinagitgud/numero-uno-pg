import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { Colors } from '../_layout';

export default function PropertiesScreen() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res: any = await api.get('/properties');
      setProperties(res.data || []);
    } catch {}
  };

  useEffect(() => { fetch(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetch(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.badge, item.ownership === 'OWNED' ? styles.owned : styles.rented]}>
                <Text style={styles.badgeText}>{t(`properties.${item.ownership}`)}</Text>
              </View>
            </View>
            <Text style={styles.code}>{item.code} · {t(`properties.${item.type}`)}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>🛏️ {item._count?.tenants || 0} tenants</Text>
              <Text style={styles.stat}>🚪 {item.rooms?.length || 0} rooms</Text>
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
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text, flex: 1 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  owned: { backgroundColor: '#D1FAE5' },
  rented: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  code: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  address: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 13, color: Colors.text },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40 },
});
