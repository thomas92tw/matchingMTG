import React, { useState, useEffect, useMemo } from 'react';
import { Buyer, Seller, Schedule, SessionSettings, Session } from '../types';
import { SellerView } from './SellerView';
import { 
  initialBuyers, 
  initialMasterSellers, 
  INITIAL_SESSION_SETTINGS,
  APP_TITLE
} from '../constants';
import { calculateSessions, generateInitialSchedule } from '../services/scheduleUtils';

export const UserSearchPage: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);
  const [masterSellers, setMasterSellers] = useState<Seller[]>(initialMasterSellers);
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

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center py-8 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold text-gray-800">
          {APP_TITLE}
        </h1>
        <p className="mt-2 text-gray-600">
          賣家會議時間查詢系統
        </p>
        <div className="mt-4">
          <a 
            href="/admin" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            管理員入口
          </a>
        </div>
      </header>

      <main className="w-full max-w-7xl">
        <SellerView 
          schedule={schedule} 
          buyers={buyers} 
          masterSellers={masterSellers} 
          sessions={allSessions}
        />
      </main>
      
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; 2025 新興市場領航計畫 Intelligent Meeting Scheduler.</p>
      </footer>
    </div>
  );
};