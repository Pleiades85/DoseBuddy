import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';
import { authService } from '../../services/authService';
import { setUser } from '../../store/slices/authSlice';


export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<'qr' | 'code'>('qr');
  const [code, setCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const dispatch = useDispatch();

  React.useEffect(() => {
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
      }),
    ]).start();
  }, []);

  const handleQRScan = ({ data }: { data: string }) => {
    setScannerVisible(false);
    handleLogin('qr', { qrCode: data });
  };

  const handleLogin = async (method: 'qr' | 'code', credentials: any) => {
    try {
      const result = await authService[method === 'qr' ? 'loginWithQR' : 'loginWithCode'](credentials);
      dispatch(setUser(result.patientData));
    } catch (error: any) {
      const scannedInfo = method === 'qr' ? `\n\nScanned: ${JSON.stringify(credentials)}` : '';
      Alert.alert('Login Failed', error.message + scannedInfo);
    }
  };

  const handleDemoLogin = () => {
    // Demo login with sample data - bypasses Firebase authentication
    Alert.alert(
      'Demo Mode',
      'Logging in with demo account...',
      [
        {
          text: 'OK',
          onPress: () => {
            dispatch(setUser({
              id: 'demo-user-123',
              patientRecordId: 'demo-patient-123',
              personalInfo: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1 234 567 8900',
                address: '123 Main St',
                city: 'City',
                state: 'State',
                zipCode: '12345',
                status: 'active',
                dateOfBirth: '01/01/1980',
                gender: 'Male'
              },
              medicalSummary: {
                bloodType: 'O+',
                allergies: ['Penicillin', 'Pollen'],
                chronicConditions: ['Hypertension'],
                height: '180cm',
                weight: '80kg',
                notes: 'None'
              },
              insurance: {
                provider: 'Demo Insurance',
                policyNumber: '123456789',
                groupNumber: '987654321'
              },
              emergencyContact: {
                name: 'Jane Doe',
                phone: '+1 234 567 8901',
                relationship: 'Spouse',
                email: 'jane.doe@example.com'
              },
              assignedPharmacy: {
                pharmacyId: 'demo-pharmacy',
                pharmacyName: 'Demo Pharmacy',
                createdAt: new Date().toISOString(),
                createdBy: 'system'
              },
              timestamps: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
              },
              relation: 'Patient',
              roleName: 'Patient'
            }));
          }
        }
      ]
    );
  };

  const handleScanPress = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required to scan QR codes.');
        return;
      }
    }
    setScannerVisible(true);
  };

  if (scannerVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={handleQRScan}
          barcodeScannerSettings={{
            barcodeTypes: ['qr']
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <Text style={styles.scanInstruction}>Align QR code within the frame</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={() => setScannerVisible(false)}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </CameraView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="medical" size={40} color="#2E8B57" />
            </View>
            <Text style={styles.title}>DoseBuddy</Text>
            <Text style={styles.subtitle}>Your Medical Companion</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.instructionText}>
            Choose your preferred login method
          </Text>



          {/* Login Method Toggle */}
          <View style={styles.methodToggleContainer}>
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, loginMethod === 'qr' && styles.activeToggle]}
                onPress={() => setLoginMethod('qr')}
              >
                <Ionicons
                  name="qr-code"
                  size={20}
                  color={loginMethod === 'qr' ? 'white' : '#2E8B57'}
                />
                <Text style={[styles.toggleText, loginMethod === 'qr' && styles.activeToggleText]}>
                  QR Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, loginMethod === 'code' && styles.activeToggle]}
                onPress={() => setLoginMethod('code')}
              >
                <Ionicons
                  name="key"
                  size={20}
                  color={loginMethod === 'code' ? 'white' : '#2E8B57'}
                />
                <Text style={[styles.toggleText, loginMethod === 'code' && styles.activeToggleText]}>
                  Access Code
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Forms */}
          {loginMethod === 'qr' ? (
            <View style={styles.qrSection}>
              <View style={styles.qrIllustration}>
                <Ionicons name="qr-code-outline" size={120} color="#2E8B57" />
                <View style={styles.scanLine} />
              </View>
              <Text style={styles.qrInstruction}>
                Scan the QR code provided by your pharmacy to access your medical profile
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanPress}
              >
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.scanButtonText}>Scan QR Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.codeForm}>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Access Code"
                  placeholderTextColor="#999"
                  value={code}
                  onChangeText={setCode}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#999"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (DD/MM/YYYY)"
                  placeholderTextColor="#999"
                  value={dob}
                  onChangeText={setDob}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (!code || !lastName || !dob) && styles.loginButtonDisabled
                ]}
                onPress={() => handleLogin('code', { code, lastName, dob })}
                disabled={!code || !lastName || !dob}
              >
                <Ionicons name="log-in" size={22} color="white" />
                <Text style={styles.loginButtonText}>Access Medical Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              Need help accessing your profile?{'\n'}
              Contact your pharmacy for assistance.
            </Text>
          </View>

          {/* Demo Login Button */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
          >
            <Ionicons name="flash" size={20} color="#FFA500" />
            <Text style={styles.demoButtonText}>Demo Login (Testing)</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#2E8B57',
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  methodToggleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 130,
    justifyContent: 'center',
    gap: 8,
  },
  activeToggle: {
    backgroundColor: '#2E8B57',
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B57',
  },
  activeToggleText: {
    color: 'white',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    height: 3,
    width: '80%',
    backgroundColor: '#2E8B57',
    borderRadius: 2,
    top: '50%',
    transform: [{ translateY: -1.5 }],
  },
  qrInstruction: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 15,
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  codeForm: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8B57',
    paddingVertical: 18,
    borderRadius: 15,
    shadowColor: '#2E8B57',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  helpSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  helpText: {
    fontSize: 14,
    color: '#2E8B57',
    textAlign: 'center',
    lineHeight: 20,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3CD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#FFA500',
    gap: 10,
  },
  demoButtonText: {
    color: '#856404',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2E8B57',
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2E8B57',
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2E8B57',
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2E8B57',
    borderBottomRightRadius: 10,
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    marginTop: 30,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
});