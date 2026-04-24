import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, addInventoryItem } from '../services/api';
import { Package, Search, Plus } from 'lucide-react';
import { Card, Button, H2, Badge, Modal, SkeletonTable, ErrorState, EmptyState } from '../components/ui';
import { useToast } from '../components/ui/Toast';

const Inventory = () => {
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  
  const { data: inventory = [], isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', limit],
    queryFn: () => fetchInventory(limit)
  });

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', description: '' });
  const [addLoading, setAddLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAddItem = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await addInventoryItem({
        ...newItem,
        quantity: parseInt(newItem.quantity)
      });
      setShowModal(false);
      setNewItem({ name: '', quantity: '', description: '' });
      queryClient.invalidateQueries(['inventory']);
      toast.success('Item added', `${newItem.name} has been added to inventory.`);
    } catch (err) {
      toast.error('Failed to add item', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <H2>Inventory Management</H2>
        <Button variant="primary" onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Add Medicine
        </Button>
      </div>

      <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" placeholder="Search medicine..." className="input"
          style={{ paddingLeft: 'calc(var(--space-4) + 24px + var(--space-2))' }}
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {isLoading && limit === 10 ? (
        <SkeletonTable rows={6} cols={4} />
      ) : error ? (
        <ErrorState title="Failed to load inventory" description={error.message} onRetry={refetch} />
      ) : filteredInventory.length === 0 ? (
        <EmptyState 
          icon={Package}
          title={searchQuery ? "No matching items" : "Inventory is empty"}
          description={searchQuery ? "Try a different search." : "Add your first medicine to get started."}
          actionLabel={!searchQuery ? "Add Medicine" : undefined}
          onAction={!searchQuery ? () => setShowModal(true) : undefined}
        />
      ) : (
        <Card padding="none">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Name</th>
                  <th style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</th>
                  <th style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                  <th style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--slate-100)', transition: 'background var(--transition-fast)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--slate-50)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: 'var(--space-4) var(--space-5)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>{item.name}</td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-sm)' }}>{item.quantity}</td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{item.description || '—'}</td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                      <Badge variant={item.quantity < 10 ? 'warning' : 'success'} size="sm" dot>
                        {item.quantity < 10 ? 'Low Stock' : 'In Stock'}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4) var(--space-5)' }}>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <Button variant="ghost" onClick={handleLoadMore}>Load More</Button>
          </div>
        </Card>
      )}

      {/* Add Item Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Medicine" size="sm">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="label">Medicine Name</label>
            <input className="input" placeholder="e.g. Paracetamol 500mg" required
              value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Quantity</label>
            <input type="number" className="input" placeholder="0" required
              value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" placeholder="Optional notes..." rows="3"
              value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
          </div>
          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={addLoading}>Add Item</Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
