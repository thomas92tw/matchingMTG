
import { Buyer, Seller, Session, Schedule, BuyerPreferredSellers, SessionSettings } from '../types';
import { NUM_PRIMARY_PREFERRED_SELLERS, TOTAL_PREFERRED_SELLERS } from '../constants';

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const calculateSessions = (settings: SessionSettings, blockType: 'morning' | 'afternoon'): Session[] => {
  const sessions: Session[] = [];
  const startTimeStr = blockType === 'morning' ? settings.morningStartTime : settings.afternoonStartTime;
  let currentTime = parseTimeToMinutes(startTimeStr); 

  const prefix = blockType === 'morning' ? 'M' : 'A';

  for (let i = 0; i < settings.count; i++) {
    const startTimeMinutes = currentTime;
    const endTimeMinutes = currentTime + settings.durationMinutes;

    const formatTime = (totalMinutes: number): string => {
      const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const minutes = (totalMinutes % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    sessions.push({
      id: `${prefix}_s${i + 1}`,
      name: `${prefix}-Session ${i + 1}`,
      startTime: formatTime(startTimeMinutes),
      endTime: formatTime(endTimeMinutes),
      block: blockType,
    });

    currentTime = endTimeMinutes + settings.breakMinutes;
  }
  return sessions;
};

export const generateInitialSchedule = (buyers: Buyer[], allSessions: Session[]): Schedule => {
  const schedule: Schedule = {};
  buyers.forEach(buyer => {
    schedule[buyer.id] = {};
    allSessions.forEach(session => {
      schedule[buyer.id][session.id] = null;
    });
  });
  return schedule;
};

export const performAutoSchedule = (
  buyers: Buyer[],
  allSessions: Session[],
  buyerPreferredSellers: BuyerPreferredSellers,
  masterSellers: Seller[] 
  // sessionSettings.count is implicitly used via buyerBlockSessions.length
): Schedule => {
  const newSchedule = generateInitialSchedule(buyers, allSessions);
  const sessionOccupancy: Record<string, Set<string>> = {}; // sessionId -> Set<sellerId>
  allSessions.forEach(s => sessionOccupancy[s.id] = new Set());

  const shuffledBuyers = [...buyers].sort(() => Math.random() - 0.5);

  shuffledBuyers.forEach(buyer => {
    const buyerBlockSessions = allSessions.filter(s => s.block === buyer.sessionBlock);
    if (buyerBlockSessions.length === 0) {
      console.warn(`No sessions available for buyer ${buyer.name}'s assigned block (${buyer.sessionBlock}).`);
      return;
    }
    
    const numSlotsForBuyer = buyerBlockSessions.length;

    const allPrefsForBuyer = (buyerPreferredSellers[buyer.id] || []).slice(0, TOTAL_PREFERRED_SELLERS);
    const primaryPrefs = allPrefsForBuyer.slice(0, NUM_PRIMARY_PREFERRED_SELLERS).filter(id => id !== '');
    const backupPrefs = allPrefsForBuyer.slice(NUM_PRIMARY_PREFERRED_SELLERS).filter(id => id !== '');

    if (primaryPrefs.length === 0 && backupPrefs.length === 0) {
      console.warn(`Buyer ${buyer.name} has no preferred sellers. Skipping.`);
      return;
    }
    
    let availablePrimarySellers = [...primaryPrefs].sort(() => Math.random() - 0.5);
    let availableBackupSellers = [...backupPrefs].sort(() => Math.random() - 0.5);
    const assignedSellersForThisBuyer = new Set<string>(); // Sellers already assigned to this buyer
    let assignedSlotsCount = 0;

    const shuffledBuyerBlockSessions = [...buyerBlockSessions].sort(() => Math.random() - 0.5);

    // Attempt to schedule with primary preferences first
    for (const session of shuffledBuyerBlockSessions) {
      if (assignedSlotsCount >= numSlotsForBuyer) break; // Buyer's slots are full

      for (let i = 0; i < availablePrimarySellers.length; i++) {
        const sellerId = availablePrimarySellers[i];
        if (!sessionOccupancy[session.id].has(sellerId) && !assignedSellersForThisBuyer.has(sellerId)) {
          newSchedule[buyer.id][session.id] = sellerId;
          sessionOccupancy[session.id].add(sellerId);
          assignedSellersForThisBuyer.add(sellerId);
          availablePrimarySellers.splice(i, 1); // Remove used seller
          assignedSlotsCount++;
          break; // Move to next session for this buyer
        }
      }
    }

    // Attempt to schedule with backup preferences if slots are still available
    if (assignedSlotsCount < numSlotsForBuyer) {
      for (const session of shuffledBuyerBlockSessions) {
        if (assignedSlotsCount >= numSlotsForBuyer) break; // Buyer's slots are full
        if (newSchedule[buyer.id][session.id] !== null) continue; // Slot already filled (likely by a primary)

        for (let i = 0; i < availableBackupSellers.length; i++) {
          const sellerId = availableBackupSellers[i];
          if (!sessionOccupancy[session.id].has(sellerId) && !assignedSellersForThisBuyer.has(sellerId)) {
            newSchedule[buyer.id][session.id] = sellerId;
            sessionOccupancy[session.id].add(sellerId);
            assignedSellersForThisBuyer.add(sellerId);
            availableBackupSellers.splice(i, 1); // Remove used seller
            assignedSlotsCount++;
            break; // Move to next session for this buyer
          }
        }
      }
    }
  });

  return newSchedule;
};


export const exportScheduleToCSV = (
  schedule: Schedule,
  buyers: Buyer[],
  sellers: Seller[],
  allSessions: Session[] 
): void => {
  const sellerMap = new Map(sellers.map(s => [s.id, s.name]));
  
  let csvContent = "data:text/csv;charset=utf-8,";

  const sortedSessions = [...allSessions].sort((a,b) => {
    if (a.block !== b.block) {
        // 'morning' comes before 'afternoon'
        return a.block === 'morning' ? -1 : 1;
    }
    // If blocks are the same, sort by startTime
    return a.startTime.localeCompare(b.startTime);
  });

  const header = ["Buyer Name", "Buyer Country", "Session Block", ...sortedSessions.map(s => `${s.name} (${s.startTime}-${s.endTime})`)];
  csvContent += header.join(",") + "\r\n";

  buyers.forEach(buyer => {
    const row = [buyer.name, buyer.country, buyer.sessionBlock];
    sortedSessions.forEach(session => {
      const sellerId = schedule[buyer.id]?.[session.id];
      const sellerName = sellerId ? sellerMap.get(sellerId) || "Unknown Seller" : "";
      // Ensure quotes for names that might contain commas, though ideally names shouldn't.
      const sanitizedSellerName = `"${sellerName.replace(/"/g, '""')}"`;
      row.push(sanitizedSellerName);
    });
    csvContent += row.join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "meeting_schedule.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseImportedSellersCSV = (fileContent: string): Seller[] => {
    const newSellers: Seller[] = [];
    const lines = fileContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
    
    // Simple header detection: if the first line contains "name" (case-insensitive), skip it.
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        // For CSV, we should handle cases where names might be quoted if they contain commas.
        // This simple parser assumes names don't contain commas or are not quoted.
        // For robust CSV parsing, a library would be better.
        let name = lines[i].trim();
        // Basic unquoting if the name is wrapped in double quotes
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1).replace(/""/g, '"'); // Handle escaped quotes
        }
        
        if (name) {
            newSellers.push({ id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name });
        }
    }
    return newSellers;
};
