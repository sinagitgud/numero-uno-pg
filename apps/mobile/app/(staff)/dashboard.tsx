import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/utils/api';
import { Colors } from '../_layout';

interface Snapshot {
  todayCollections: { total: number; count: number };
  pendingPaymentsCount: number;
  openTicketsCount: number;
  occupancy: { rate: number; occupied: number; total: number };
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSnapshot = async () => {
    try {
      const res: any = await api.get('/dashboard/snapshot');
      setSnapshot(res.data);
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    }
  };

  useEffect(() => { fetchSnapshot(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSnapshot();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* Today's Collections */}
      <View style={[styles.card, styles.collectionsCard]}>
        <Text style={styles.cardLabel}>{t('dashboard.todayCollections')}</Text>
        <Text style={styles.collectionsAmount}>
          ₹{snapshot?.todayCollections.total.toLocaleString('en-IN') || '0'}
        </Text>
        <Text style={styles.cardSubtext}>{snapshot?.todayCollections.count || 0} payments received</Text>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricEmoji}>⏳</Text>
          <Text style={styles.metricValue}>{snapshot?.pendingPaymentsCount || 0}</Text>
          <Text style={styles.metricLabel}>{t('dashboard.pendingPayments')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricEmoji}>🎫</Text>
          <Text style={styles.metricValue}>{snapshot?.openTicketsCount || 0}</Text>
          <Text style={styles.metricLabel}>{t('dashboard.openTickets')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricEmoji}>🏠</Text>
          <Text style={styles.metricValue}>{snapshot?.occupancy.rate || 0}%</Text>
          <Text style={styles.metricLabel}>{t('dashboard.occupancyRate')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricEmoji}>🛏️</Text>
          <Text style={styles.metricValue}>
            {t('dashboard.totalBeds', {
              occupied: snapshot?.occupancy.occupied || 0,
              total: snapshot?.occupancy.total || 0,
            })}
          </Text>
          <Text style={styles.metricLabel}>Beds</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.reportButton}>
        <Text style={styles.reportButtonText}>📈 {t('dashboard.monthlyReport')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  card: { margin: 16, borderRadius: 12, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  collectionsCard: { backgroundColor: Colors.success },
  cardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 },
  collectionsAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cardSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  metricCard: { width: '46%', margin: '2%', backgroundColor: Colors.card, borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  metricEmoji: { fontSize: 28, marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  metricLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  reportButton: { margin: 16, backgroundColor: Colors.primary, borderRadius: 10, padding: 16, alignItems: 'center' },
  reportButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
