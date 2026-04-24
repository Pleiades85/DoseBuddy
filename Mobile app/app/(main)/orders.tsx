import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Share,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RootState } from '../../store';
import { firebaseService } from '../../services/firebaseService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
      
      // Subscribe to real-time order updates
      const unsubscribe = firebaseService.subscribeToOrders(user.id, (orders) => {
        setOrders(orders);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await firebaseService.getUserOrders(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#2E8B57';
      case 'rejected': return '#FF6B6B';
      case 'processing': return '#4A90E2';
      case 'ready': return '#50C878';
      case 'delivered': return '#4CAF50';
      case 'paid': return '#9B59B6';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for Pharmacy Approval';
      case 'approved': return 'Approved - Payment Required';
      case 'rejected': return 'Rejected - Contact Pharmacy';
      case 'processing': return 'Processing Your Order';
      case 'paid': return 'Paid - Preparing Order';
      case 'ready': return 'Ready for Pickup/Delivery';
      case 'delivered': return 'Delivered Successfully';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'hourglass-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'processing': return 'construct-outline';
      case 'paid': return 'card-outline';
      case 'ready': return 'cube-outline';
      case 'delivered': return 'checkmark-done-circle-outline';
      default: return 'information-circle-outline';
    }
  };

  const handlePayNow = async (order: any) => {
    setProcessingPayment(true);
    
    try {
      // TODO: Integrate with Stripe Payment Gateway
      // For now, showing a placeholder
      Alert.alert(
        'Payment Gateway',
        'Stripe payment integration will be implemented here.',
        [
          {
            text: 'Simulate Payment',
            onPress: async () => {
              // Simulate payment success
              if (!user) return;
              await firebaseService.updateOrderStatus(user.id, order.id, 'paid');
              Alert.alert('Success', 'Payment processed successfully!');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      
      // Actual Stripe integration code:
      /*
      const paymentIntent = await fetch('YOUR_BACKEND_URL/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: order.totalAmount * 100, // Convert to cents
          orderId: order.id,
          userId: user.id
        })
      });
      
      const { clientSecret } = await paymentIntent.json();
      
      // Initialize Stripe payment sheet
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'DoseBuddy'
      });
      
      if (!error) {
        const { error: paymentError } = await presentPaymentSheet();
        
        if (!paymentError) {
          await firebaseService.updateOrderStatus(order.id, 'paid');
          Alert.alert('Success', 'Payment processed successfully!');
        }
      }
      */
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const generateReceiptHTML = (order: any) => {
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #2E8B57;
              padding-bottom: 20px;
            }
            .logo {
              color: #2E8B57;
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .receipt-title {
              font-size: 24px;
              color: #333;
              margin-top: 10px;
            }
            .order-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .info-block {
              flex: 1;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 16px;
              color: #333;
              font-weight: 600;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              background: ${getStatusColor(order.status)};
              color: white;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #2E8B57;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e0e0e0;
            }
            .item-name {
              font-weight: 600;
              color: #333;
            }
            .item-dosage {
              color: #666;
              font-size: 14px;
            }
            .totals {
              text-align: right;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              padding: 10px 0;
              font-size: 18px;
            }
            .total-label {
              margin-right: 40px;
              font-weight: 600;
            }
            .total-amount {
              font-weight: bold;
              color: #2E8B57;
              font-size: 24px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .pharmacy-info {
              margin-bottom: 20px;
              padding: 15px;
              background: #E8F5E8;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">💊 DoseBuddy</div>
            <div class="receipt-title">Order Receipt</div>
          </div>
          
          <div class="order-info">
            <div class="info-block">
              <div class="info-label">Order Number</div>
              <div class="info-value">${order.orderNumber || `#${order.id.slice(-6)}`}</div>
            </div>
            <div class="info-block">
              <div class="info-label">Date</div>
              <div class="info-value">${createdAt.toLocaleDateString()}</div>
            </div>
            <div class="info-block">
              <div class="info-label">Status</div>
              <div class="info-value">
                <span class="status-badge">${order.status}</span>
              </div>
            </div>
          </div>

          <div class="pharmacy-info">
            <div class="info-label">Pharmacy</div>
            <div class="info-value">${order.pharmacyName || 'N/A'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item: any) => `
                <tr>
                  <td>
                    <div class="item-name">${item.medicationName}</div>
                    <div class="item-dosage">${item.dosage}</div>
                  </td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="total-label">Total Amount:</span>
              <span class="total-amount">$${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing DoseBuddy!</p>
            <p>For questions about your order, please contact your pharmacy.</p>
            <p>This is an official receipt for your medication order.</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintReceipt = async (order: any) => {
    try {
      const html = generateReceiptHTML(order);
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  const handleShareReceipt = async (order: any) => {
    try {
      const html = generateReceiptHTML(order);
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt - ${order.orderNumber || order.id}`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const viewReceipt = (order: any) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push('/(main)/cart')}
        >
          <Ionicons name="cart" size={24} color="#2E8B57" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E8B57']} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Your order history will appear here
            </Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => router.push('/(main)/medications')}
            >
              <Text style={styles.shopButtonText}>Browse Medications</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => {
            const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>
                      {order.orderNumber || `Order #${order.id.slice(-6)}`}
                    </Text>
                    <Text style={styles.orderDate}>
                      {createdAt.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons 
                      name={getStatusIcon(order.status)} 
                      size={16} 
                      color={getStatusColor(order.status)} 
                    />
                    <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.statusDescription}>
                  {getStatusText(order.status)}
                </Text>
                
                <View style={styles.pharmacyRow}>
                  <Ionicons name="business" size={16} color="#2E8B57" />
                  <Text style={styles.pharmacyText}>{order.pharmacyName}</Text>
                </View>
                
                <View style={styles.orderItems}>
                  <Text style={styles.itemsTitle}>Items:</Text>
                  {order.items.map((item: any, index: number) => (
                    <View key={index} style={styles.orderItemRow}>
                      <Text style={styles.orderItem}>
                        • {item.medicationName} {item.dosage}
                      </Text>
                      <Text style={styles.orderItemQty}>×{item.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.orderTotal}>${order.totalAmount.toFixed(2)}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {order.status === 'approved' && (
                    <TouchableOpacity 
                      style={styles.payButton}
                      onPress={() => handlePayNow(order)}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="card" size={18} color="white" />
                          <Text style={styles.payButtonText}>Pay Now</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {order.status !== 'processing' && (
                    <>
                      <TouchableOpacity 
                        style={styles.receiptButton}
                        onPress={() => viewReceipt(order)}
                      >
                        <Ionicons name="receipt" size={18} color="#2E8B57" />
                        <Text style={styles.receiptButtonText}>View Receipt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => handleShareReceipt(order)}
                      >
                        <Ionicons name="share-social" size={20} color="#2E8B57" />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => handlePrintReceipt(order)}
                      >
                        <Ionicons name="print" size={20} color="#2E8B57" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Receipt Modal */}
      <Modal
        visible={showReceipt}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReceipt(false)}
      >
        {selectedOrder && (
          <View style={styles.receiptModal}>
            <View style={styles.receiptHeader}>
              <TouchableOpacity onPress={() => setShowReceipt(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.receiptTitle}>Receipt</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.receiptContent}>
              <View style={styles.receiptLogo}>
                <Text style={styles.receiptLogoText}>💊 DoseBuddy</Text>
              </View>

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptLabel}>Order Number</Text>
                <Text style={styles.receiptValue}>
                  {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-6)}`}
                </Text>
              </View>

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptLabel}>Date</Text>
                <Text style={styles.receiptValue}>
                  {(selectedOrder.createdAt?.toDate?.() || new Date(selectedOrder.createdAt))
                    .toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                </Text>
              </View>

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptLabel}>Pharmacy</Text>
                <Text style={styles.receiptValue}>{selectedOrder.pharmacyName}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.itemsHeader}>Order Items</Text>
              {selectedOrder.items.map((item: any, index: number) => (
                <View key={index} style={styles.receiptItem}>
                  <View style={styles.receiptItemInfo}>
                    <Text style={styles.receiptItemName}>{item.medicationName}</Text>
                    <Text style={styles.receiptItemDosage}>{item.dosage}</Text>
                  </View>
                  <Text style={styles.receiptItemQty}>×{item.quantity}</Text>
                  <Text style={styles.receiptItemPrice}>
                    ${(item.quantity * item.price).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.receiptTotal}>
                <Text style={styles.receiptTotalLabel}>Total Amount</Text>
                <Text style={styles.receiptTotalAmount}>
                  ${selectedOrder.totalAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>
                  Thank you for choosing DoseBuddy!
                </Text>
                <Text style={styles.receiptFooterSubtext}>
                  This is an official receipt for your medication order.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.receiptActions}>
              <TouchableOpacity 
                style={styles.receiptActionButton}
                onPress={() => handleShareReceipt(selectedOrder)}
              >
                <Ionicons name="share-social" size={20} color="#2E8B57" />
                <Text style={styles.receiptActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.receiptActionButton}
                onPress={() => handlePrintReceipt(selectedOrder)}
              >
                <Ionicons name="print" size={20} color="#2E8B57" />
                <Text style={styles.receiptActionText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

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
  cartButton: {
    padding: 8,
  },
  ordersList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  orderStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pharmacyText: {
    fontSize: 14,
    color: '#2E8B57',
    fontWeight: '500',
  },
  orderItems: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderItem: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  orderItemQty: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E8B57',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    minWidth: '100%',
    marginBottom: 8,
  },
  payButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  receiptButtonText: {
    color: '#2E8B57',
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    backgroundColor: '#E8F5E8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  receiptModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptContent: {
    flex: 1,
    padding: 20,
  },
  receiptLogo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  receiptLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  receiptInfo: {
    marginBottom: 16,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  receiptValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  itemsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  receiptItemDosage: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  receiptItemQty: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 12,
  },
  receiptItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  receiptTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  receiptTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  receiptFooter: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  receiptFooterText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  receiptFooterSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  receiptActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  receiptActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  receiptActionText: {
    color: '#2E8B57',
    fontSize: 15,
    fontWeight: '600',
  },
});