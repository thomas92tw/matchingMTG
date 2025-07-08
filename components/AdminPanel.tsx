import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { Buyer, Seller, Schedule, BuyerPreferredSellers, SessionSettings, Session } from '../types';
import { AdminView } from './AdminView';
import { Button } from './Button';
import { 
  initialBuyers, 
  initialMasterSellers, 
  INITIAL_SESSION_SETTINGS,
  APP_TITLE
} from '../constants';
import { calculateSessions, generateInitialSchedule } from '../services/scheduleUtils';

export const AdminPanel: React.FC = () => {
  const { logout } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);
  const [masterSellers, setMasterSellers] = useState<Seller[]>(initialMasterSellers);
  const [buyerPreferredSellers, setBuyerPreferredSellers] = useState<BuyerPreferredSellers>({});
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>(INITIAL_SESSION_SETTINGS);
  
  const morningSessions: Session[] = useMemo(() => calculateSessions(sessionSettings, 'morning'), [sessionSettings]);
  const afternoonSessions: Session[] = useMemo(() => calculateSessions(sessionSettings, 'afternoon'), [sessionSettings]);
  
  const allSessions: Session[] = useMemo(() => 
    [...morningSessions, ...afternoonSessions].sort((a,b) => {
      if (a.block !== b.block) {
        return a.block === 'morning' ? -1 : 1;
      }
      return a.startTime.localeCompare(b.startTime);
    }), 
    [morningSessions, afternoonSessions]
  );
  
  const [schedule, setSchedule] = useState<Schedule>(() => generateInitialSchedule(buyers, allSessions));

  useEffect(() => {
    setSchedule(currentSchedule => {
      const newInitial = generateInitialSchedule(buyers, allSessions);
      buyers.forEach(b => {
        if (!newInitial[b.id]) newInitial[b.id] = {};
        allSessions.forEach(s => {
          if (currentSchedule[b.id] && currentSchedule[b.id][s.id] !== undefined) {
            newInitial[b.id][s.id] = currentSchedule[b.id][s.id];
          }
        });
      });
      Object.keys(newInitial).forEach(buyerId => {
        if (!buyers.find(b => b.id === buyerId)) {
          delete newInitial[buyerId];
        }
      });
      return newInitial;
    });
  }, [buyers, allSessions]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center py-8 px-4">
      <header className="mb-8 text-center w-full max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-5xl font-extrabold text-gray-800 flex-1">
            {APP_TITLE} - 管理員介面
          </h1>
          <Button 
            onClick={handleLogout}
            variant="secondary"
            className="ml-4"
          >
            登出
          </Button>
        </div>
        <div className="text-center">
          <a 
            href="/search" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            前往使用者查詢介面
          </a>
        </div>
      </header>

      <main className="w-full max-w-7xl">
        <AdminView
          buyers={buyers}
          setBuyers={setBuyers}
          masterSellers={masterSellers}
          setMasterSellers={setMasterSellers}
          buyerPreferredSellers={buyerPreferredSellers}
          setBuyerPreferredSellers={setBuyerPreferredSellers}
          schedule={schedule}
          setSchedule={setSchedule}
          sessionSettings={sessionSettings}
          setSessionSettings={setSessionSettings}
          allSessions={allSessions}
        />
      </main>
      
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; 2025 新興市場領航計畫 Intelligent Meeting Scheduler.</p>
      </footer>
    </div>
  );
};