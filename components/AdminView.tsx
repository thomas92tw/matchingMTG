
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Buyer, Seller, Session, Schedule, BuyerPreferredSellers, SessionSettings } from '../types';
import { generateId, MAX_BUYERS_PER_BLOCK, NUM_PRIMARY_PREFERRED_SELLERS, NUM_BACKUP_PREFERRED_SELLERS, TOTAL_PREFERRED_SELLERS } from '../constants';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { Modal } from './Modal';
import { performAutoSchedule, exportScheduleToCSV, parseImportedSellersCSV } from '../services/scheduleUtils';

interface AdminViewProps {
  buyers: Buyer[];
  setBuyers: React.Dispatch<React.SetStateAction<Buyer[]>>;
  masterSellers: Seller[];
  setMasterSellers: React.Dispatch<React.SetStateAction<Seller[]>>;
  buyerPreferredSellers: BuyerPreferredSellers;
  setBuyerPreferredSellers: React.Dispatch<React.SetStateAction<BuyerPreferredSellers>>;
  schedule: Schedule;
  setSchedule: React.Dispatch<React.SetStateAction<Schedule>>;
  sessionSettings: SessionSettings;
  setSessionSettings: React.Dispatch<React.SetStateAction<SessionSettings>>;
  allSessions: Session[]; // Combined morning and afternoon sessions
}

interface DraggableSellerInfo {
  sellerId: string;
  originalBuyerId: string;
  originalSessionId: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  buyers, setBuyers, masterSellers, setMasterSellers,
  buyerPreferredSellers, setBuyerPreferredSellers,
  schedule, setSchedule, sessionSettings, setSessionSettings,
  allSessions
}) => {
  const [activeBuyerManager, setActiveBuyerManager] = useState(false);
  const [activeSellerManager, setActiveSellerManager] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerCountry, setNewBuyerCountry] = useState('');
  const [newBuyerSessionBlock, setNewBuyerSessionBlock] = useState<'morning' | 'afternoon'>('morning');
  
  const [newSellerName, setNewSellerName] = useState('');
  
  const [selectedBuyerForPref, setSelectedBuyerForPref] = useState<string>(buyers[0]?.id || '');
  const [currentPreferredSellers, setCurrentPreferredSellers] = useState<string[]>(Array(TOTAL_PREFERRED_SELLERS).fill(''));
  const [lastSavedBuyerIdForPrefs, setLastSavedBuyerIdForPrefs] = useState<string | null>(null);

  const [scheduleHistory, setScheduleHistory] = useState<Schedule[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [draggedItem, setDraggedItem] = useState<DraggableSellerInfo | null>(null);
  
  const morningSessions = useMemo(() => allSessions.filter(s => s.block === 'morning'), [allSessions]);
  const afternoonSessions = useMemo(() => allSessions.filter(s => s.block === 'afternoon'), [allSessions]);


  useEffect(() => {
    if (buyers.length > 0 && (!selectedBuyerForPref || !buyers.find(b => b.id === selectedBuyerForPref))) {
      setSelectedBuyerForPref(buyers[0].id);
    } else if (buyers.length === 0 && selectedBuyerForPref) {
      setSelectedBuyerForPref('');
    }
  }, [buyers, selectedBuyerForPref]);
  
  useEffect(() => {
    // Initialize/update currentPreferredSellers for the selected buyer (always 10 slots)
    if (!selectedBuyerForPref) {
      setCurrentPreferredSellers(Array(TOTAL_PREFERRED_SELLERS).fill(''));
      return;
    }
    const buyer = buyers.find(b => b.id === selectedBuyerForPref);
    if (!buyer) {
      setCurrentPreferredSellers(Array(TOTAL_PREFERRED_SELLERS).fill(''));
      return;
    }

    const existingPrefs = buyerPreferredSellers[selectedBuyerForPref] || [];
    const relevantPrefs = existingPrefs.slice(0, TOTAL_PREFERRED_SELLERS);
    const paddedPrefs = relevantPrefs.concat(Array(Math.max(0, TOTAL_PREFERRED_SELLERS - relevantPrefs.length)).fill(''));
    setCurrentPreferredSellers(paddedPrefs);

  }, [selectedBuyerForPref, buyerPreferredSellers, buyers]);

  useEffect(() => {
    // If the success indicator is shown for the current buyer,
    // and the current dropdown values (currentPreferredSellers) differ from what's stored (buyerPreferredSellers),
    // then the "saved" state is no longer valid for display, so hide the indicator.
    if (lastSavedBuyerIdForPrefs === selectedBuyerForPref && selectedBuyerForPref) {
        const storedPrefsForSelectedBuyer = buyerPreferredSellers[selectedBuyerForPref] || [];
        const paddedStoredPrefs = storedPrefsForSelectedBuyer.concat(Array(Math.max(0, TOTAL_PREFERRED_SELLERS - storedPrefsForSelectedBuyer.length)).fill(''));

        if (JSON.stringify(currentPreferredSellers) !== JSON.stringify(paddedStoredPrefs)) {
            setLastSavedBuyerIdForPrefs(null);
        }
    }
  }, [currentPreferredSellers, selectedBuyerForPref, lastSavedBuyerIdForPrefs, buyerPreferredSellers]);


  const pushToHistory = useCallback((newSchedule: Schedule) => {
    const newHistory = scheduleHistory.slice(0, historyIndex + 1);
    newHistory.push(newSchedule);
    setScheduleHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [scheduleHistory, historyIndex]);

  useEffect(() => {
    if (Object.keys(schedule).length > 0 && scheduleHistory.length === 0) {
       pushToHistory(schedule); 
    }
  }, [schedule, pushToHistory, scheduleHistory.length]);


  const handleAddBuyer = () => {
    if (!newBuyerName.trim() || !newBuyerCountry.trim()) {
      alert("Buyer Name and Country are required.");
      return;
    }

    const buyersInBlock = buyers.filter(b => b.sessionBlock === newBuyerSessionBlock);
    if (buyersInBlock.length >= MAX_BUYERS_PER_BLOCK) {
      alert(`Cannot add more than ${MAX_BUYERS_PER_BLOCK} buyers to the ${newBuyerSessionBlock} block.`);
      return;
    }

    const countriesInBlock = new Set(buyersInBlock.map(b => b.country.trim().toLowerCase()));
    const newCountryLower = newBuyerCountry.trim().toLowerCase();
    
    if (!countriesInBlock.has(newCountryLower) && countriesInBlock.size >= 2) {
      alert(`The ${newBuyerSessionBlock} block already has buyers from 2 different countries. Cannot add a buyer from a new country.`);
      return;
    }

    const newBuyer: Buyer = { 
      id: generateId(), 
      name: newBuyerName.trim(),
      country: newBuyerCountry.trim(),
      sessionBlock: newBuyerSessionBlock
    };
    setBuyers(prev => [...prev, newBuyer]);
    setNewBuyerName('');
    setNewBuyerCountry('');
  };

  const handleDeleteBuyer = (id: string) => {
    setBuyers(prev => prev.filter(b => b.id !== id));
    setBuyerPreferredSellers(prev => {
      const updated = {...prev};
      delete updated[id];
      return updated;
    });
    setSchedule(prev => {
      const updated = {...prev};
      delete updated[id];
      return updated;
    });
    if (lastSavedBuyerIdForPrefs === id) {
      setLastSavedBuyerIdForPrefs(null);
    }
  };

  const handleAddMasterSeller = () => {
    if (newSellerName.trim() && !masterSellers.find(s => s.name === newSellerName.trim())) {
      setMasterSellers(prev => [...prev, { id: generateId(), name: newSellerName.trim() }]);
      setNewSellerName('');
    }
  };

  const handleDeleteMasterSeller = (id: string) => {
    setMasterSellers(prev => prev.filter(s => s.id !== id));
    const updatedPrefs = {...buyerPreferredSellers};
    let prefsChanged = false;
    Object.keys(updatedPrefs).forEach(buyerId => {
      const originalPrefs = updatedPrefs[buyerId] || [];
      const newPrefsForBuyer = originalPrefs.map(sellerId => sellerId === id ? '' : sellerId);
      if (JSON.stringify(newPrefsForBuyer) !== JSON.stringify(originalPrefs)) {
         updatedPrefs[buyerId] = newPrefsForBuyer;
         prefsChanged = true;
         // If preferences for the buyer whose "saved" status is shown are changed, clear the indicator
         if (buyerId === lastSavedBuyerIdForPrefs) {
             setLastSavedBuyerIdForPrefs(null); 
         }
      }
    });

    if(prefsChanged) setBuyerPreferredSellers(updatedPrefs);

    const updatedSchedule = JSON.parse(JSON.stringify(schedule)); 
    let scheduleChanged = false;
    Object.keys(updatedSchedule).forEach(buyerId => {
      Object.keys(updatedSchedule[buyerId]).forEach(sessionId => {
        if (updatedSchedule[buyerId][sessionId] === id) {
          updatedSchedule[buyerId][sessionId] = null;
          scheduleChanged = true;
        }
      });
    });
    if(scheduleChanged) {
      setSchedule(updatedSchedule);
      pushToHistory(updatedSchedule);
    }
  };
  
  const handleImportSellers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                const imported = parseImportedSellersCSV(text);
                const uniqueImported = imported.filter(impS => !masterSellers.some(ms => ms.name === impS.name));
                setMasterSellers(prev => [...prev, ...uniqueImported]);
                alert(`${uniqueImported.length} new sellers imported. ${imported.length - uniqueImported.length} duplicates ignored.`);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    }
  };

  const handlePreferredSellerChange = (index: number, sellerId: string) => {
    const updated = [...currentPreferredSellers];
    updated[index] = sellerId;
    setCurrentPreferredSellers(updated);
    // User is changing preferences, so the "last saved" indicator for this buyer (if shown) should be cleared.
    // This is handled by the useEffect watching currentPreferredSellers
  };

  const savePreferredSellers = () => {
    if (!selectedBuyerForPref) return;
    
    const filledPreferences = currentPreferredSellers.filter(s => s !== '');
    const uniqueSellers = new Set(filledPreferences);
    if (uniqueSellers.size !== filledPreferences.length) {
      alert("Selected main and backup sellers for a buyer must be unique if specified.");
      return;
    }
    setBuyerPreferredSellers(prev => ({ ...prev, [selectedBuyerForPref]: [...currentPreferredSellers] }));
    alert("Preferred sellers saved.");
    setLastSavedBuyerIdForPrefs(selectedBuyerForPref);
  };

  const handleAutoSchedule = () => {
    if (buyers.length === 0) {
        alert("Please add buyers before auto-scheduling.");
        return;
    }
    const buyerWithNoPrimaryPrefs = buyers.find(b => {
        const prefs = buyerPreferredSellers[b.id] || [];
        const primaryPrefs = prefs.slice(0, NUM_PRIMARY_PREFERRED_SELLERS).filter(s_id => s_id !== '');
        return primaryPrefs.length === 0; 
    });

    if (buyerWithNoPrimaryPrefs && sessionSettings.count > 0) { 
      alert(`Buyer ${buyerWithNoPrimaryPrefs.name} has no main preferred sellers configured. Auto-scheduling might not be optimal. Consider adding main preferences.`);
    }

    const newSchedule = performAutoSchedule(buyers, allSessions, buyerPreferredSellers, masterSellers);
    setSchedule(newSchedule);
    pushToHistory(newSchedule);
  };

  const handleExportCSV = () => {
    exportScheduleToCSV(schedule, buyers, masterSellers, allSessions);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sellerId: string, originalBuyerId: string, originalSessionId: string) => {
    if (!sellerId) { 
        e.preventDefault();
        return;
    }
    setDraggedItem({ sellerId, originalBuyerId, originalSessionId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sellerId); 
    (e.target as HTMLDivElement).classList.add('dragging');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetBuyerId: string, targetSessionId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetBuyer = buyers.find(b => b.id === targetBuyerId);
    const targetSession = allSessions.find(s => s.id === targetSessionId);

    if (!targetBuyer || !targetSession) {
        console.error("Target buyer or session not found for drop.");
        setDraggedItem(null);
        return;
    }
    if (targetSession.block !== targetBuyer.sessionBlock) {
        alert(`Cannot move meeting to a session outside of buyer ${targetBuyer.name}'s assigned block (${targetBuyer.sessionBlock}).`);
        setDraggedItem(null);
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }

    const { sellerId: draggedSellerId, originalBuyerId, originalSessionId } = draggedItem;
    
    const newSchedule = JSON.parse(JSON.stringify(schedule)); 

    const sellerInTargetCell = newSchedule[targetBuyerId][targetSessionId];

    const originalBuyer = buyers.find(b => b.id === originalBuyerId);
    const originalSessionDetails = allSessions.find(s => s.id === originalSessionId);

    // Check if moving sellerInTargetCell (if exists) back to original spot is valid
    if (sellerInTargetCell && originalBuyer && originalSessionDetails && originalSessionDetails.block !== originalBuyer.sessionBlock) {
        alert(`Cannot swap: The seller from target cell (${sellerMap.get(sellerInTargetCell) || 'Seller'}) cannot be moved to buyer ${originalBuyer.name}'s original slot as it's outside their assigned block.`);
        setDraggedItem(null);
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        return;
    }
    
    newSchedule[targetBuyerId][targetSessionId] = draggedSellerId;
    newSchedule[originalBuyerId][originalSessionId] = sellerInTargetCell; 

    setSchedule(newSchedule);
    pushToHistory(newSchedule);
    setDraggedItem(null);
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.target as HTMLDivElement).classList.remove('dragging');
    setDraggedItem(null);
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setSchedule(scheduleHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < scheduleHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setSchedule(scheduleHistory[historyIndex + 1]);
    }
  };

  const getSessionConflicts = useMemo(() => {
    const conflicts: Record<string, string[]> = {}; 
    if (!schedule || Object.keys(schedule).length === 0) return conflicts;
    allSessions.forEach(session => {
      const sellersInSession: Record<string, number> = {}; 
      buyers.forEach(buyer => {
        if (buyer.sessionBlock === session.block) {
            const sellerId = schedule[buyer.id]?.[session.id];
            if (sellerId) {
            sellersInSession[sellerId] = (sellersInSession[sellerId] || 0) + 1;
            }
        }
      });
      conflicts[session.id] = Object.entries(sellersInSession)
        .filter(([, count]) => count > 1)
        .map(([sellerId]) => sellerId);
    });
    return conflicts;
  }, [schedule, buyers, allSessions]);

  const sellerMap = useMemo(() => new Map(masterSellers.map(s => [s.id, s.name])), [masterSellers]);

  const morningBuyersCount = useMemo(() => buyers.filter(b => b.sessionBlock === 'morning').length, [buyers]);
  const afternoonBuyersCount = useMemo(() => buyers.filter(b => b.sessionBlock === 'afternoon').length, [buyers]);
  

  return (
    <div className="p-6 space-y-6 bg-white shadow-lg rounded-xl">
      <h2 className="text-3xl font-bold text-gray-800 border-b border-gray-200 pb-2">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
          <h3 className="text-xl font-semibold mb-1 text-gray-700">Buyer Management</h3>
          <p className="text-xs text-gray-600 mb-2">
            Morning: {morningBuyersCount}/{MAX_BUYERS_PER_BLOCK} | Afternoon: {afternoonBuyersCount}/{MAX_BUYERS_PER_BLOCK}
          </p>
          <Button onClick={() => setActiveBuyerManager(true)} className="mb-2 w-full" variant="secondary" size="sm">Manage Buyers</Button>
          <Modal isOpen={activeBuyerManager} onClose={() => setActiveBuyerManager(false)} title="Manage Buyers" size="lg">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {buyers.map(b => (
                <div key={b.id} className="flex justify-between items-center p-2 border-b border-gray-200">
                  <span className="text-gray-800">{b.name} ({b.country}, {b.sessionBlock})</span>
                  <Button onClick={() => handleDeleteBuyer(b.id)} variant="danger" size="sm">Delete</Button>
                </div>
              ))}
               {buyers.length === 0 && <p className="text-gray-500 text-center py-4">No buyers added yet.</p>}
            </div>
            <div className="mt-4 p-2 border-t border-gray-200 space-y-3">
              <TextInput value={newBuyerName} onChange={e => setNewBuyerName(e.target.value)} placeholder="New Buyer Name" label="Buyer Name" />
              <TextInput value={newBuyerCountry} onChange={e => setNewBuyerCountry(e.target.value)} placeholder="e.g., USA" label="Buyer Country" />
              <div>
                <label htmlFor="sessionBlockSelect" className="block text-sm font-medium leading-6 text-gray-700 mb-1">Session Block</label>
                <select 
                    id="sessionBlockSelect"
                    value={newBuyerSessionBlock} 
                    onChange={e => setNewBuyerSessionBlock(e.target.value as 'morning' | 'afternoon')}
                    className="block w-full rounded-md border-0 bg-white py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6"
                >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                </select>
              </div>
              <Button onClick={handleAddBuyer} size="md" className="w-full">Add Buyer</Button>
            </div>
          </Modal>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">Master Seller List ({masterSellers.length})</h3>
          <Button onClick={() => setActiveSellerManager(true)} className="mb-2 w-full" variant="secondary" size="sm">Manage Sellers</Button>
          <Modal isOpen={activeSellerManager} onClose={() => setActiveSellerManager(false)} title="Manage Master Sellers" size="xl">
            <div className="mb-4">
                <label htmlFor="csvImport" className="block text-sm font-medium text-gray-700 mb-1">Import Sellers from CSV (single column of names):</label>
                <input type="file" id="csvImport" accept=".csv" onChange={handleImportSellers} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"/>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
              {masterSellers.map(s => (
                <div key={s.id} className="flex justify-between items-center p-2 border-b border-gray-200">
                  <span className="text-gray-800">{s.name}</span>
                  <Button onClick={() => handleDeleteMasterSeller(s.id)} variant="danger" size="sm">Delete</Button>
                </div>
              ))}
              {masterSellers.length === 0 && <p className="text-gray-500 text-center py-4">No sellers added yet.</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <TextInput value={newSellerName} onChange={e => setNewSellerName(e.target.value)} placeholder="New Seller Name" />
              <Button onClick={handleAddMasterSeller}>Add Seller</Button>
            </div>
          </Modal>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">Session Settings</h3>
            <div className="space-y-2">
                <div>
                    <label className="text-sm text-gray-600">Session Duration (min):</label>
                    <TextInput type="number" min="1" value={sessionSettings.durationMinutes} onChange={e => setSessionSettings(s => ({...s, durationMinutes: parseInt(e.target.value) || 30}))} />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Break Time (min):</label>
                    <TextInput type="number" min="0" value={sessionSettings.breakMinutes} onChange={e => setSessionSettings(s => ({...s, breakMinutes: parseInt(e.target.value) < 0 ? 0 : parseInt(e.target.value) || 5}))} />
                </div>
                 <div>
                    <label className="text-sm text-gray-600">Sessions per Block:</label>
                    <TextInput type="number" min="1" value={sessionSettings.count} onChange={e => setSessionSettings(s => ({...s, count: parseInt(e.target.value) || 1}))} />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Morning Start Time (HH:MM):</label>
                    <TextInput type="time" value={sessionSettings.morningStartTime} onChange={e => setSessionSettings(s => ({...s, morningStartTime: e.target.value || "09:30"}))} />
                </div>
                 <div>
                    <label className="text-sm text-gray-600">Afternoon Start Time (HH:MM):</label>
                    <TextInput type="time" value={sessionSettings.afternoonStartTime} onChange={e => setSessionSettings(s => ({...s, afternoonStartTime: e.target.value || "13:30"}))} />
                </div>
            </div>
        </div>
      </div>
      
      {buyers.length > 0 ? (
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 mt-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">Configure Buyer's Preferred Sellers (6 Main, 4 Backup)</h3>
            <div className="flex items-center gap-4 mb-4">
                <label htmlFor="buyerSelectPref" className="text-sm font-medium text-gray-700">Select Buyer:</label>
                <select 
                    id="buyerSelectPref" 
                    value={selectedBuyerForPref} 
                    onChange={e => setSelectedBuyerForPref(e.target.value)}
                    className="block w-full max-w-xs rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-gray-600 sm:text-sm sm:leading-6"
                    disabled={!selectedBuyerForPref && buyers.length > 0}
                    aria-label="Select buyer for preferred sellers"
                >
                    {buyers.map(b => <option key={b.id} value={b.id}>{b.name} ({b.country}, {b.sessionBlock})</option>)}
                </select>
            </div>
            {selectedBuyerForPref && buyers.find(b=>b.id === selectedBuyerForPref) && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Assign up to 6 main and 4 backup unique sellers for <span className="font-semibold text-gray-700">{buyers.find(b=>b.id === selectedBuyerForPref)?.name}</span>:</p>
                    
                    <div>
                        <h4 className="text-md font-medium text-gray-700 mb-2">Main Sellers</h4>
                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-3`}>
                        {Array(NUM_PRIMARY_PREFERRED_SELLERS).fill(0).map((_, i) => (
                            <div key={`main-${i}`}>
                                <label htmlFor={`main-seller-${i}`} className="block text-xs font-medium text-gray-500 mb-0.5">Main Seller {i + 1}</label>
                                <select
                                    id={`main-seller-${i}`}
                                    value={currentPreferredSellers[i] || ''}
                                    onChange={e => handlePreferredSellerChange(i, e.target.value)}
                                    className="block w-full rounded-md border-0 bg-white py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm"
                                    aria-label={`Main preferred seller ${i + 1}`}
                                >
                                    <option value="">-- Select Main Seller --</option>
                                    {masterSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-md font-medium text-gray-700 mb-2 mt-3">Backup Sellers</h4>
                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3`}>
                        {Array(NUM_BACKUP_PREFERRED_SELLERS).fill(0).map((_, i) => (
                            <div key={`backup-${i}`}>
                                <label htmlFor={`backup-seller-${i}`} className="block text-xs font-medium text-gray-500 mb-0.5">Backup Seller {i + 1}</label>
                                <select
                                    id={`backup-seller-${i}`}
                                    value={currentPreferredSellers[NUM_PRIMARY_PREFERRED_SELLERS + i] || ''}
                                    onChange={e => handlePreferredSellerChange(NUM_PRIMARY_PREFERRED_SELLERS + i, e.target.value)}
                                    className="block w-full rounded-md border-0 bg-white py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm"
                                    aria-label={`Backup preferred seller ${i + 1}`}
                                >
                                    <option value="">-- Select Backup Seller --</option>
                                    {masterSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        ))}
                        </div>
                    </div>
                    <div className="flex items-center mt-4">
                        <Button onClick={savePreferredSellers}>Save Preferences for {buyers.find(b=>b.id === selectedBuyerForPref)?.name}</Button>
                        {lastSavedBuyerIdForPrefs === selectedBuyerForPref && (
                             <Button 
                                size="md" 
                                disabled 
                                className="ml-3 opacity-90 cursor-default bg-yellow-500 text-white hover:bg-yellow-500 focus-visible:outline-yellow-500 disabled:bg-yellow-500 disabled:text-white"
                              >
                                Finished
                            </Button>
                        )}
                    </div>
                </div>
            )}
             {selectedBuyerForPref && !buyers.find(b=>b.id === selectedBuyerForPref) && (
                 <p className="text-gray-500">The previously selected buyer is no longer available. Please select another buyer.</p>
             )}
        </div>
      ) : (
          <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 mt-6">
            <p className="text-gray-600 text-center">
                Please add buyers to configure their preferred sellers.
            </p>
          </div>
      )}

      <div className="mt-6 p-4 border border-gray-200 rounded-lg shadow-md bg-white">
        <h3 className="text-2xl font-semibold mb-4 text-gray-700">Meeting Schedule Editor</h3>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
            <Button onClick={handleAutoSchedule} variant="primary">Smart Auto-Schedule</Button>
            <Button onClick={handleExportCSV} variant="secondary">Export to CSV</Button>
            <Button onClick={undo} disabled={historyIndex <= 0} variant="secondary" size="sm">Undo</Button>
            <Button onClick={redo} disabled={historyIndex >= scheduleHistory.length - 1} variant="secondary" size="sm">Redo</Button>
        </div>
        <div className="text-sm text-gray-600 mb-2">
            Conflicts found in sessions: 
            {Object.entries(getSessionConflicts).filter(([, s_ids]) => s_ids.length > 0).length > 0 ? 
             Object.entries(getSessionConflicts).map(([sessionId, sellerIds]) => 
                sellerIds.length > 0 ? <span key={sessionId} className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{allSessions.find(s=>s.id === sessionId)?.name}: {sellerIds.map(sId => sellerMap.get(sId) || 'Unknown').join(', ')}</span> : null
             ) : <span className="text-gray-700 font-semibold ml-1">None</span>
            }
        </div>

        {buyers.length > 0 && allSessions.length > 0 ? (
            <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-200">
                <tr>
                    <th rowSpan={2} className="p-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-200 z-10 align-middle">Buyer (Country, Block)</th>
                    {morningSessions.length > 0 && <th colSpan={morningSessions.length} className="p-2 border border-gray-300 text-center text-sm font-semibold text-gray-700">Morning Block</th>}
                    {afternoonSessions.length > 0 && <th colSpan={afternoonSessions.length} className="p-2 border border-gray-300 text-center text-sm font-semibold text-gray-700">Afternoon Block</th>}
                </tr>
                <tr>
                    {allSessions.map(session => ( 
                    <th key={session.id} className="p-2 border border-gray-300 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {session.name}<br/>({session.startTime}-{session.endTime})
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {buyers.map(buyer => (
                    <tr key={buyer.id} className="even:bg-gray-50">
                    <td className="p-2 border border-gray-300 text-xs text-gray-800 font-medium sticky left-0 bg-white even:bg-gray-50 z-10 whitespace-nowrap">
                        {buyer.name}<br/>({buyer.country}, {buyer.sessionBlock})
                    </td>
                    {allSessions.map(session => {
                        const sellerId = schedule[buyer.id]?.[session.id] || null;
                        const sellerName = sellerId ? sellerMap.get(sellerId) : null;
                        const isConflicting = sellerId && session.block === buyer.sessionBlock ? getSessionConflicts[session.id]?.includes(sellerId) : false;
                        const isBuyerSessionBlock = buyer.sessionBlock === session.block;
                        
                        return (
                        <td 
                            key={session.id} 
                            className={`p-0 border border-gray-300 text-center text-xs min-w-[120px] h-12 draggable-cell 
                                        ${isConflicting ? 'bg-red-200' : ''} 
                                        ${!isBuyerSessionBlock ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            onDragOver={isBuyerSessionBlock ? handleDragOver : undefined}
                            onDrop={isBuyerSessionBlock ? (e) => handleDrop(e, buyer.id, session.id) : undefined}
                            aria-label={`Session ${session.name} for ${buyer.name}`}
                        >
                            {isBuyerSessionBlock && sellerName ? (
                            <div 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, sellerId!, buyer.id, session.id)}
                                onDragEnd={handleDragEnd}
                                className={`p-1 w-full h-full flex items-center justify-center draggable ${isConflicting ? 'border-2 border-red-500' : ''} hover:bg-gray-200 rounded-sm`}
                                title={sellerName}
                            >
                                <span className="truncate text-gray-700">{sellerName}</span>
                            </div>
                            ) : isBuyerSessionBlock ? (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">Empty</div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">-</div>
                            ) }
                        </td>
                        );
                    })}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        ) : (
            <p className="text-gray-500 text-center py-8">Please add buyers and ensure session settings are configured to display the schedule grid.</p>
        )}
      </div>
    </div>
  );
};