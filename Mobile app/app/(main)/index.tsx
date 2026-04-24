import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSelector } from 'react-redux';
import { firebaseService } from '../../services/firebaseService';
import { RootState } from '../../store';
import { Reminder } from '../../store/types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useSelector((state: RootState) => state.auth);
    const [greeting, setGreeting] = useState('');
    const [nextGroup, setNextGroup] = useState<{ time: string; reminders: Reminder[] } | null>(null);
    const [loading, setLoading] = useState(false);

    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(20));

    useEffect(() => {
        updateGreeting();
        fetchDashboardData();

        // Entry animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();
    }, [user]);

    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    };

    const fetchDashboardData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const reminders = await firebaseService.getUserReminders(user.id) as Reminder[];
            
            // Group by time
            const groups: { [key: string]: Reminder[] } = {};
            reminders.forEach(r => {
                if (!groups[r.time]) groups[r.time] = [];
                groups[r.time].push(r);
            });

            // Find next upcoming group
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeValue = currentHour * 60 + currentMinute;

            const sortedTimes = Object.keys(groups).sort();
            let upcomingTime = null;

            for (const time of sortedTimes) {
                const [h, m] = time.split(':').map(Number);
                const timeValue = h * 60 + m;
                
                if (timeValue > currentTimeValue) {
                    upcomingTime = time;
                    break;
                }
            }

            // If no more today, show the first one for tomorrow (or null if empty)
            if (!upcomingTime && sortedTimes.length > 0) {
                upcomingTime = sortedTimes[0]; // Wrap around to next day
            }

            if (upcomingTime) {
                setNextGroup({
                    time: upcomingTime,
                    reminders: groups[upcomingTime]
                });
            } else {
                setNextGroup(null);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    };

    const ActionButton = ({ title, icon, color, route, size = 'normal' }: any) => (
        <TouchableOpacity
            style={[
                styles.actionButton,
                { backgroundColor: color },
                size === 'large' && styles.actionButtonLarge
            ]}
            onPress={() => router.push(route)}
            activeOpacity={0.8}
        >
            <Ionicons name={icon} size={size === 'large' ? 48 : 32} color="white" />
            <Text style={[
                styles.actionButtonText,
                size === 'large' && styles.actionButtonTextLarge
            ]}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />
            }
        >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{greeting},</Text>
                        <Text style={styles.userName}>
                            {user?.roleName || (user?.relation && user.relation !== 'Patient' ? (user.relation === 'Family' ? 'Family Member' : user.relation) : user?.personalInfo?.firstName || 'Friend')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileIcon}
                        onPress={() => router.push('/(main)/profile')}
                    >
                        <Ionicons name="person-circle" size={48} color="#2E8B57" />
                    </TouchableOpacity>
                </View>

                {/* Next Pill Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <Ionicons name="time" size={24} color="#2E8B57" />
                        <Text style={styles.statusTitle}>NEXT MEDICATION</Text>
                    </View>

                    {nextGroup ? (
                        <>
                            <Text style={styles.medTime}>{formatTime(nextGroup.time)}</Text>
                            <Text style={styles.medCount}>
                                {nextGroup.reminders.length} Medication{nextGroup.reminders.length !== 1 ? 's' : ''} Scheduled
                            </Text>
                            <View style={styles.medList}>
                                {nextGroup.reminders.slice(0, 3).map((rem) => {
                                    const medName = rem.medication || (rem as any).medicationName || ((rem as any).message ? (rem as any).message.replace(/^Take\s+/i, '') : 'Medication');
                                    return (
                                        <View key={rem.id}>
                                            <Text style={styles.medListItem}>
                                                • {medName}
                                            </Text>
                                        </View>
                                    );
                                })}
                                {nextGroup.reminders.length > 3 && (
                                    <Text style={styles.moreText}>+{nextGroup.reminders.length - 3} more</Text>
                                )}
                            </View>
                            <TouchableOpacity 
                                style={styles.takeButton}
                                onPress={() => router.push('/(main)/reminders')}
                            >
                                <Text style={styles.takeButtonText}>VIEW DETAILS</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle" size={48} color="#2E8B57" />
                            <Text style={styles.emptyText}>All caught up!</Text>
                            <Text style={styles.emptySubtext}>No upcoming medications</Text>
                        </View>
                    )}
                </View>

                {/* Main Action Grid */}
                <Text style={styles.sectionTitle}>What would you like to do?</Text>

                <View style={styles.grid}>
                    {/* Row 1: Scan & Meds (Large) */}
                    <View style={styles.row}>
                        <ActionButton
                            title="SCAN"
                            icon="camera"
                            color="#4A90E2"
                            route="/(main)/scanner"
                            size="large"
                        />
                        <ActionButton
                            title="MY MEDS"
                            icon="medical"
                            color="#2E8B57"
                            route="/(main)/medications"
                            size="large"
                        />
                    </View>

                    {/* Row 2: Pharmacy & History */}
                    <View style={styles.row}>
                        <ActionButton
                            title="PHARMACY"
                            icon="cart"
                            color="#FF6B6B"
                            route="/(main)/cart"
                        />
                        <ActionButton
                            title="HISTORY"
                            icon="receipt"
                            color="#3498DB"
                            route="/(main)/orders"
                        />
                    </View>

                    {/* Row 3: Alerts & Help */}
                    <View style={styles.row}>
                        <ActionButton
                            title="REMINDERS"
                            icon="alarm"
                            color="#F39C12"
                            route="/(main)/reminders"
                        />
                        <ActionButton
                            title="HELP"
                            icon="chatbubbles"
                            color="#9B59B6"
                            route="/(main)/chatbot"
                        />
                    </View>

                    {/* Row 4: Profile */}
                    <View style={styles.row}>
                        <ActionButton
                            title="PROFILE"
                            icon="person"
                            color="#34495E"
                            route="/(main)/profile"
                        />
                        <View style={{ flex: 1 }} />
                    </View>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contentContainer: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    greeting: {
        fontSize: 18,
        color: '#666',
        marginBottom: 4,
    },
    userName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    profileIcon: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        backgroundColor: 'white',
        borderRadius: 25,
    },
    statusCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderLeftWidth: 6,
        borderLeftColor: '#2E8B57',
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E8B57',
        letterSpacing: 1,
    },
    medTime: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    medCount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        marginBottom: 12,
    },
    medList: {
        marginBottom: 20,
    },
    medListItem: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    moreText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 4,
    },
    takeButton: {
        backgroundColor: '#2E8B57',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    takeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 20,
        color: '#2E8B57',
        fontWeight: 'bold',
        marginTop: 10,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    grid: {
        gap: 15,
    },
    row: {
        flexDirection: 'row',
        gap: 15,
    },
    actionButton: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: 1.4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtonLarge: {
        aspectRatio: 1.1,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'center',
    },
    actionButtonTextLarge: {
        fontSize: 20,
        marginTop: 15,
    },
});
