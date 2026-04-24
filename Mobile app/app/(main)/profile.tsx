import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useDispatch, useSelector } from 'react-redux';
import { addDoc, collection, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { authService } from '../../services/authService';
import { firebaseService } from '../../services/firebaseService';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { Log } from '../../store/types';
import { sha256 } from '../../utils/helpers';

export default function ProfileScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [shareMode, setShareMode] = useState<'family' | 'pharmacy' | null>(null);
  const [pharmacyList, setPharmacyList] = useState<any[]>([]);
  const [activeShares, setActiveShares] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [sendingShare, setSendingShare] = useState(false);
  const [pharmacySearch, setPharmacySearch] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchLogs();
      loadPharmacyData();
    }
  }, [user]);

  const fetchLogs = async () => {
    if (!user?.id) return;
    setLoadingLogs(true);
    try {
      const fetchedLogs = await firebaseService.getPatientLogs(user.id);
      setLogs(fetchedLogs as Log[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const generateAccessCode = async () => {
    if (!user?.id) return;

    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash it
      const hash = await sha256(code);

      // Store in Firestore
      // Expiry: 1 year from now
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await addDoc(collection(db, 'patients', user.id, 'accessCodes'), {
        accessCodeHash: hash,
        relation: 'Family', // Default to Family for now
        sharedWith: 'Family Member',
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        createdBy: user.id
      });

      setAccessCode(code);
    } catch (error) {
      console.error('Error generating access code:', error);
      Alert.alert('Error', 'Failed to generate access code');
    }
  };

  const handleShareProfile = async () => {
    // Restriction for "Friend" / Guest users / Non-Patients
    const isGuest = (user?.relation && user.relation !== 'Patient') || user?.personalInfo?.firstName === 'Friend';

    if (isGuest) {
      Alert.alert('Access Denied', 'Only the patient can share this medical profile.');
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // If no hardware, allow access (or could be strict and deny)
        // For now, allowing to prevent lockout on older devices/simulators
        setShowShareModal(true);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Security', 'Please set up FaceID or TouchID to use this feature.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to share your Medical ID',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        await generateAccessCode();
        setShowShareModal(true);
      } else {
        Alert.alert('Authentication Failed', 'You must authenticate to share your profile.');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  // Load pharmacy list when share mode switches to pharmacy
  useEffect(() => {
    if (shareMode === 'pharmacy' && user?.id) {
      loadPharmacyData();
    }
  }, [shareMode]);

  const loadPharmacyData = async () => {
    if (!user?.id) return;
    setLoadingPharmacies(true);
    try {
      const [pharmacies, shares] = await Promise.all([
        firebaseService.getAllPharmacies(),
        firebaseService.getPatientShares(user.id),
      ]);
      setPharmacyList(pharmacies);
      setActiveShares(shares);
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const handleSendPharmacyShare = async (pharmacy: any) => {
    if (!user?.id) return;
    const pharmacyShareCount = activeShares.filter((s: any) => s.type === 'pharmacy').length;
    if (pharmacyShareCount >= 5) {
      Alert.alert('Limit Reached', 'You can share with a maximum of 5 pharmacies. Revoke an existing share first.');
      return;
    }

    // The original pharmacy (where patient was registered) must approve
    const originalPharmacyId = user.assignedPharmacy?.pharmacyId;
    const originalPharmacyName = user.assignedPharmacy?.pharmacyName || 'Original Pharmacy';

    if (!originalPharmacyId) {
      Alert.alert('Error', 'No original pharmacy found. Please contact support.');
      return;
    }

    if (pharmacy.id === originalPharmacyId) {
      Alert.alert('Already Linked', 'This is your original pharmacy. You are already linked.');
      return;
    }

    Alert.alert(
      'Share Profile',
      `Send a share request to ${pharmacy.name}? Your original pharmacy (${originalPharmacyName}) will need to approve before access is granted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            setSendingShare(true);
            try {
              await addDoc(collection(db, 'shareRequests'), {
                patientId: user.id,
                patientName: `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim(),
                pharmacyId: pharmacy.id,  // Target pharmacy (being shared TO)
                pharmacyName: pharmacy.name || 'Unknown',
                approverPharmacyId: originalPharmacyId,  // Original pharmacy (must approve)
                approverPharmacyName: originalPharmacyName,
                type: 'pharmacy',
                status: 'pending',
                requestedBy: user.id,
                requestedAt: Timestamp.now(),
                respondedAt: null,
              });
              // Notify the ORIGINAL pharmacy for approval (not the target)
              await addDoc(collection(db, 'pharmacies', originalPharmacyId, 'notifications'), {
                type: 'share_request',
                title: 'Profile Share Approval Needed',
                message: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName} wants to share their profile with ${pharmacy.name}. Your approval is required.`,
                patientId: user.id,
                targetPharmacyName: pharmacy.name,
                read: false,
                createdAt: Timestamp.now(),
              });
              Alert.alert('Request Sent', `Share request sent. ${originalPharmacyName} will review and approve.`);
              await loadPharmacyData(); // Refresh
            } catch (error) {
              console.error('Error sending share:', error);
              Alert.alert('Error', 'Failed to send share request.');
            } finally {
              setSendingShare(false);
            }
          }
        }
      ]
    );
  };

  const handleRevokeAccess = (share: any) => {
    Alert.alert(
      'Remove Access',
      `Are you sure you want to revoke ${share.pharmacyName || 'this pharmacy'}'s access to your profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the shareRequest document
              await deleteDoc(doc(db, 'shareRequests', share.id));

              // Also remove from authorizedPharmacies if it was approved
              if (share.status === 'approved' && user?.id) {
                try {
                  await deleteDoc(doc(db, 'patients', user.id, 'authorizedPharmacies', share.pharmacyId));
                } catch (e) {
                  // May not exist, that's fine
                }
              }

              Alert.alert('Access Removed', `${share.pharmacyName || 'Pharmacy'} no longer has access to your profile.`);
              await loadPharmacyData();
            } catch (error) {
              console.error('Error revoking access:', error);
              Alert.alert('Error', 'Failed to remove access. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              dispatch(logout());
              router.replace('/(main)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleContactPharmacy = () => {
    Alert.alert(
      'Contact Pharmacy',
      'To update your profile information, please contact your pharmacy or healthcare provider.',
      [
        { text: 'OK' }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
      </View>
    );
  }

  const medicalIdData = JSON.stringify({
    name: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`,
    dob: user.personalInfo?.dateOfBirth,
    bloodType: user.medicalSummary?.bloodType,
    allergies: user.medicalSummary?.allergies,
    conditions: user.medicalSummary?.chronicConditions,
    emergencyContact: user.emergencyContact
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Viewer Identity Banner */}
        {user?.relation && user.relation !== 'Patient' && (
          <View style={styles.viewerBanner}>
            <Ionicons name="eye" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.viewerText}>
              Viewing as {user.relation === 'Family' ? 'Family Member' : user.relation}
              {user.roleName ? `: ${user.roleName}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareProfile}
          >
            <Ionicons name="qr-code" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={50} color="#2E8B57" />
        </View>
        <Text style={styles.name}>
          {user.personalInfo?.firstName} {user.personalInfo?.lastName}
        </Text>
        <Text style={styles.email}>{user.personalInfo?.email}</Text>

        {/* Read-Only Badge */}
        <View style={styles.readOnlyBadge}>
          <Ionicons name="lock-closed" size={14} color="#666" />
          <Text style={styles.readOnlyText}>Profile Managed by Pharmacy</Text>
        </View>

        <TouchableOpacity
          style={styles.shareIdButton}
          onPress={handleShareProfile}
        >
          <Ionicons name="share-social" size={18} color="#2E8B57" />
          <Text style={styles.shareIdText}>Share Medical ID</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactPharmacy}
          >
            <Ionicons name="call-outline" size={16} color="#2E8B57" />
            <Text style={styles.contactButtonText}>Update Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#2E8B57" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.personalInfo?.phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#2E8B57" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user.personalInfo?.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="water-outline" size={20} color="#2E8B57" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Blood Type</Text>
              <Text style={styles.infoValue}>{user.medicalSummary?.bloodType || 'Not set'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#2E8B57" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.medicalSection}>
            <Text style={styles.medicalLabel}>
              <Ionicons name="warning" size={16} color="#FF6B6B" /> Allergies
            </Text>
            {user.medicalSummary?.allergies && user.medicalSummary.allergies.length > 0 ? (
              <View style={styles.tagsContainer}>
                {user.medicalSummary.allergies.map((allergy, index) => (
                  <View key={index} style={[styles.tag, styles.allergyTag]}>
                    <Text style={styles.allergyTagText}>{allergy}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noData}>No allergies recorded</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.medicalSection}>
            <Text style={styles.medicalLabel}>
              <Ionicons name="medical" size={16} color="#2E8B57" /> Conditions
            </Text>
            {user.medicalSummary?.chronicConditions && user.medicalSummary.chronicConditions.length > 0 ? (
              <View style={styles.tagsContainer}>
                {user.medicalSummary.chronicConditions.map((condition, index) => (
                  <View key={index} style={[styles.tag, styles.conditionTag]}>
                    <Text style={styles.conditionTagText}>{condition}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noData}>No conditions recorded</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>

        <View style={[styles.infoCard, styles.emergencyCard]}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="call" size={24} color="#FF6B6B" />
            <Text style={styles.emergencyTitle}>Emergency Contact</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#FF6B6B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user.emergencyContact?.name || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#FF6B6B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.emergencyContact?.phone || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Relationship</Text>
              <Text style={styles.infoValue}>{user.emergencyContact?.relationship || 'Not set'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Activity Logs Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={fetchLogs}>
            <Ionicons name="refresh" size={20} color="#2E8B57" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          {loadingLogs ? (
            <ActivityIndicator size="small" color="#2E8B57" />
          ) : logs.length > 0 ? (
            logs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logIconContainer}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logDetails}>{log.details}</Text>
                  <Text style={styles.logTime}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No recent activity</Text>
          )}
        </View>
      </View>

      {/* Linked Pharmacies Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked Pharmacies</Text>
          <TouchableOpacity onPress={loadPharmacyData}>
            <Ionicons name="refresh" size={20} color="#2E8B57" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          {/* Always show the original pharmacy first */}
          {user?.assignedPharmacy?.pharmacyId && (
            <View style={styles.linkedPharmacyRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15, color: '#333' }}>
                    {user.assignedPharmacy.pharmacyName || 'Primary Pharmacy'}
                  </Text>
                  <View style={{ backgroundColor: '#E8F5E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: '#2E8B57', fontWeight: '700' }}>PRIMARY</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  Registered pharmacy • Cannot be removed
                </Text>
              </View>
              <View style={[styles.shareStatusBadge, { backgroundColor: '#E8F5E8' }]}>
                <Ionicons name="shield-checkmark" size={14} color="#2E8B57" />
                <Text style={[styles.shareStatusText, { color: '#2E8B57' }]}>Protected</Text>
              </View>
            </View>
          )}

          {/* Show shared pharmacies from activeShares */}
          {activeShares.filter((s: any) => s.type === 'pharmacy').length > 0 ? (
            activeShares
              .filter((s: any) => s.type === 'pharmacy')
              .map((share: any) => {
                const isOriginal = share.pharmacyId === user?.assignedPharmacy?.pharmacyId;
                if (isOriginal) return null; // Skip - already shown above
                
                return (
                  <View key={share.id} style={styles.linkedPharmacyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 15, color: '#333' }}>
                        {share.pharmacyName || 'Unknown Pharmacy'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        Requested {share.requestedAt?.seconds 
                          ? new Date(share.requestedAt.seconds * 1000).toLocaleDateString()
                          : share.requestedAt 
                            ? new Date(share.requestedAt).toLocaleDateString()
                            : 'recently'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[
                        styles.shareStatusBadge,
                        share.status === 'approved' && { backgroundColor: '#E8F5E8' },
                        share.status === 'pending' && { backgroundColor: '#FEF3C7' },
                        share.status === 'rejected' && { backgroundColor: '#FFE8E8' },
                      ]}>
                        <Ionicons 
                          name={share.status === 'approved' ? 'checkmark-circle' : share.status === 'pending' ? 'time' : 'close-circle'} 
                          size={14} 
                          color={share.status === 'approved' ? '#2E8B57' : share.status === 'pending' ? '#F59E0B' : '#EF4444'} 
                        />
                        <Text style={[
                          styles.shareStatusText,
                          share.status === 'approved' && { color: '#2E8B57' },
                          share.status === 'pending' && { color: '#F59E0B' },
                          share.status === 'rejected' && { color: '#EF4444' },
                        ]}>
                          {share.status === 'approved' ? 'Connected' : share.status === 'pending' ? 'Pending' : 'Rejected'}
                        </Text>
                      </View>
                      {/* Remove button */}
                      <TouchableOpacity 
                        onPress={() => handleRevokeAccess(share)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
          ) : !user?.assignedPharmacy?.pharmacyId ? (
            <View style={{ alignItems: 'center', padding: 15 }}>
              <Ionicons name="business-outline" size={30} color="#ccc" />
              <Text style={[styles.noData, { marginTop: 8 }]}>No linked pharmacies yet</Text>
              <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 }}>
                Tap "Share Medical ID" to connect with a pharmacy
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#2E8B57" />
        <Text style={styles.infoBannerText}>
          Your profile information is managed by your pharmacy. To make changes, please contact them directly.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>DoseBuddy v1.0</Text>
        <Text style={styles.footerSubtext}>Patient Portal</Text>
      </View>

      {/* Share Modal — Dual Flow */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowShareModal(false); setShareMode(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {shareMode === 'family' ? 'Share with Family' : shareMode === 'pharmacy' ? 'Share with Pharmacy' : 'Share Profile'}
              </Text>
              <TouchableOpacity onPress={() => { setShowShareModal(false); setShareMode(null); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Choice Screen */}
            {!shareMode && (
              <View style={{ gap: 12, width: '100%' }}>
                <TouchableOpacity style={styles.shareOptionCard} onPress={() => setShareMode('family')}>
                  <View style={[styles.shareOptionIcon, { backgroundColor: '#E8F5E8' }]}>
                    <Ionicons name="people" size={28} color="#2E8B57" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Family / Caregiver</Text>
                    <Text style={styles.shareOptionDesc}>Generate QR code & access code</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareOptionCard} onPress={() => setShareMode('pharmacy')}>
                  <View style={[styles.shareOptionIcon, { backgroundColor: '#E8F0FE' }]}>
                    <Ionicons name="business" size={28} color="#4A90E2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareOptionTitle}>Pharmacy</Text>
                    <Text style={styles.shareOptionDesc}>Send request to a pharmacy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={styles.secureBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#2E8B57" />
                  <Text style={styles.secureText}>Data is not shared until approved</Text>
                </View>
              </View>
            )}

            {/* Family QR Flow */}
            {shareMode === 'family' && (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <View style={styles.qrContainer}>
                  <QRCode value={medicalIdData} size={200} color="black" backgroundColor="white" />
                </View>

                {accessCode && (
                  <View style={styles.accessCodeContainer}>
                    <Text style={styles.accessCodeLabel}>ACCESS CODE (FAMILY)</Text>
                    <Text style={styles.accessCodeValue}>{accessCode}</Text>
                    <Text style={styles.accessCodeNote}>
                      Share this code with <Text style={{ fontWeight: 'bold' }}>Family</Text>.
                    </Text>
                  </View>
                )}

                <Text style={styles.qrWarning}>Only share with trusted people.</Text>

                <TouchableOpacity style={styles.backToChoiceBtn} onPress={() => setShareMode(null)}>
                  <Ionicons name="arrow-back" size={16} color="#2E8B57" />
                  <Text style={{ color: '#2E8B57', fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pharmacy Share Flow */}
            {shareMode === 'pharmacy' && (
              <View style={{ width: '100%' }}>
                {loadingPharmacies ? (
                  <ActivityIndicator size="large" color="#2E8B57" style={{ marginVertical: 30 }} />
                ) : (
                  <>
                    <Text style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                      Select a pharmacy to share your profile ({activeShares.filter(s => s.type === 'pharmacy').length}/5 used)
                    </Text>

                    {/* Search Bar */}
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: '#f0f0f0', borderRadius: 10,
                      paddingHorizontal: 12, marginBottom: 12,
                    }}>
                      <Ionicons name="search" size={18} color="#999" />
                      <TextInput
                        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 }}
                        placeholder="Search pharmacies..."
                        placeholderTextColor="#999"
                        value={pharmacySearch}
                        onChangeText={setPharmacySearch}
                      />
                      {pharmacySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setPharmacySearch('')}>
                          <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={{ maxHeight: 280 }}>
                      {(() => {
                        // Get IDs of already linked/pending pharmacies and original pharmacy
                        const linkedIds = new Set(
                          activeShares
                            .filter((s: any) => s.type === 'pharmacy' && ['pending', 'approved'].includes(s.status))
                            .map((s: any) => s.pharmacyId)
                        );
                        const originalId = user?.assignedPharmacy?.pharmacyId;

                        // Filter: exclude linked, exclude original, apply search, limit 5
                        const filtered = pharmacyList
                          .filter((p: any) => p.id !== originalId)
                          .filter((p: any) => !linkedIds.has(p.id))
                          .filter((p: any) => {
                            if (!pharmacySearch.trim()) return true;
                            const q = pharmacySearch.toLowerCase();
                            const name = (p.name || '').toLowerCase();
                            const city = (p.address?.city || '').toLowerCase();
                            const street = (p.address?.street || '').toLowerCase();
                            return name.includes(q) || city.includes(q) || street.includes(q);
                          })
                          .slice(0, 5);

                        if (filtered.length === 0) {
                          return (
                            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                              <Ionicons name="search-outline" size={32} color="#ccc" />
                              <Text style={{ color: '#999', marginTop: 8, fontSize: 13 }}>
                                {pharmacySearch.trim() ? 'No pharmacies match your search' : 'No available pharmacies to share with'}
                              </Text>
                            </View>
                          );
                        }

                        return filtered.map((pharmacy: any) => (
                          <TouchableOpacity key={pharmacy.id}
                            style={styles.pharmacySelectCard}
                            disabled={sendingShare}
                            onPress={() => handleSendPharmacyShare(pharmacy)}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '600', fontSize: 15, color: '#333' }}>{pharmacy.name}</Text>
                              <Text style={{ fontSize: 12, color: '#666' }}>
                                {pharmacy.address?.street ? `${pharmacy.address.street}, ${pharmacy.address.city}` : 'Address not available'}
                              </Text>
                            </View>
                            <Ionicons name="add-circle" size={24} color="#2E8B57" />
                          </TouchableOpacity>
                        ));
                      })()}
                    </ScrollView>

                    <TouchableOpacity style={styles.backToChoiceBtn} onPress={() => { setShareMode(null); setPharmacySearch(''); }}>
                      <Ionicons name="arrow-back" size={16} color="#2E8B57" />
                      <Text style={{ color: '#2E8B57', fontWeight: '600' }}>Back</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2E8B57',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  viewerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
    gap: 8,
  },
  viewerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTop: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    marginTop: 5,
  },
  readOnlyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  shareIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shareIdText: {
    color: '#2E8B57',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  contactButtonText: {
    color: '#2E8B57',
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: '#2E8B57',
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  medicalSection: {
    marginBottom: 15,
  },
  medicalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  allergyTag: {
    backgroundColor: '#FFE8E8',
  },
  allergyTagText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  conditionTag: {
    backgroundColor: '#E8F5E8',
  },
  conditionTagText: {
    color: '#2E8B57',
    fontSize: 14,
    fontWeight: '500',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  emergencyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  logIconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  logDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
    gap: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#2E8B57',
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 18,
    borderRadius: 15,
    gap: 10,
  },
  logoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#ccc',
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
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
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  qrWarning: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  secureText: {
    color: '#2E8B57',
    fontSize: 12,
    fontWeight: '500',
  },
  accessCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  accessCodeLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 5,
    letterSpacing: 1,
  },
  accessCodeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    letterSpacing: 4,
  },
  accessCodeNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  shareOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 12,
  },
  shareOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  shareOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
  pharmacySelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  backToChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 10,
  },
  linkedPharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shareStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  shareStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});