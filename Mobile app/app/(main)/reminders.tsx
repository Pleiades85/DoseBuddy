import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSelector } from 'react-redux';
import { firebaseService } from '../../services/firebaseService';
import { RootState } from '../../store';
import { Reminder } from '../../store/types';

export default function RemindersScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [takenReminders, setTakenReminders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Add Reminder State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (user) {
      loadReminders();

      // Subscribe to real-time updates
      const unsubscribe = firebaseService.subscribeToReminders(user.id, (data) => {
        setReminders(data as Reminder[]);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await firebaseService.getUserReminders(user.id);
      setReminders(data as Reminder[]);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Error', 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleToggleReminder = async (reminderId: string, currentState: boolean) => {
    if (!user) return;

    try {
      await firebaseService.toggleReminder(user.id, reminderId, !currentState);
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = (reminderId: string, isPharmacy: boolean) => {
    if (!user) return;

    if (isPharmacy) {
      Alert.alert('Restricted', 'This reminder was set by your pharmacy and cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.deleteReminder(user.id, reminderId);
              Alert.alert('Success', 'Reminder deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder');
            }
          }
        },
      ]
    );
  };

  const handleEditNote = (reminder: Reminder) => {
    setEditingNoteId(reminder.id);
    setNoteText(reminder.note || '');
  };

  const handleSaveNote = async (reminderId: string) => {
    if (!user) return;

    try {
      await firebaseService.updateReminder(user.id, reminderId, { note: noteText });
      setEditingNoteId(null);
      setNoteText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleMarkTaken = (reminderId: string) => {
    const newTaken = new Set(takenReminders);
    if (newTaken.has(reminderId)) {
      newTaken.delete(reminderId);
    } else {
      newTaken.add(reminderId);
      Alert.alert('Great Job!', 'Medication marked as taken.');
    }
    setTakenReminders(newTaken);
  };

  const handleAddReminder = async () => {
    if (!user) return;

    if (!newMedName.trim() || !newMedTime.trim()) {
      Alert.alert('Missing Info', 'Please enter medication name and time.');
      return;
    }

    // Simple time validation (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newMedTime)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24h), e.g., 08:30 or 14:00.');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one day.');
      return;
    }

    try {
      await firebaseService.addReminder(user.id, {
        medication: newMedName,
        time: newMedTime,
        days: selectedDays,
        enabled: true,
        isPharmacy: false,
        note: ''
      });

      setShowAddModal(false);
      setNewMedName('');
      setNewMedTime('');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      Alert.alert('Success', 'Reminder added successfully!');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder');
    }
  };

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Group reminders by time
  const groupedReminders = useMemo(() => {
    const groups: { [key: string]: Reminder[] } = {};
    reminders.forEach(reminder => {
      if (!groups[reminder.time]) {
        groups[reminder.time] = [];
      }
      groups[reminder.time].push(reminder);
    });
    return groups;
  }, [reminders]);

  const toggleGroup = (time: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(time)) {
      newExpanded.delete(time);
    } else {
      newExpanded.add(time);
    }
    setExpandedGroups(newExpanded);
  };

  // Auto-expand groups with upcoming reminders (optional enhancement)
  useEffect(() => {
    if (reminders.length > 0 && expandedGroups.size === 0) {
      // Expand the first group by default
      const sortedTimes = Object.keys(groupedReminders).sort();
      if (sortedTimes.length > 0) {
        setExpandedGroups(new Set([sortedTimes[0]]));
      }
    }
  }, [groupedReminders]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medication Reminders</Text>

      <ScrollView
        style={styles.remindersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E8B57']} />
        }
      >
        {Object.keys(groupedReminders).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Reminders Set</Text>
            <Text style={styles.emptyText}>
              Add reminders to never miss your medication schedule
            </Text>
          </View>
        ) : (
          Object.entries(groupedReminders).sort((a, b) => a[0].localeCompare(b[0])).map(([time, groupReminders]) => (
            <View key={time} style={styles.timeGroup}>
              <TouchableOpacity
                style={styles.timeHeader}
                onPress={() => toggleGroup(time)}
                activeOpacity={0.7}
              >
                <View style={styles.timeHeaderLeft}>
                  <Ionicons name="time" size={24} color="white" />
                  <Text style={styles.timeHeaderText}>{formatTime(time)}</Text>
                </View>
                <View style={styles.timeHeaderRight}>
                  <Text style={styles.medCountText}>{groupReminders.length} Meds</Text>
                  <Ionicons
                    name={expandedGroups.has(time) ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="white"
                  />
                </View>
              </TouchableOpacity>

              {expandedGroups.has(time) && (
                <View style={styles.groupContent}>
                  {groupReminders.map((reminder) => {
                    const isPharmacy = reminder.isPharmacy;
                    const isTaken = takenReminders.has(reminder.id);

                    return (
                      <View key={reminder.id} style={[styles.reminderCard, isTaken && styles.reminderCardTaken]}>
                        <View style={styles.reminderHeader}>
                          <View style={styles.medicineInfo}>
                            <Text style={styles.medicineName}>
                              {reminder.medication || (reminder as any).medicationName || ((reminder as any).message ? (reminder as any).message.replace(/^Take\s+/i, '') : 'Medication')}
                            </Text>
                            <Text style={styles.daysText}>
                              {reminder.days?.join(', ') || 'Daily'}
                            </Text>
                            {isPharmacy && (
                              <View style={styles.pharmacyBadge}>
                                <Ionicons name="medkit" size={12} color="#4A90E2" />
                                <Text style={styles.pharmacyBadgeText}>Pharmacy Prescribed</Text>
                              </View>
                            )}
                          </View>
                          <Switch
                            value={reminder.enabled}
                            onValueChange={() => handleToggleReminder(reminder.id, !!reminder.enabled)}
                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                            thumbColor={reminder.enabled ? '#2E8B57' : '#f4f3f4'}
                            disabled={isPharmacy}
                          />
                        </View>

                        {/* Note Section */}
                        <View style={styles.noteSection}>
                          {editingNoteId === reminder.id ? (
                            <View style={styles.noteEditContainer}>
                              <TextInput
                                style={styles.noteInput}
                                value={noteText}
                                onChangeText={setNoteText}
                                placeholder="Add a note (e.g., take with food)"
                                autoFocus
                              />
                              <TouchableOpacity onPress={() => handleSaveNote(reminder.id)}>
                                <Ionicons name="checkmark-circle" size={24} color="#2E8B57" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.noteDisplay}
                              onPress={() => handleEditNote(reminder)}
                            >
                              <Ionicons name="document-text-outline" size={16} color="#666" />
                              <Text style={styles.noteText}>
                                {reminder.note || 'Add a note...'}
                              </Text>
                              <Ionicons name="pencil-outline" size={14} color="#999" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.actions}>
                          <TouchableOpacity
                            style={[styles.takenButton, isTaken && styles.takenButtonActive]}
                            onPress={() => handleMarkTaken(reminder.id)}
                          >
                            <Ionicons
                              name={isTaken ? "checkmark-circle" : "ellipse-outline"}
                              size={20}
                              color={isTaken ? "white" : "#2E8B57"}
                            />
                            <Text style={[styles.takenButtonText, isTaken && styles.takenButtonTextActive]}>
                              {isTaken ? 'Taken' : 'Mark as Taken'}
                            </Text>
                          </TouchableOpacity>

                          {!isPharmacy && (
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteReminder(reminder.id, !!isPharmacy)}
                            >
                              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Reminder</Text>
      </TouchableOpacity>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Reminder</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Medication Name</Text>
                <TextInput
                  style={styles.input}
                  value={newMedName}
                  onChangeText={setNewMedName}
                  placeholder="e.g., Vitamin C"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time (24h Format)</Text>
                <TextInput
                  style={styles.input}
                  value={newMedTime}
                  onChangeText={setNewMedTime}
                  placeholder="e.g., 08:30 or 14:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Days</Text>
                <View style={styles.daysContainer}>
                  {DAYS.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day) && styles.dayButtonSelected
                      ]}
                      onPress={() => toggleDaySelection(day)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        selectedDays.includes(day) && styles.dayButtonTextSelected
                      ]}>{day[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddReminder}
              >
                <Text style={styles.saveButtonText}>Save Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 20,
    textAlign: 'center',
  },
  remindersList: {
    flex: 1,
  },
  timeGroup: {
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    padding: 15,
  },
  timeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeHeaderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medCountText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  groupContent: {
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  reminderCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  reminderCardTaken: {
    opacity: 0.7,
    backgroundColor: '#f0f8f0',
    borderLeftColor: '#ccc',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  daysText: {
    fontSize: 12,
    color: '#666',
  },
  pharmacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  pharmacyBadgeText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '500',
  },
  noteSection: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
  noteEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#2E8B57',
    paddingVertical: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  takenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2E8B57',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    gap: 4,
    flex: 1,
    marginRight: 10,
  },
  takenButtonActive: {
    backgroundColor: '#2E8B57',
  },
  takenButtonText: {
    color: '#2E8B57',
    fontWeight: '600',
    fontSize: 13,
  },
  takenButtonTextActive: {
    color: 'white',
  },
  deleteButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8B57',
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#2E8B57',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#2E8B57',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});