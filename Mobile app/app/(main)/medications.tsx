import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addToCart } from '../../store/slices/cartSlice';
import { firebaseService } from '../../services/firebaseService';
import { serializeMedication } from '../../utils/Serializationutils';
import { Medication } from '../../store/types';

export default function MedicationsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [firestoreMedications, setFirestoreMedications] = useState<Medication[]>([]);
  const [scannedFirestoreMedications, setScannedFirestoreMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'regular' | 'scanned'>('regular');
  const [selectedRegularMeds, setSelectedRegularMeds] = useState<Set<string>>(new Set());
  const [selectedScannedMeds, setSelectedScannedMeds] = useState<Set<string>>(new Set());

  const [reminders, setReminders] = useState<any[]>([]);

  // Subscribe to real-time updates for medications and reminders
  useEffect(() => {
    if (user) {
      setLoading(true);
      
      // Subscribe to prescribed medications
      const unsubscribeMeds = firebaseService.subscribeToMedications(user.id, (meds) => {
        setFirestoreMedications(meds as Medication[]);
      });

      // Subscribe to scanned medications
      const unsubscribeScannedMeds = firebaseService.subscribeToScannedMedications(user.id, (meds) => {
        setScannedFirestoreMedications(meds as Medication[]);
      });

      // Subscribe to reminders
      const unsubscribeReminders = firebaseService.subscribeToReminders(user.id, (rems) => {
        setReminders(rems);
        setLoading(false); 
      });

      return () => {
        unsubscribeMeds();
        unsubscribeScannedMeds();
        unsubscribeReminders();
      };
    }
  }, [user]);

  // Derive prescribed medications by merging Firestore meds and pharmacy reminders
  const regularMedications = useMemo(() => {
    let allMeds = [...firestoreMedications];

    if (reminders && Array.isArray(reminders)) {
      const pharmacyMeds = reminders.map((r: any, index: number) => {
        // Extract name from various possible fields and clean it
        let medName = r.medication || r.medicationName || r.message || 'Prescribed Medication';
        // Remove "Take " prefix if present (case insensitive)
        medName = medName.replace(/^Take\s+/i, '').trim();

        return {
          id: `pharmacy_med_${index}`,
          name: medName,
          dosage: r.dosage || 'As prescribed',
          type: r.type || 'Prescription',
          frequency: r.frequency || r.days?.join(', ') || 'Daily',
          instructions: r.instructions || 'Take as directed by pharmacy',
          prescribedBy: 'Pharmacy',
          isActive: true,
          price: 0,
          isPharmacy: true,
          sideEffects: []
        } as Medication;
      });
      
      // Deduplicate pharmacyMeds by name first (to handle multiple reminders for the same med)
      const uniquePharmacyMedsMap = new Map();
      pharmacyMeds.forEach(med => {
        const normalizedName = med.name?.trim().toLowerCase();
        if (normalizedName && !uniquePharmacyMedsMap.has(normalizedName)) {
          uniquePharmacyMedsMap.set(normalizedName, med);
        }
      });
      
      const uniquePharmacyMeds = Array.from(uniquePharmacyMedsMap.values());

      // Filter out duplicates that already exist in firestoreMedications
      const existingNames = new Set(firestoreMedications.map(m => m.name?.trim().toLowerCase()));
      const newPharmacyMeds = uniquePharmacyMeds.filter(m => !existingNames.has(m.name?.trim().toLowerCase()));
      
      allMeds = [...allMeds, ...newPharmacyMeds];
    }
    
    return allMeds;
  }, [firestoreMedications, reminders]);

  // Scanned medications are now direct from the separate collection
  const scannedMedications = scannedFirestoreMedications;

  const filteredRegularMeds = regularMedications.filter(med =>
    med.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScannedMeds = scannedMedications.filter(med =>
    med.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time subscription handles updates, just simulate a delay for UX
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleAddToCart = (medication: any) => {
    // Serialize the medication to remove Firebase Timestamps
    const serializedMedication = serializeMedication({
      ...medication,
      price: medication.price || 0,
      type: medication.type || 'Tablet',
      instructions: medication.instructions || 'Take as directed'
    });

    dispatch(addToCart({
      medication: serializedMedication,
      pharmacyId: medication.pharmacyId || '1'
    }));

    Alert.alert('Success', `${medication.name} added to cart`);
  };

  const toggleMedicationSelection = (medId: string, type: 'regular' | 'scanned') => {
    if (type === 'regular') {
      const newSelected = new Set(selectedRegularMeds);
      if (newSelected.has(medId)) {
        newSelected.delete(medId);
      } else {
        newSelected.add(medId);
      }
      setSelectedRegularMeds(newSelected);
    } else {
      const newSelected = new Set(selectedScannedMeds);
      if (newSelected.has(medId)) {
        newSelected.delete(medId);
      } else {
        newSelected.add(medId);
      }
      setSelectedScannedMeds(newSelected);
    }
  };

  const handleBulkAddToCart = (type: 'regular' | 'scanned') => {
    const selectedSet = type === 'regular' ? selectedRegularMeds : selectedScannedMeds;
    const sourceList = type === 'regular' ? regularMedications : scannedMedications;
    const medsToAdd = sourceList.filter(med => selectedSet.has(med.id));

    if (medsToAdd.length === 0) {
      Alert.alert('No Selection', 'Please select medications to add to cart');
      return;
    }

    medsToAdd.forEach(med => {
      // Serialize each medication before adding to cart
      const serializedMedication = serializeMedication({
        ...med,
        price: med.price || 0,
        type: med.type || 'Tablet',
        instructions: med.instructions || 'Take as directed'
      });

      dispatch(addToCart({
        medication: serializedMedication,
        pharmacyId: med.pharmacyId || '1'
      }));
    });

    Alert.alert('Success', `${medsToAdd.length} medication(s) added to cart`);
    
    // Clear selections
    if (type === 'regular') {
      setSelectedRegularMeds(new Set());
    } else {
      setSelectedScannedMeds(new Set());
    }
  };

  const handleDeleteMedication = (medicationId: string, medicationName: string, isScanned: boolean) => {
    if (!user) return;

    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medicationName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isScanned) {
                await firebaseService.deleteScannedMedication(user.id, medicationId);
              } else {
                await firebaseService.deleteMedication(user.id, medicationId);
              }
              Alert.alert('Success', 'Medication deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medication');
            }
          }
        }
      ]
    );
  };

  const renderMedicationCard = (medication: any, type: 'regular' | 'scanned') => {
    const isSelected = type === 'regular' 
      ? selectedRegularMeds.has(medication.id)
      : selectedScannedMeds.has(medication.id);

    return (
      <TouchableOpacity
        key={medication.id}
        style={[styles.medicationCard, isSelected && styles.medicationCardSelected]}
        onPress={() => setSelectedMedication(medication)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleMedicationSelection(medication.id, type)}
        >
          <Ionicons 
            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isSelected ? "#2E8B57" : "#ccc"} 
          />
        </TouchableOpacity>

        <View style={styles.medicationInfo}>
          <View style={styles.medicationHeader}>
            <Text style={styles.medName}>{medication.name}</Text>
            {medication.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.medDosage}>
            {medication.dosage} • {medication.type || 'Tablet'}
          </Text>
          <Text style={styles.medFrequency}>{medication.frequency}</Text>
          {medication.price > 0 && (
            <Text style={styles.medPrice}>${medication.price.toFixed(2)}</Text>
          )}
          {medication.prescribedBy && (
            <Text style={styles.prescribedBy}>
              Prescribed by {medication.prescribedBy}
            </Text>
          )}
          {medication.refillsRemaining !== undefined && (
            <Text style={styles.refillInfo}>
              Refills: {medication.refillsRemaining}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => handleAddToCart(medication)}
        >
          <Ionicons name="cart" size={20} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading medications...</Text>
      </View>
    );
  }

  if (selectedMedication) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedMedication(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#2E8B57" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Medication Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.detailContainer}>
          <Text style={styles.detailMedName}>{selectedMedication.name}</Text>
          <Text style={styles.detailDosage}>
            {selectedMedication.dosage} • {selectedMedication.type || 'Tablet'}
          </Text>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.sectionText}>
              {selectedMedication.instructions || 'Take as directed by your healthcare provider'}
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <Text style={styles.sectionText}>
              {selectedMedication.frequency || 'As prescribed'}
            </Text>
          </View>

          {selectedMedication.prescribedBy && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Prescribed By</Text>
              <Text style={styles.sectionText}>{selectedMedication.prescribedBy}</Text>
            </View>
          )}

          {selectedMedication.startDate && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Start Date</Text>
              <Text style={styles.sectionText}>
                {new Date(selectedMedication.startDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {selectedMedication.manufacturer && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Manufacturer</Text>
              <Text style={styles.sectionText}>{selectedMedication.manufacturer}</Text>
            </View>
          )}

          {selectedMedication.activeIngredient && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Active Ingredient</Text>
              <Text style={styles.sectionText}>{selectedMedication.activeIngredient}</Text>
            </View>
          )}

          {selectedMedication.sideEffects && selectedMedication.sideEffects.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Possible Side Effects</Text>
              {selectedMedication.sideEffects.map((effect: string, index: number) => (
                <Text key={index} style={styles.sideEffect}>• {effect}</Text>
              ))}
            </View>
          )}

          <View style={styles.priceSection}>
          {selectedMedication.price !== undefined && selectedMedication.price > 0 && (
            <Text style={styles.price}>${selectedMedication.price.toFixed(2)}</Text>
          )}
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={() => {
                handleAddToCart(selectedMedication);
                setSelectedMedication(null);
              }}
            >
              <Ionicons name="cart" size={20} color="white" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => {
              // Determine if it's a scanned medication based on the current tab or property
              // Since we are in detail view, we might not know the source tab easily unless we passed it or check properties
              // A safe bet is checking isPharmacy flag or scannedImage
              const isScanned = !selectedMedication.isPharmacy && (!!selectedMedication.scannedImage || !selectedMedication.prescribedBy);
              handleDeleteMedication(selectedMedication.id, selectedMedication.name, isScanned);
              setSelectedMedication(null);
            }}
          >
            <Ionicons name="trash" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete Medication</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <TouchableOpacity 
          style={styles.cartIcon}
          onPress={() => router.push('/(main)/cart')}
        >
          <Ionicons name="cart" size={26} color="#2E8B57" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'regular' && styles.tabActive]}
          onPress={() => setSelectedTab('regular')}
        >
          <Ionicons 
            name="medical" 
            size={20} 
            color={selectedTab === 'regular' ? '#2E8B57' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'regular' && styles.tabTextActive]}>
            Prescribed ({regularMedications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'scanned' && styles.tabActive]}
          onPress={() => setSelectedTab('scanned')}
        >
          <Ionicons 
            name="scan" 
            size={20} 
            color={selectedTab === 'scanned' ? '#2E8B57' : '#666'} 
          />
          <Text style={[styles.tabText, selectedTab === 'scanned' && styles.tabTextActive]}>
            Scanned ({scannedMedications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.medicationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E8B57']} />
        }
      >
        {selectedTab === 'regular' ? (
          <>
            {filteredRegularMeds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={80} color="#ccc" />
                <Text style={styles.emptyTitle}>No Prescribed Medications</Text>
                <Text style={styles.emptyText}>
                  Medications prescribed by your doctor will appear here
                </Text>
              </View>
            ) : (
              <>
                {filteredRegularMeds.map((med) => renderMedicationCard(med, 'regular'))}
                
                {selectedRegularMeds.size > 0 && (
                  <TouchableOpacity
                    style={styles.bulkAddButton}
                    onPress={() => handleBulkAddToCart('regular')}
                  >
                    <Ionicons name="cart" size={22} color="white" />
                    <Text style={styles.bulkAddText}>
                      Add {selectedRegularMeds.size} Selected to Cart
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {filteredScannedMeds.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="scan-outline" size={80} color="#ccc" />
                <Text style={styles.emptyTitle}>No Scanned Medications</Text>
                <Text style={styles.emptyText}>
                  Use the scanner to add medications by scanning labels
                </Text>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => router.push('/(main)/scanner')}
                >
                  <Ionicons name="scan" size={20} color="white" />
                  <Text style={styles.scanButtonText}>Scan Medicine</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {filteredScannedMeds.map((med) => renderMedicationCard(med, 'scanned'))}
                
                {selectedScannedMeds.size > 0 && (
                  <TouchableOpacity
                    style={styles.bulkAddButton}
                    onPress={() => handleBulkAddToCart('scanned')}
                  >
                    <Ionicons name="cart" size={22} color="white" />
                    <Text style={styles.bulkAddText}>
                      Add {selectedScannedMeds.size} Selected to Cart
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={16} color="#2E8B57" />
        <Text style={styles.infoText}>
          Select multiple medications and add them to cart at once
        </Text>
      </View>
    </View>
  );
}

// Styles remain the same as before...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  cartIcon: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2E8B57',
    fontWeight: '600',
  },
  medicationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  medicationCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  medicationCardSelected: {
    borderColor: '#2E8B57',
    backgroundColor: '#F0F8F0',
  },
  checkbox: {
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activeBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#2E8B57',
    fontWeight: '600',
  },
  medDosage: {
    fontSize: 14,
    color: '#2E8B57',
    marginTop: 2,
  },
  medFrequency: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  medPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  prescribedBy: {
    fontSize: 11,
    color: '#4A90E2',
    marginTop: 2,
    fontStyle: 'italic',
  },
  refillInfo: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2E8B57',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  bulkAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8B57',
    padding: 16,
    borderRadius: 12,
    marginVertical: 15,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  bulkAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    gap: 8,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#2E8B57',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailContainer: {
    flex: 1,
    padding: 20,
  },
  detailMedName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 8,
  },
  detailDosage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sideEffect: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  addToCartButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addToCartText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});