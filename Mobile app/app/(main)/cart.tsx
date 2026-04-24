import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RootState } from '../../store';
import { 
  removeFromCart, 
  updateQuantity, 
  clearCart 
} from '../../store/slices/cartSlice';
import { firebaseService } from '../../services/firebaseService';
import { geminiService } from '../../services/geminiService';
import { TAX_RATE, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../../utils/constants';
import { addDoc, collection as firestoreCollection, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SwipeableCardProps {
  item: any;
  onDelete: () => void;
  onQuantityChange: (change: number) => void;
  children: React.ReactNode;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({ item, onDelete, children }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -400, y: 0 },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => onDelete());
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.swipeableContainer,
        {
          transform: [{ translateX: pan.x }],
          opacity: fadeAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.deleteBackground}>
        <Ionicons name="trash" size={24} color="white" />
        <Text style={styles.deleteText}>Delete</Text>
      </View>
      {children}
    </Animated.View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items, pharmacyId } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedPharmacy, setSelectedPharmacy] = useState(pharmacyId || '');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [expandedPharmacy, setExpandedPharmacy] = useState(true);
  const [linkedPharmacies, setLinkedPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchLinkedPharmacies();
    }
    fetchMedicationPrices();
  }, [user]);

  const fetchLinkedPharmacies = async () => {
    if (!user?.id) return;
    setLoadingPharmacies(true);
    try {
      const pharmacies = await firebaseService.getLinkedPharmacies(user.id);
      setLinkedPharmacies(pharmacies);
      if (pharmacies.length > 0 && !selectedPharmacy) {
        setSelectedPharmacy(pharmacies[0].id);
      }
    } catch (error) {
      console.error('Error fetching linked pharmacies:', error);
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const fetchMedicationPrices = async () => {
    if (items.length === 0) return;

    setLoadingPrices(true);
    try {
      // Use geminiService to estimate medication prices
      const medications = items.map(item => ({
        name: item.medication.name,
        dosage: item.medication.dosage
      }));

      const prices = await geminiService.getMedicationPrices(medications);
      
      // Update cart items with estimated prices
      items.forEach((item, index) => {
        if (prices[index]) {
          dispatch(updateQuantity({
            medicationId: item.medication.id,
            quantity: item.quantity,
            price: prices[index].estimatedPrice
          }));
        }
      });
    } catch (error) {
      console.error('Error fetching prices:', error);
      // Continue with default prices if estimation fails
    } finally {
      setLoadingPrices(false);
    }
  };

  const subtotal = items.reduce((total, item) => 
    total + (item.quantity * (item.medication.price || 0)), 0
  );
  const deliveryFee = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const tax = subtotal * TAX_RATE;
  const totalAmount = subtotal + deliveryFee + tax;

  const handlePlaceOrder = async () => {
    if (!user || items.length === 0) {
      Alert.alert('Error', 'Please add items to your cart first.');
      return;
    }

    if (!selectedPharmacy) {
      Alert.alert('Error', 'Please select a pharmacy.');
      return;
    }

    setPlacingOrder(true);

    try {
      const selectedPharmacyData = linkedPharmacies.find(p => p.id === selectedPharmacy);
      
      const newOrder = {
        orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
        items: items.map(item => ({
          medicationId: item.medication.id,
          medicationName: item.medication.name,
          dosage: item.medication.dosage,
          quantity: item.quantity,
          price: item.medication.price || 0
        })),
        status: 'pending',
        pharmacyId: selectedPharmacy,
        pharmacyName: selectedPharmacyData?.name || 'Unknown Pharmacy',
        pharmacyAddress: selectedPharmacyData?.address ? 
          `${selectedPharmacyData.address.street || ''}, ${selectedPharmacyData.address.city || ''}` : '',
        patientName: `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim(),
        totalAmount,
        subtotal,
        deliveryFee,
        tax,
        deliveryMethod: 'pickup',
        notes: '',
      };

      await firebaseService.createOrder(user.id, newOrder);

      // Notify pharmacy of new order
      await addDoc(firestoreCollection(db, 'pharmacies', selectedPharmacy, 'notifications'), {
        type: 'new_order',
        title: 'New Order Received',
        message: `${user.personalInfo?.firstName} ${user.personalInfo?.lastName} placed an order for ${items.length} item(s).`,
        patientId: user.id,
        orderNumber: newOrder.orderNumber,
        read: false,
        createdAt: Timestamp.now(),
      });

      dispatch(clearCart());
      
      Alert.alert(
        'Order Placed Successfully!',
        `Your medication refill request has been sent to ${selectedPharmacyData?.name}. They will review and approve your order.`,
        [
          { 
            text: 'View Orders',
            onPress: () => router.push('/(main)/orders')
          },
          {
            text: 'OK'
          }
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleRemoveItem = (medicationId: string) => {
    dispatch(removeFromCart(medicationId));
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => dispatch(clearCart())
        }
      ]
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2E8B57" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={100} color="#ccc" />
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptyText}>
            Browse medications and add them to your cart for refill
          </Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/(main)/medications')}
          >
            <Ionicons name="medical" size={20} color="white" />
            <Text style={styles.shopButtonText}>Browse Medications</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2E8B57" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>{items.length} items</Text>
        </View>
        <TouchableOpacity onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Items</Text>
          {loadingPrices && (
            <View style={styles.priceLoadingBanner}>
              <ActivityIndicator size="small" color="#2E8B57" />
              <Text style={styles.priceLoadingText}>Fetching current prices...</Text>
            </View>
          )}
          {items.map((item) => (
            <SwipeableCard
              key={item.medication.id}
              item={item}
              onDelete={() => handleRemoveItem(item.medication.id)}
              onQuantityChange={(change) => {
                const newQty = Math.max(1, item.quantity + change);
                dispatch(updateQuantity({ 
                  medicationId: item.medication.id, 
                  quantity: newQty 
                }));
              }}
            >
              <View style={styles.cartItem}>
                <View style={styles.itemIcon}>
                  <Ionicons name="medical" size={24} color="#2E8B57" />
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.medication.name}</Text>
                  <Text style={styles.itemDosage}>{item.medication.dosage}</Text>
                  <Text style={styles.itemPrice}>
                    ${(item.medication.price || 0).toFixed(2)} each
                  </Text>
                </View>

                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => dispatch(updateQuantity({ 
                      medicationId: item.medication.id, 
                      quantity: Math.max(1, item.quantity - 1) 
                    }))}
                  >
                    <Ionicons name="remove" size={20} color="#2E8B57" />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => dispatch(updateQuantity({ 
                      medicationId: item.medication.id, 
                      quantity: item.quantity + 1 
                    }))}
                  >
                    <Ionicons name="add" size={20} color="#2E8B57" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemTotal}>
                  ${((item.medication.price || 0) * item.quantity).toFixed(2)}
                </Text>
              </View>
            </SwipeableCard>
          ))}

          <View style={styles.swipeHint}>
            <Ionicons name="arrow-back" size={16} color="#999" />
            <Text style={styles.swipeHintText}>Swipe left to delete</Text>
          </View>
        </View>

        {/* Pharmacy Selection */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setExpandedPharmacy(!expandedPharmacy)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Your Linked Pharmacies</Text>
              {loadingPharmacies && (
                <ActivityIndicator size="small" color="#2E8B57" style={{ marginLeft: 10 }} />
              )}
            </View>
            <Ionicons 
              name={expandedPharmacy ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {linkedPharmacies.length === 0 && !loadingPharmacies && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="business-outline" size={40} color="#ccc" />
              <Text style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>
                No linked pharmacies. Share your profile with a pharmacy first.
              </Text>
            </View>
          )}

          {expandedPharmacy && linkedPharmacies.map((pharmacy) => (
            <View
              key={pharmacy.id}
              style={[
                styles.pharmacyCard,
                selectedPharmacy === pharmacy.id && styles.selectedPharmacy
              ]}
            >
              <TouchableOpacity
                style={styles.pharmacyContent}
                onPress={() => setSelectedPharmacy(pharmacy.id)}
              >
                <View style={styles.pharmacyIcon}>
                  <Ionicons 
                    name="business" 
                    size={24} 
                    color={selectedPharmacy === pharmacy.id ? "#2E8B57" : "#666"} 
                  />
                </View>

                <View style={styles.pharmacyInfo}>
                  <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                  <Text style={styles.pharmacyAddress}>
                    {pharmacy.address?.street ? `${pharmacy.address.street}, ${pharmacy.address.city}` : 'Address not available'}
                  </Text>
                  {pharmacy.phone ? (
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{pharmacy.phone}</Text>
                  ) : null}
                </View>

                {selectedPharmacy === pharmacy.id && (
                  <Ionicons name="checkmark-circle" size={28} color="#2E8B57" />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>${subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={[styles.priceValue, deliveryFee === 0 && styles.freeText]}>
                {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax (HST 13%)</Text>
              <Text style={styles.priceValue}>${tax.toFixed(2)}</Text>
            </View>

            {subtotal < FREE_DELIVERY_THRESHOLD && (
              <View style={styles.freeDeliveryHint}>
                <Ionicons name="information-circle" size={16} color="#2E8B57" />
                <Text style={styles.freeDeliveryText}>
                  Add ${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for free delivery!
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>${totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.checkoutButton, placingOrder && styles.checkoutButtonDisabled]} 
          onPress={handlePlaceOrder}
          disabled={placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.checkoutText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  priceLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  priceLoadingText: {
    fontSize: 14,
    color: '#2E8B57',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '500',
  },
  swipeableContainer: {
    marginBottom: 12,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 12,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemDosage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: '#2E8B57',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E8B57',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
  swipeHint: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#999',
  },
  pharmacyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedPharmacy: {
    borderColor: '#2E8B57',
    borderWidth: 2,
    backgroundColor: '#F0F9F0',
  },
  pharmacyContent: {
    padding: 15,
    flexDirection: 'row',
  },
  pharmacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
  },
  pharmacyAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  pharmacyMetrics: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#666',
  },
  openBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedBadge: {
    backgroundColor: '#FFE8E8',
  },
  openText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E8B57',
  },
  closedText: {
    color: '#FF6B6B',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  directionsText: {
    fontSize: 13,
    color: '#2E8B57',
    fontWeight: '500',
  },
  priceBreakdown: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  freeText: {
    color: '#2E8B57',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  freeDeliveryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    gap: 8,
  },
  freeDeliveryText: {
    fontSize: 13,
    color: '#2E8B57',
    flex: 1,
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  footerTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    minWidth: 160,
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});