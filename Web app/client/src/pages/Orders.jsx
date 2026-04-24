import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPharmacyOrders, validateOrder, respondToOrder } from '../services/api';
import { ClipboardList, CheckCircle, XCircle, AlertTriangle, Package, Clock, User, Search, ChevronDown, ChevronUp, MessageSquare, Shield } from 'lucide-react';
import { Card, Button, H2, Badge, SkeletonCard, ErrorState, EmptyState } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const Orders = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [validations, setValidations] = useState({});
  const [notes, setNotes] = useState({});

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pharmacy-orders', activeTab],
    queryFn: () => fetchPharmacyOrders(activeTab),
    refetchInterval: 15000,
  });

  const respondMutation = useMutation({
    mutationFn: ({ patientId, orderId, action, orderNotes }) => 
      respondToOrder(patientId, orderId, action, orderNotes),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries(['pharmacy-orders']);
      toast.success(`Order ${vars.action === 'approve' ? 'Approved' : 'Rejected'}`, 
        `The order has been ${vars.action === 'approve' ? 'approved' : 'rejected'} successfully.`);
    },
    onError: (err) => toast.error('Action Failed', err.message),
  });

  const handleValidate = async (patientId, orderId) => {
    try {
      const result = await validateOrder(patientId, orderId);
      setValidations(prev => ({ ...prev, [orderId]: result }));
    } catch (err) {
      toast.error('Validation Failed', err.message);
    }
  };

  const handleRespond = (patientId, orderId, action) => {
    respondMutation.mutate({ patientId, orderId, action, orderNotes: notes[orderId] || '' });
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (order.patientName || '').toLowerCase().includes(search) ||
           (order.orderNumber || '').toLowerCase().includes(search) ||
           (order.items || []).some(i => (i.medicationName || '').toLowerCase().includes(search));
  });

  const getStatusBadge = (status) => {
    const map = {
      pending: { variant: 'warning', label: 'Pending' },
      approved: { variant: 'success', label: 'Approved' },
      rejected: { variant: 'danger', label: 'Rejected' },
      processing: { variant: 'info', label: 'Processing' },
      paid: { variant: 'info', label: 'Paid' },
      ready: { variant: 'success', label: 'Ready' },
      delivered: { variant: 'success', label: 'Delivered' },
    };
    const cfg = map[status] || { variant: 'secondary', label: status };
    return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
  };

  const getValidationBadge = (validation) => {
    if (!validation) return null;
    const colorMap = {
      green: { bg: '#E8F5E8', color: '#2E8B57', icon: <CheckCircle size={14} />, label: 'All Checks Passed' },
      yellow: { bg: '#FFF8E1', color: '#F59E0B', icon: <AlertTriangle size={14} />, label: 'Warnings' },
      red: { bg: '#FFE8E8', color: '#EF4444', icon: <XCircle size={14} />, label: 'Issues Found' },
    };
    const cfg = colorMap[validation.overallStatus] || colorMap.green;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '6px 12px', borderRadius: 'var(--radius)', background: cfg.bg, color: cfg.color, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
        {cfg.icon} {cfg.label}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <H2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ClipboardList size={24} /> Order Queue
        </H2>
        <Button variant="secondary" onClick={() => refetch()} icon={<Clock size={16} />}>
          Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-1)' }}>
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)',
              transition: 'all 0.2s',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
            }}>
            {tab.label}
            {activeTab === tab.key && orders.length > 0 && (
              <span style={{ marginLeft: 'var(--space-2)', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, fontSize: 'var(--text-xs)' }}>
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search by patient, order #, or medicine..." className="input"
          style={{ paddingLeft: 'calc(var(--space-4) + 24px + var(--space-2))' }}
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <ErrorState title="Failed to load orders" description={error.message} onRetry={refetch} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders" description={activeTab === 'pending' ? 'No pending orders right now.' : 'No orders match this filter.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <AnimatePresence>
            {filteredOrders.map((order, idx) => {
              const isExpanded = expandedOrder === order.id;
              const validation = validations[order.id];
              const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A';

              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2, delay: idx * 0.03 }}>
                  <Card>
                    {/* Order Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', cursor: 'pointer' }}
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{order.orderNumber || `ORD-${order.id?.slice(-6)}`}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{createdAt}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        {validation && getValidationBadge(validation)}
                        {getStatusBadge(order.status)}
                        {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Patient & Items Summary */}
                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: isExpanded ? 'var(--space-4)' : 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <span><strong>Patient:</strong> {order.patientName || 'Unknown'}</span>
                      <span><strong>Items:</strong> {order.items?.length || 0} medicines</span>
                      <span><strong>Total:</strong> ${order.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}
                        style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                        
                        {/* Smart Notes (Patient Context) */}
                        {order.smartNote && (
                          <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: '#FFF8E1', borderRadius: 'var(--radius)', borderLeft: '3px solid #F59E0B', fontSize: 'var(--text-sm)', color: '#92400E' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <AlertTriangle size={14} /> Patient Context
                            </div>
                            {order.smartNote}
                          </div>
                        )}

                        {/* Medicine List */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Package size={14} /> Medicines
                          </div>
                          <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                            {(order.items || []).map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div>
                                  <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{item.medicationName}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                    {item.dosage}{item.frequency ? ` • ${item.frequency}` : ''}
                                  </div>
                                  {item.courseLength && (
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Clock size={10} /> Course: {item.courseLength}
                                      {item.startDate && ` (started ${new Date(item.startDate).toLocaleDateString()})`}
                                    </div>
                                  )}
                                  {item.prescribedBy && (
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1 }}>
                                      Prescribed by: {item.prescribedBy}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>×{item.quantity}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>${((item.price || 0) * item.quantity).toFixed(2)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Validation Results */}
                        {validation && (validation.warnings?.length > 0 || validation.errors?.length > 0) && (
                          <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <Shield size={14} /> Validation Results
                            </div>
                            {validation.errors?.map((e, i) => (
                              <div key={`e-${i}`} style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: '#FFE8E8', borderRadius: 'var(--radius)', marginBottom: 'var(--space-2)', color: '#EF4444', fontSize: 'var(--text-sm)' }}>
                                <XCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} /> {e.message}
                              </div>
                            ))}
                            {validation.warnings?.map((w, i) => (
                              <div key={`w-${i}`} style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: '#FFF8E1', borderRadius: 'var(--radius)', marginBottom: 'var(--space-2)', color: '#F59E0B', fontSize: 'var(--text-sm)' }}>
                                <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} /> {w.message}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons (only for pending) */}
                        {order.status === 'pending' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {/* Notes */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <MessageSquare size={14} color="var(--text-muted)" />
                              <input className="input" placeholder="Add notes (optional)..." 
                                style={{ flex: 1, fontSize: 'var(--text-sm)' }}
                                value={notes[order.id] || ''} 
                                onChange={(e) => setNotes(prev => ({ ...prev, [order.id]: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                              <Button variant="secondary" onClick={() => handleValidate(order.patientId, order.id)}
                                icon={<Shield size={16} />} style={{ flex: 1 }}>
                                Run Validation
                              </Button>
                              <Button variant="primary" onClick={() => handleRespond(order.patientId, order.id, 'approve')}
                                icon={<CheckCircle size={16} />} loading={respondMutation.isPending} style={{ flex: 1 }}>
                                Approve
                              </Button>
                              <Button variant="danger" onClick={() => handleRespond(order.patientId, order.id, 'reject')}
                                icon={<XCircle size={16} />} loading={respondMutation.isPending} style={{ flex: 1 }}>
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Pharmacy notes (if already responded) */}
                        {order.pharmacyNotes && (
                          <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--slate-50)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)' }}>
                            <span style={{ fontWeight: 600 }}>Pharmacy Notes:</span> {order.pharmacyNotes}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Orders;
