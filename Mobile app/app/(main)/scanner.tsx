import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { geminiService } from '../../services/geminiService';
import { firebaseService } from '../../services/firebaseService';

export default function ScannerScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera roll permissions!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
      processImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera permissions!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
      processImage(result.assets[0].uri);
    }
  };

  const handleSearch = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to use this feature');
      return;
    }

    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a medicine name');
      return;
    }

    setIsSearching(true);

    try {
      // Use Gemini AI to get medicine info by name
      const medicineData = await geminiService.getMedicationInfo(searchQuery.trim());
      
      setScannedData(medicineData);
      setShowResult(true);
      setSearchQuery('');
    } catch (error: any) {
      Alert.alert('Search Failed', error.message || 'Could not find medicine information');
    } finally {
      setIsSearching(false);
    }
  };

  const processImage = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'Please login to use this feature');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Use Gemini AI to scan the medicine
      const medicineData = await geminiService.scanMedicine(uri);
      
      setScannedData(medicineData);
      setShowResult(true);
    } catch (error: any) {
      Alert.alert('Scan Failed', error.message || 'Could not identify medicine from image');
      setSelectedImage(null);
      setSelectedImageBase64(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMedication = async () => {
    if (!user || !scannedData) return;

    try {
      let prescriptionImageId = null;

      // Upload image if available
      if (selectedImageBase64) {
        prescriptionImageId = await firebaseService.uploadPrescriptionImage(selectedImageBase64);
      }

      const medication = {
        name: scannedData.name,
        dosage: scannedData.dosage || 'Not specified',
        type: scannedData.type || 'Tablet',
        frequency: 'Once daily', // Default, user can edit later
        instructions: scannedData.instructions || 'Take as directed',
        manufacturer: scannedData.manufacturer,
        expiryDate: scannedData.expiryDate,
        activeIngredient: scannedData.activeIngredient,
        scannedImage: selectedImage, // Keep local URI for immediate display if needed
        prescriptionImageId: prescriptionImageId,
        price: 0
      };

      await firebaseService.addMedication(user.id, medication);
      
      Alert.alert(
        'Success!',
        `${scannedData.name} has been added to your medications.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResult(false);
              setSelectedImage(null);
              setSelectedImageBase64(null);
              setScannedData(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Add medication error:', error);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowResult(false);
    setSelectedImage(null);
    setSelectedImageBase64(null);
    setScannedData(null);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Medication Scanner</Text>
      <Text style={styles.subtitle}>
        Scan prescription or medicine labels using AI to automatically add to your medications
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicine by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="search" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {!selectedImage ? (
        <View style={styles.scannerOptions}>
          <TouchableOpacity style={styles.optionCard} onPress={takePhoto}>
            <View style={styles.optionIcon}>
              <Ionicons name="camera" size={40} color="#2E8B57" />
            </View>
            <Text style={styles.optionTitle}>Take Photo</Text>
            <Text style={styles.optionDescription}>
              Use your camera to capture medicine labels or prescriptions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={pickImage}>
            <View style={styles.optionIcon}>
              <Ionicons name="image" size={40} color="#2E8B57" />
            </View>
            <Text style={styles.optionTitle}>Choose from Gallery</Text>
            <Text style={styles.optionDescription}>
              Select an existing photo of medication or prescription
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#2E8B57" />
              <Text style={styles.processingText}>Analyzing with AI...</Text>
              <Text style={styles.processingSubtext}>This may take a few seconds</Text>
            </View>
          )}

          {!isProcessing && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Enhanced Result Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Ionicons name="checkmark-circle" size={60} color="#2E8B57" />
                <Text style={styles.modalTitle}>Medicine Detected!</Text>
              </View>

              {scannedData && (
                <>
                  {/* Medicine Name & Basic Info */}
                  <View style={styles.section}>
                    <Text style={styles.medicineName}>{scannedData.name}</Text>
                    {scannedData.genericName && (
                      <Text style={styles.genericName}>
                        Generic: {scannedData.genericName}
                      </Text>
                    )}
                    {scannedData.dosage && (
                      <Text style={styles.dosageInfo}>{scannedData.dosage}</Text>
                    )}
                  </View>

                  {/* Description */}
                  {scannedData.description && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle" size={20} color="#2E8B57" />
                        <Text style={styles.sectionTitle}>Description</Text>
                      </View>
                      <Text style={styles.descriptionText}>{scannedData.description}</Text>
                    </View>
                  )}

                  {/* What It's Used For */}
                  {scannedData.uses && scannedData.uses.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="medkit" size={20} color="#2E8B57" />
                        <Text style={styles.sectionTitle}>What It's Used For</Text>
                      </View>
                      {scannedData.uses.map((use: string, index: number) => (
                        <View key={index} style={styles.bulletPoint}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.bulletText}>{use}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Benefits (Pros) */}
                  {scannedData.benefits && scannedData.benefits.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="thumbs-up" size={20} color="#2E8B57" />
                        <Text style={styles.sectionTitle}>Benefits</Text>
                      </View>
                      {scannedData.benefits.map((benefit: string, index: number) => (
                        <View key={index} style={styles.benefitItem}>
                          <Ionicons name="checkmark-circle" size={16} color="#2E8B57" />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Side Effects (Cons) */}
                  {scannedData.sideEffects && scannedData.sideEffects.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="warning" size={20} color="#FF6B6B" />
                        <Text style={styles.sectionTitle}>Possible Side Effects</Text>
                      </View>
                      {scannedData.sideEffects.map((effect: string, index: number) => (
                        <View key={index} style={styles.sideEffectItem}>
                          <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                          <Text style={styles.sideEffectText}>{effect}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Additional Details */}
                  <View style={styles.detailsGrid}>
                    {scannedData.type && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Type</Text>
                        <Text style={styles.detailValue}>{scannedData.type}</Text>
                      </View>
                    )}
                    {scannedData.manufacturer && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Manufacturer</Text>
                        <Text style={styles.detailValue}>{scannedData.manufacturer}</Text>
                      </View>
                    )}
                    {scannedData.activeIngredient && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Active Ingredient</Text>
                        <Text style={styles.detailValue}>{scannedData.activeIngredient}</Text>
                      </View>
                    )}
                    {scannedData.category && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Category</Text>
                        <Text style={styles.detailValue}>{scannedData.category}</Text>
                      </View>
                    )}
                  </View>

                  {/* Helpful Links */}
                  {scannedData.links && scannedData.links.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="link" size={20} color="#2E8B57" />
                        <Text style={styles.sectionTitle}>Learn More</Text>
                      </View>
                      {scannedData.links.map((link: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.linkButton}
                          onPress={() => openLink(link.url)}
                        >
                          <Text style={styles.linkTitle}>{link.title}</Text>
                          <Ionicons name="open-outline" size={16} color="#2E8B57" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Disclaimer */}
                  <View style={styles.disclaimer}>
                    <Ionicons name="shield-checkmark" size={16} color="#666" />
                    <Text style={styles.disclaimerText}>
                      This information is for educational purposes only. Always consult your healthcare provider before starting any medication.
                    </Text>
                  </View>
                </>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddMedication}
                >
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.addButtonText}>Add to My Medications</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.retryButtonText}>Scan Another</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tips Section */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>
          <Ionicons name="bulb" size={18} color="#FFA500" /> Scanning Tips
        </Text>
        <Text style={styles.tip}>✓ Ensure good lighting</Text>
        <Text style={styles.tip}>✓ Keep the label flat and in focus</Text>
        <Text style={styles.tip}>✓ Include the entire medication name</Text>
        <Text style={styles.tip}>✓ Avoid glare and shadows</Text>
        <Text style={styles.tip}>✓ Make sure text is clearly visible</Text>
      </View>

      {/* AI Info */}
      <View style={styles.aiInfo}>
        <Ionicons name="sparkles" size={16} color="#2E8B57" />
        <Text style={styles.aiInfoText}>
          Powered by Google Gemini AI for accurate medicine recognition
        </Text>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B57',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  scannerOptions: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  optionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  previewContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  processingOverlay: {
    position: 'absolute',
    top: '35%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 30,
    borderRadius: 15,
  },
  processingText: {
    marginTop: 15,
    fontSize: 18,
    color: '#2E8B57',
    fontWeight: '600',
  },
  processingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsSection: {
    marginHorizontal: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  aiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  aiInfoText: {
    fontSize: 12,
    color: '#2E8B57',
    fontWeight: '500',
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
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  medicineName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E8B57',
    textAlign: 'center',
    marginBottom: 8,
  },
  genericName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dosageInfo: {
    fontSize: 18,
    color: '#2E8B57',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#E8F5E8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 16,
    color: '#2E8B57',
    marginRight: 10,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#2E8B57',
    lineHeight: 20,
  },
  sideEffectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  sideEffectText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E8',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  linkTitle: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  modalActions: {
    gap: 15,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8B57',
    padding: 18,
    borderRadius: 15,
    gap: 10,
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
  },
  retryButton: {
    padding: 15,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});