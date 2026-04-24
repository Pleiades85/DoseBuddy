import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setInterfaceMode } from '../store/slices/uiSlice';

export default function ModeSelector() {
  const dispatch = useDispatch();
  const currentMode = useSelector((state: RootState) => state.ui.mode);

  const handleModeSelect = (mode: 'simple' | 'modern') => {
    dispatch(setInterfaceMode(mode));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Choose Interface Style</Text>
      <View style={styles.selectorContainer}>
        {/* Simple Mode Option */}
        <TouchableOpacity
          style={[
            styles.option,
            currentMode === 'simple' && styles.selectedOption,
            { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }
          ]}
          onPress={() => handleModeSelect('simple')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, currentMode === 'simple' && styles.selectedIconContainer]}>
            <Ionicons 
              name="accessibility" 
              size={28} 
              color={currentMode === 'simple' ? '#2E8B57' : '#666'} 
            />
          </View>
          <View>
            <Text style={[styles.optionTitle, currentMode === 'simple' && styles.selectedText]}>
              Simple
            </Text>
            <Text style={styles.optionSubtitle}>Large text & buttons</Text>
          </View>
          {currentMode === 'simple' && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color="#2E8B57" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Modern Mode Option */}
        <TouchableOpacity
          style={[
            styles.option,
            currentMode === 'modern' && styles.selectedOption,
            { borderTopRightRadius: 12, borderBottomRightRadius: 12 }
          ]}
          onPress={() => handleModeSelect('modern')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, currentMode === 'modern' && styles.selectedIconContainer]}>
            <Ionicons 
              name="phone-portrait" 
              size={28} 
              color={currentMode === 'modern' ? '#4A90E2' : '#666'} 
            />
          </View>
          <View>
            <Text style={[styles.optionTitle, currentMode === 'modern' && styles.selectedText]}>
              Modern
            </Text>
            <Text style={styles.optionSubtitle}>Standard interface</Text>
          </View>
          {currentMode === 'modern' && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginLeft: 4,
  },
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 80,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  selectedOption: {
    backgroundColor: 'white',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedIconContainer: {
    backgroundColor: '#f0f0f0',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  selectedText: {
    color: '#333',
  },
  optionSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  checkMark: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
});
