import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBWWD5Uj6PwQQMPTVMaKcIJ7J1XtF_ZvkQ",
  authDomain: "agentmsgdb.firebaseapp.com",
  databaseURL: "https://agentmsgdb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agentmsgdb",
  storageBucket: "agentmsgdb.firebasestorage.app",
  messagingSenderId: "675476869633",
  appId: "1:675476869633:web:f37fd6020dbda64854e600"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

interface Message {
  text: string;
  sender: 'user' | 'agent';
  timestamp: string;
  order?: number; // For maintaining chronological order
}

function App() {
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [messageIndex, setMessageIndex] = useState(1);
  const [firebaseUserMessages, setFirebaseUserMessages] = useState<Message[]>([]);
  const [localAgentMessages, setLocalAgentMessages] = useState<Message[]>([]);
  const [maxOrder, setMaxOrder] = useState(0);
  const [isAgentTurn, setIsAgentTurn] = useState(true); // Agent starts first
  
  const userMessagesEndRef = useRef<HTMLDivElement>(null);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);

  // Load user messages from Firebase when component mounts
  useEffect(() => {
    const guestMsgsRef = ref(database, 'GuestMsgs');
    
    const unsubscribe = onValue(guestMsgsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase data to messages array
        const messages: Message[] = [];
        Object.keys(data).forEach((key) => {
          if (key.startsWith('msg')) {
            const numMatch = key.match(/msg(\d+)/);
            if (numMatch) {
              const msgNum = parseInt(numMatch[1]);
              messages.push({
                text: data[key],
                sender: 'user',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                order: msgNum * 2 // User messages get even numbers (2, 4, 6, ...) since agent starts first
              });
            }
          }
        });
        
        // Sort messages by order
        messages.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setFirebaseUserMessages(messages);
        
        // Update message index and max order
        const maxIndex = Math.max(...Object.keys(data).map(key => {
          const match = key.match(/msg(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }), 0);
        setMessageIndex(maxIndex + 1);
        
        // Update max order to be the highest order from Firebase messages
        const maxOrderFromFirebase = Math.max(...messages.map(m => m.order || 0), 0);
        setMaxOrder(maxOrderFromFirebase);
      } else {
        setFirebaseUserMessages([]);
        setMessageIndex(1);
        setMaxOrder(0);
        setIsAgentTurn(true); // Agent starts first when no messages
      }
    });

    return () => unsubscribe();
  }, []);

  // Merge Firebase user messages with local agent messages for agent chat
  useEffect(() => {
    // Combine Firebase user messages (left side) with local agent messages (right side)
    // Sort by order to maintain chronological order
    const combined = [...firebaseUserMessages, ...localAgentMessages].sort((a, b) => {
      return (a.order || 0) - (b.order || 0);
    });
    setAgentMessages(combined);
    
    // Determine whose turn it is based on the last message
    if (combined.length > 0) {
      const lastMessage = combined[combined.length - 1];
      // If last message was from user (even order), it's agent's turn
      // If last message was from agent (odd order), it's user's turn
      setIsAgentTurn(lastMessage.sender === 'user');
    } else if (firebaseUserMessages.length > 0) {
      // If we have user messages but no combined messages yet, agent should respond
      setIsAgentTurn(true);
    }
  }, [firebaseUserMessages, localAgentMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    userMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userMessages]);

  useEffect(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleUserSend = () => {
    if (!userInput.trim() || isAgentTurn) return; // Only allow if it's user's turn

    // User messages get even order numbers (2, 4, 6, 8, ...) since agent starts first
    const newOrder = messageIndex * 2;
    const message: Message = {
      text: userInput,
      sender: 'user',
      timestamp: formatTime(),
      order: newOrder
    };

    // Add to user chat (right side)
    setUserMessages(prev => [...prev, message]);

    // Optimistically add to agent chat (left side) - will be replaced by Firebase update
    setFirebaseUserMessages(prev => {
      // Check if message already exists to avoid duplicates
      const exists = prev.some(m => m.order === newOrder && m.text === userInput);
      if (exists) return prev;
      return [...prev, message].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    // Store in Firebase as msg1, msg2, etc.
    const msgKey = `msg${messageIndex}`;
    const guestMsgsRef = ref(database, `GuestMsgs/${msgKey}`);
    set(guestMsgsRef, userInput);

    setMessageIndex(prev => prev + 1);
    setMaxOrder(newOrder);
    setUserInput('');
    
    // Switch turn to agent
    setIsAgentTurn(true);
  };

  const handleAgentSend = () => {
    if (!agentInput.trim() || !isAgentTurn) return; // Only allow if it's agent's turn

    // Agent messages: if starting fresh, order 1, then 3, 5, 7...
    // If there are existing user messages, agent responds with maxOrder + 1
    const newOrder = maxOrder === 0 ? 1 : maxOrder + 1;
    const message: Message = {
      text: agentInput,
      sender: 'agent',
      timestamp: formatTime(),
      order: newOrder
    };

    // Add to agent chat (right side) - local only, not stored in Firebase
    setLocalAgentMessages(prev => [...prev, message]);

    // Add to user chat (left side) - not stored in Firebase
    setUserMessages(prev => [...prev, message]);

    setMaxOrder(newOrder);
    setAgentInput('');
    
    // Switch turn to user
    setIsAgentTurn(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handler();
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      {/* User Chat - Left Side */}
      <div className="flex-1 flex flex-col border-r-2 border-gray-400 min-w-0" style={{ width: '50%', minWidth: '300px' }}>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-semibold backdrop-blur-sm">
              U
            </div>
            <div>
              <h2 className="text-lg font-semibold">User</h2>
              <span className="text-sm opacity-90">Online</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-[#e5ddd5] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4ccc4\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]">
          {userMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex mb-4 animate-[slideIn_0.3s_ease-out] ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-3.5 py-2.5 rounded-lg shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#dcf8c6] rounded-br-sm'
                    : 'bg-white rounded-bl-sm'
                }`}
              >
                <div className="text-sm text-[#303030] leading-relaxed">{msg.text}</div>
                <span className="text-[11px] text-[#667781] mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
          <div ref={userMessagesEndRef} />
        </div>

        <div className="flex gap-2 p-3 bg-gray-100 border-t border-gray-200">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleUserSend)}
            placeholder={isAgentTurn ? "Wait for agent to send..." : "Type a message..."}
            disabled={isAgentTurn}
            className="flex-1 px-4 py-3 rounded-full border-none outline-none focus:ring-2 focus:ring-blue-300 text-[15px] disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={handleUserSend}
            disabled={isAgentTurn || !userInput.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {/* Agent Chat - Right Side */}
      <div className="flex-1 flex flex-col min-w-0" style={{ width: '50%', minWidth: '300px' }}>
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-semibold backdrop-blur-sm">
              A
            </div>
            <div>
              <h2 className="text-lg font-semibold">Agent</h2>
              <span className="text-sm opacity-90">Online</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-[#e5ddd5] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4ccc4\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]">
          {agentMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex mb-4 animate-[slideIn_0.3s_ease-out] ${
                msg.sender === 'agent' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-3.5 py-2.5 rounded-lg shadow-sm ${
                  msg.sender === 'agent'
                    ? 'bg-[#dcf8c6] rounded-br-sm'
                    : 'bg-white rounded-bl-sm'
                }`}
              >
                <div className="text-sm text-[#303030] leading-relaxed">{msg.text}</div>
                <span className="text-[11px] text-[#667781] mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
          <div ref={agentMessagesEndRef} />
        </div>

        <div className="flex gap-2 p-3 bg-gray-100 border-t border-gray-200">
          <input
            type="text"
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAgentSend)}
            placeholder={!isAgentTurn ? "Wait for user to send..." : "Type a message..."}
            disabled={!isAgentTurn}
            className="flex-1 px-4 py-3 rounded-full border-none outline-none focus:ring-2 focus:ring-purple-300 text-[15px] disabled:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={handleAgentSend}
            disabled={!isAgentTurn || !agentInput.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
