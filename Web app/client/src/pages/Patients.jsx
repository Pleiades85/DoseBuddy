import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchPatients, fetchShareRequests, respondToShareRequest } from '../services/api';
import { Search, Plus, Users, UserCheck, Share2, CheckCircle, XCircle, Clock, Bell } from 'lucide-react';
import { formatDateShort } from '../utils/dateUtils';
import RegisterPatientModal from '../components/RegisterPatientModal';
import { Card, Button, H2, Badge, SkeletonCard, ErrorState, EmptyState } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const PATIENT_TABS = [
  { key: 'own', label: 'Own Patients', icon: <UserCheck size={16} /> },
  { key: 'shared', label: 'Shared Patients', icon: <Share2 size={16} /> },
  { key: 'requests', label: 'Share Requests', icon: <Bell size={16} /> },
];

const Patients = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('own');
  
  const { data: patients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients
  });

  const { data: shareRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['share-requests'],
    queryFn: () => fetchShareRequests('pending'),
    refetchInterval: 30000,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }) => respondToShareRequest(id, action),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries(['share-requests']);
      queryClient.invalidateQueries(['patients']);
      toast.success(
        vars.action === 'approve' ? 'Share Approved' : 'Share Rejected',
        vars.action === 'approve' 
          ? 'Patient is now visible in your Shared Patients tab.' 
          : 'Share request has been rejected.'
      );
    },
    onError: (err) => toast.error('Action Failed', err.message),
  });

  // Split patients by relation
  const ownPatients = patients.filter(p => !p.relation || p.relation === 'Patient');
  const sharedPatients = patients.filter(p => p.relation && p.relation !== 'Patient');

  const getFilteredList = () => {
    const list = activeTab === 'own' ? ownPatients : sharedPatients;
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => {
      const name = `${p.personalInfo?.firstName} ${p.personalInfo?.lastName}`.toLowerCase();
      return name.includes(q);
    });
  };

  const filteredPatients = getFilteredList();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <H2>Patient Profiles</H2>
        <Button variant="primary" onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Register Patient
        </Button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', background: 'var(--slate-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-1)' }}>
        {PATIENT_TABS.map(tab => {
          const count = tab.key === 'own' ? ownPatients.length 
            : tab.key === 'shared' ? sharedPatients.length 
            : shareRequests.length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius)',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)',
                transition: 'all 0.2s',
                background: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
              }}>
              {tab.icon} {tab.label}
              {count > 0 && (
                <span style={{
                  background: tab.key === 'requests' && count > 0 ? '#FEF3C7' : 'var(--primary-light)',
                  color: tab.key === 'requests' && count > 0 ? '#F59E0B' : 'var(--primary)',
                  padding: '2px 8px', borderRadius: 12, fontSize: 'var(--text-xs)', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Share Requests Tab */}
      {activeTab === 'requests' ? (
        <div>
          {loadingRequests ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : shareRequests.length === 0 ? (
            <EmptyState icon={Bell} title="No pending requests" description="Share requests from patients will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <AnimatePresence>
                {shareRequests.map((req, idx) => (
                  <motion.div key={req.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -200 }} transition={{ duration: 0.25, delay: idx * 0.05 }}>
                    <Card>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'var(--info-light)', color: 'var(--info)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Share2 size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{req.patientName || 'Unknown Patient'}</div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                              Wants to share with: <strong>{req.pharmacyName || 'Unknown Pharmacy'}</strong>
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 2 }}>
                              <Clock size={12} /> {req.requestedAt ? new Date(req.requestedAt.seconds ? req.requestedAt.seconds * 1000 : req.requestedAt).toLocaleString() : 'Just now'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Button variant="primary" size="sm"
                            icon={<CheckCircle size={14} />}
                            loading={respondMutation.isPending}
                            onClick={() => respondMutation.mutate({ id: req.id, action: 'approve' })}>
                            Approve
                          </Button>
                          <Button variant="danger" size="sm"
                            icon={<XCircle size={14} />}
                            loading={respondMutation.isPending}
                            onClick={() => respondMutation.mutate({ id: req.id, action: 'reject' })}>
                            Deny
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search */}
          <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" placeholder="Search patients by name..." className="input"
              style={{ paddingLeft: 'calc(var(--space-4) + 24px + var(--space-2))' }}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Patient Grid */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <ErrorState title="Failed to load patients" description={error.message} onRetry={refetch} />
          ) : filteredPatients.length === 0 ? (
            <EmptyState 
              icon={Users} 
              title={searchQuery ? "No matching patients" : activeTab === 'shared' ? "No shared patients" : "No patients yet"} 
              description={
                searchQuery ? "Try a different search term." 
                : activeTab === 'shared' ? "When patients share their profile with your pharmacy, they'll appear here."
                : "Register your first patient to get started."
              }
              actionLabel={!searchQuery && activeTab === 'own' ? "Register Patient" : undefined}
              onAction={!searchQuery && activeTab === 'own' ? () => setShowModal(true) : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
              {filteredPatients.map((patient, idx) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <PatientCard 
                    id={patient.id}
                    name={`${patient.personalInfo?.firstName} ${patient.personalInfo?.lastName}`} 
                    dob={patient.personalInfo?.dateOfBirth || 'N/A'} 
                    condition={patient.medicalInfo?.chronicConditions?.[0] || 'None'} 
                    lastVisit={formatDateShort(patient.timestamps?.updatedAt || patient.personalInfo?.updatedAt || patient.timestamps?.createdAt || patient.personalInfo?.createdAt)} 
                    isShared={activeTab === 'shared'}
                    relation={patient.relation}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && <RegisterPatientModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

const PatientCard = ({ id, name, dob, condition, lastVisit, isShared, relation }) => {
  const navigate = useNavigate();
  return (
    <Card hoverable onClick={() => navigate(`/patients/${id}`)} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: isShared ? 'var(--info-light)' : 'var(--primary-light)', 
            color: isShared ? 'var(--info)' : 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 'var(--text-sm)'
          }}>
            {name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>{name}</h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>DOB: {dob}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
          <Badge variant={condition !== 'None' ? 'warning' : 'success'} size="sm">
            {condition !== 'None' ? condition : 'Healthy'}
          </Badge>
          {isShared && (
            <Badge variant="info" size="sm">
              <Share2 size={10} style={{ marginRight: 4 }} /> Shared
            </Badge>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Last visit: {lastVisit}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 600 }}>View Profile →</span>
      </div>
    </Card>
  );
};

export default Patients;
