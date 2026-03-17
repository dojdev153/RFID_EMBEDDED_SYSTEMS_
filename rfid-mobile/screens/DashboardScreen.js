import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import APIService from '../services/api';
import WebSocketService from '../services/websocket';
import ReceiptService from '../services/receipt';

const THEME = {
    background: '#0a0c1b',
    cardBg: '#1a1f4d',
    primary: '#7c7cff',
    secondary: '#00f2fe',
    success: '#4ade80',
    error: '#ff6b6b',
    text: '#ffffff',
    textSecondary: '#7c7cff',
    textMuted: '#7c7cff80',
    border: '#7c7cff40',
};

const DashboardScreen = ({ navigation }) => {
    const [stats, setStats] = useState({
        totalCards: 0,
        totalBalance: 0,
        totalTransactions: 0,
        totalTopups: 0,
        totalPayments: 0,
    });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        mqtt_connected: false,
        websocket_clients: 0,
    });

    const loadData = async () => {
        try {
            // Get system status
            const statusResult = await APIService.getStatus();
            setSystemStatus({
                mqtt_connected: statusResult.mqtt_connected || false,
                websocket_clients: statusResult.websocket_clients || 0,
            });

            // Get transactions
            const result = await APIService.getTransactions(50);
            const txs = result.transactions || [];
            setTransactions(txs);

            // Calculate stats
            const uniqueCards = new Set(txs.map((t) => t.uid)).size;
            const topups = txs.filter((t) => t.type === 'TOPUP');
            const payments = txs.filter((t) => t.type === 'PAYMENT');

            // Get latest balance for each card
            const latestBalances = {};
            txs.forEach((tx) => {
                if (!latestBalances[tx.uid]) {
                    latestBalances[tx.uid] = tx; // txs are typically sorted desc by timestamp
                }
            });
            const totalBalance = Object.values(latestBalances).reduce(
                (sum, tx) => sum + (tx.balance_after || 0),
                0
            );

            setStats({
                totalCards: uniqueCards,
                totalBalance: totalBalance,
                totalTransactions: txs.length,
                totalTopups: topups.length,
                totalPayments: payments.length,
            });
        } catch (error) {
            console.error('Dashboard data load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();

        const handleUpdate = () => {
            loadData(); // Refresh on any card activity
        };

        WebSocketService.addListener(handleUpdate);
        return () => {
            WebSocketService.removeListener(handleUpdate);
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={THEME.secondary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.secondary} />
            }
        >
            <View style={styles.content}>
                <Text style={styles.headerTitle}>📊 System Dashboard</Text>

                {/* System Status Bar */}
                <View style={styles.statusBar}>
                    <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: systemStatus.mqtt_connected ? THEME.success : THEME.error }]} />
                        <Text style={styles.statusLabel}>MQTT: {systemStatus.mqtt_connected ? 'Connected' : 'Offline'}</Text>
                    </View>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusEmoji}>🔌</Text>
                        <Text style={styles.statusLabel}>Clients: {systemStatus.websocket_clients}</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statsCard, { width: '48%', borderLeftColor: THEME.secondary }]}>
                        <Text style={styles.statsIcon}>💳</Text>
                        <Text style={styles.statsValue}>{stats.totalCards}</Text>
                        <Text style={styles.statsLabel}>Total Cards</Text>
                    </View>
                    <View style={[styles.statsCard, { width: '48%', borderLeftColor: THEME.success }]}>
                        <Text style={styles.statsIcon}>📈</Text>
                        <Text style={styles.statsValue}>{stats.totalTopups}</Text>
                        <Text style={styles.statsLabel}>Top-Ups</Text>
                    </View>
                    <View style={[styles.statsCard, { width: '100%', borderLeftColor: THEME.primary }]}>
                        <Text style={styles.statsIcon}>💰</Text>
                        <View style={styles.row}>
                            <Text style={styles.statsValue}>{stats.totalBalance}</Text>
                            <Text style={styles.statsUnit}> RWF</Text>
                        </View>
                        <Text style={styles.statsLabel}>Total System Balance</Text>
                    </View>
                    <View style={[styles.statsCard, { width: '100%', borderLeftColor: THEME.error }]}>
                        <Text style={styles.statsIcon}>💸</Text>
                        <Text style={styles.statsValue}>{stats.totalPayments}</Text>
                        <Text style={styles.statsLabel}>Total Payments Processed</Text>
                    </View>
                </View>

                {/* Total Transactions Card */}
                <View style={styles.totalTxCard}>
                    <Text style={styles.totalTxValue}>{stats.totalTransactions}</Text>
                    <Text style={styles.totalTxLabel}>Total Transactions Logged</Text>
                </View>

                {/* Recent Transactions */}
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {transactions.length === 0 ? (
                    <Text style={styles.noDataText}>No transactions yet</Text>
                ) : (
                    transactions.slice(0, 20).map((tx, index) => (
                        <View
                            key={index}
                            style={[
                                styles.txCard,
                                { borderLeftColor: tx.type === 'TOPUP' ? THEME.success : THEME.error }
                            ]}
                        >
                            <View style={styles.txHeader}>
                                <Text style={styles.txType}>
                                    {tx.type === 'TOPUP' ? '⬆️ Top-Up' : '⬇️ Payment'}
                                </Text>
                                <Text style={[styles.txAmount, { color: tx.type === 'TOPUP' ? THEME.success : THEME.error }]}>
                                    {tx.type === 'TOPUP' ? '+' : '-'}{tx.amount} RWF
                                </Text>
                            </View>

                            <View style={styles.txDetails}>
                                <View style={styles.txDetailRow}>
                                    <Text style={styles.txDetailLabel}>Card UID:</Text>
                                    <Text style={styles.txDetailValue}>{tx.uid}</Text>
                                </View>
                                {tx.service_name !== 'Wallet Top-Up' && (
                                    <View style={styles.txDetailRow}>
                                        <Text style={styles.txDetailLabel}>Service:</Text>
                                        <Text style={styles.txDetailValue}>{tx.service_name}</Text>
                                    </View>
                                )}
                                <View style={styles.txDetailRow}>
                                    <Text style={styles.txDetailLabel}>Balance:</Text>
                                    <Text style={styles.txDetailValue}>{tx.balance_before} → {tx.balance_after} RWF</Text>
                                </View>
                            </View>

                            <View style={styles.txFooter}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>{tx.role}</Text>
                                </View>
                                <Text style={styles.txTimestamp}>{formatDate(tx.timestamp)}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.reprintButton}
                                onPress={() => ReceiptService.generateReceipt(tx, tx.type)}
                            >
                                <Text style={styles.reprintButtonText}>🖨️ Reprint Receipt</Text>
                            </TouchableOpacity>

                            {tx.success === 0 && (
                                <View style={styles.failedBadge}>
                                    <Text style={styles.failedBadgeText}>❌ Failed: {tx.message || 'Error'}</Text>
                                </View>
                            )}
                        </View>
                    ))
                )}

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.backButtonText}>🏠 Back to Login</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    headerTitle: {
        color: THEME.secondary,
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 20,
    },
    statusBar: {
        flexDirection: 'row',
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        justifyContent: 'space-around',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusEmoji: {
        fontSize: 14,
        marginRight: 6,
    },
    statusLabel: {
        color: THEME.text,
        fontSize: 12,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statsCard: {
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    statsIcon: {
        fontSize: 20,
        marginBottom: 8,
    },
    statsValue: {
        color: THEME.secondary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    statsUnit: {
        color: THEME.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    statsLabel: {
        color: THEME.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    totalTxCard: {
        backgroundColor: '#7c7cff20',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginVertical: 8,
        borderWidth: 1,
        borderColor: THEME.secondary,
    },
    totalTxValue: {
        color: THEME.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    totalTxLabel: {
        color: THEME.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    sectionTitle: {
        color: THEME.secondary,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
    },
    noDataText: {
        color: THEME.textMuted,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
    txCard: {
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    txHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    txType: {
        color: THEME.text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    txAmount: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    txDetails: {
        marginBottom: 12,
    },
    txDetailRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    txDetailLabel: {
        color: THEME.textMuted,
        fontSize: 12,
        width: 80,
    },
    txDetailValue: {
        color: THEME.text,
        fontSize: 12,
        flex: 1,
    },
    txFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: THEME.border,
        paddingTop: 8,
    },
    roleBadge: {
        backgroundColor: '#7c7cff30',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: THEME.secondary,
    },
    roleBadgeText: {
        color: THEME.secondary,
        fontSize: 10,
        fontWeight: 'bold',
    },
    txTimestamp: {
        color: THEME.textMuted,
        fontSize: 11,
    },
    failedBadge: {
        marginTop: 8,
        backgroundColor: '#ff6b6b20',
        padding: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: THEME.error,
    },
    failedBadgeText: {
        color: THEME.error,
        fontSize: 11,
        fontWeight: 'bold',
    },
    backButton: {
        backgroundColor: THEME.cardBg,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 32,
        borderWidth: 1,
        borderColor: THEME.primary,
    },
    backButtonText: {
        color: THEME.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    reprintButton: {
        marginTop: 12,
        backgroundColor: '#7c7cff15',
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    reprintButtonText: {
        color: THEME.secondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default DashboardScreen;
