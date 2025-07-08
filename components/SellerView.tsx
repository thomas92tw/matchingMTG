
import React, { useState, useMemo } from 'react';
import { Buyer, Seller, Session, Schedule, MeetingSlot } from '../types';
import { Button } from './Button';
import { TextInput } from './TextInput';

interface SellerViewProps {
  schedule: Schedule;
  buyers: Buyer[];
  masterSellers: Seller[];
  sessions: Session[]; // This will be allSessions (morning + afternoon)
}

const MeetingCard: React.FC<{ meeting: MeetingSlot }> = ({ meeting }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700">{meeting.session.name} ({meeting.session.startTime} - {meeting.session.endTime})</h3>
      <p className="text-gray-600">With Buyer: <span className="font-medium text-gray-800">{meeting.buyer.name} ({meeting.buyer.country})</span></p>
    </div>
  );
};

export const SellerView: React.FC<SellerViewProps> = ({ schedule, buyers, masterSellers, sessions }) => {
  const [sellerNameQuery, setSellerNameQuery] = useState('');
  const [searchedMeetings, setSearchedMeetings] = useState<MeetingSlot[]>([]);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sellerMap = useMemo(() => new Map(masterSellers.map(s => [s.id, s.name])), [masterSellers]);
  // buyerMap is not directly used for display in cards, but good to have if needed for other things.
  // const buyerMap = useMemo(() => new Map(buyers.map(b => [b.id, b.name])), [buyers]); 

  const scheduledSellerNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(schedule).forEach(buyerSessions => {
      Object.values(buyerSessions).forEach(sellerId => {
        if (sellerId && sellerMap.has(sellerId)) {
          names.add(sellerMap.get(sellerId)!);
        }
      });
    });
    return Array.from(names).sort();
  }, [schedule, sellerMap]);

  const filteredSuggestions = useMemo(() => {
    if (!sellerNameQuery) return [];
    return scheduledSellerNames.filter(name => name.toLowerCase().includes(sellerNameQuery.toLowerCase()));
  }, [sellerNameQuery, scheduledSellerNames]);

  const handleSearch = () => {
    setSearchAttempted(true);
    setShowSuggestions(false);
    if (!sellerNameQuery.trim()) {
      setSearchedMeetings([]);
      return;
    }

    const foundSeller = masterSellers.find(s => s.name.toLowerCase() === sellerNameQuery.trim().toLowerCase());
    if (!foundSeller) {
      setSearchedMeetings([]);
      return;
    }

    const meetings: MeetingSlot[] = [];
    buyers.forEach(buyer => {
      // Iterate through all sessions passed (morning & afternoon)
      sessions.forEach(session => {
        // Check if this buyer is scheduled with the foundSeller in this session
        // AND if the session belongs to the buyer's assigned block (important for data integrity if schedule somehow got a mismatch)
        if (schedule[buyer.id]?.[session.id] === foundSeller.id && buyer.sessionBlock === session.block) {
          meetings.push({
            buyer, // Full buyer object including country and block
            seller: foundSeller,
            session,
          });
        }
      });
    });
    
    meetings.sort((a, b) => {
      if (a.session.block !== b.session.block) return a.session.block.localeCompare(b.session.block);
      return a.session.startTime.localeCompare(b.session.startTime);
    });
    setSearchedMeetings(meetings);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-xl rounded-xl mt-10 border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">My Meeting Schedule</h2>
      
      <div className="relative mb-6">
        <TextInput 
          label="Enter Your Company Name"
          value={sellerNameQuery}
          onChange={e => {
            setSellerNameQuery(e.target.value);
            setSearchAttempted(false);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          // onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Delay to allow click on suggestion
          placeholder="e.g., Seller Company 1"
          aria-label="Seller company name input"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
            {filteredSuggestions.map(name => (
              <li 
                key={name} 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                onMouseDown={() => { 
                  setSellerNameQuery(name);
                  setShowSuggestions(false);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={handleSearch} className="w-full text-lg py-3" variant="primary">
        Search My Meetings
      </Button>

      {searchAttempted && (
        <div className="mt-8">
          {searchedMeetings.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-700">Your Scheduled Meetings:</h3>
              {searchedMeetings.map((meeting, index) => (
                <MeetingCard key={index} meeting={meeting} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4 px-3 bg-gray-50 rounded-md border border-gray-200">
              No meetings found for "{sellerNameQuery}". Please check the company name or contact the event organizer.
            </p>
          )}
        </div>
      )}
    </div>
  );
};