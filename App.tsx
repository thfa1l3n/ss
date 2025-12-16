import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Gift, Sparkles, UserPlus, LogOut, Users, Info, Copy, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';

import Snowfall from './components/Snowfall';
import { FestiveButton } from './components/FestiveButton';
import { User, Group, AppState } from './types';
import { AVATARS, MAX_GROUP_SIZE } from './constants';
import { getFestiveGiftIdeas } from './services/geminiService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('AUTH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [groupCode, setGroupCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [authError, setAuthError] = useState('');

  // Drawing State
  const [slotName, setSlotName] = useState("???");
  const [drawnMatch, setDrawnMatch] = useState<User | null>(null);
  const [giftIdeas, setGiftIdeas] = useState<string[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  // Load Session
  useEffect(() => {
    const user = storageService.getCurrentUser();
    if (user) {
      handleSessionRestore(user);
    }
  }, []);

  const handleSessionRestore = (user: User) => {
    setCurrentUser(user);
    if (user.groupId) {
      refreshGroupData(user.groupId);
    }
    setAppState(user.drawnUserId ? 'REVEALED' : 'LOBBY');
  };

  const refreshGroupData = (groupId: string) => {
    const data = storageService.getGroup(groupId);
    if (data) {
      setCurrentGroup(data.group);
      setGroupMembers(data.members);
      
      // If user has already drawn, make sure we have that data
      const me = data.members.find(m => m.id === currentUser?.id);
      if (me?.drawnUserId) {
         const match = data.members.find(m => m.id === me.drawnUserId);
         if (match) {
             setDrawnMatch(match);
             setAppState('REVEALED');
             fetchIdeas(match);
         }
      }
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isLogin) {
      const result = storageService.login(email, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        if (result.user.groupId) {
          refreshGroupData(result.user.groupId);
          setAppState(result.user.drawnUserId ? 'REVEALED' : 'LOBBY');
        } else {
            setAppState('LOBBY'); 
        }
      } else {
        setAuthError(result.message || "Login failed");
      }
    } else {
      // Register
      const result = storageService.register(email, password, displayName, avatar, groupCode);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        if (result.user.groupId) {
            refreshGroupData(result.user.groupId);
            setAppState('LOBBY');
        }
      } else {
        setAuthError(result.message || "Registration failed");
      }
    }
  };

  const handleCreateGroup = () => {
    if (!currentUser || !newGroupName) return;
    const group = storageService.createGroup(newGroupName, currentUser.id);
    setCurrentGroup(group);
    refreshGroupData(group.id);
    setAppState('LOBBY');
  };

  const handleLogout = () => {
    storageService.logout();
    setAppState('AUTH');
    setCurrentUser(null);
    setCurrentGroup(null);
    setIsLogin(true);
    setAuthError('');
    setEmail('');
    setDisplayName('');
    setPassword('');
  };

  const copyInvite = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(`Come join our Secret Santa! Code: ${currentGroup.code}`);
    alert("Invite code copied to clipboard! Ho Ho Ho!");
  };

  const startDraw = () => {
    if (!currentUser || !currentGroup) return;
    
    // Check constraints
    if (groupMembers.length < 2) {
        alert("You need at least 2 elves to start a Secret Santa!");
        return;
    }

    setAppState('DRAWING');
    
    // Animation logic
    let spins = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      const rando = groupMembers[Math.floor(Math.random() * groupMembers.length)];
      setSlotName(rando.displayName);
      spins++;
      
      if (spins >= maxSpins) {
        clearInterval(interval);
        performDraw();
      }
    }, 100);
  };

  const performDraw = () => {
    if (!currentUser || !currentGroup) return;

    const result = storageService.drawSecretSanta(currentUser.id, currentGroup.id);
    
    if (result.success && result.match) {
        setDrawnMatch(result.match);
        setSlotName(result.match.displayName);
        
        // Confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D42426', '#2F5233', '#FFD700']
        });

        setTimeout(() => {
            setAppState('REVEALED');
            fetchIdeas(result.match!);
        }, 1500);
    } else {
        alert(result.message || "Drawing failed");
        setAppState('LOBBY');
    }
  };

  const fetchIdeas = (match: User) => {
      setLoadingIdeas(true);
      getFestiveGiftIdeas(match.displayName, "The Elf")
        .then(ideas => setGiftIdeas(ideas))
        .finally(() => setLoadingIdeas(false));
  };

  // --- RENDER HELPERS ---
  
  if (appState === 'AUTH') {
    return (
      <div className="min-h-screen font-body text-gray-900 pattern-stripes relative flex items-center justify-center p-4">
        <Snowfall />
        <div className="bg-white border-8 border-santa-red border-dashed p-6 rounded-2xl shadow-2xl w-full max-w-md relative animate-pop-in z-10">
            <div className="absolute -top-8 -left-8 text-6xl rotate-[-12deg]">🎁</div>
            <h1 className="text-3xl font-christmas text-center text-santa-red mb-2">JingleDraw</h1>
            <p className="text-center text-pine font-bold mb-6 text-sm uppercase tracking-widest">
              {isLogin ? "Unlock Your Mission" : "Join the Workshop"}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              
              {/* Login Mode */}
              {isLogin && (
                <>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Email ID</label>
                    <input 
                      required
                      type="email"
                      className="w-full p-3 border-2 border-pine rounded-lg bg-snow focus:ring-2 focus:ring-gold outline-none" 
                      placeholder="santa@northpole.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full p-3 border-2 border-pine rounded-lg bg-snow focus:ring-2 focus:ring-gold outline-none" 
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Signup Mode */}
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Email ID</label>
                    <input 
                      required
                      type="email"
                      className="w-full p-3 border-2 border-pine rounded-lg bg-snow focus:ring-2 focus:ring-gold outline-none" 
                      placeholder="santa@northpole.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                     <label className="block text-pine font-bold text-xs uppercase mb-1">Display Name</label>
                     <input 
                       required
                       type="text"
                       className="w-full p-3 border-2 border-pine rounded-lg bg-snow focus:ring-2 focus:ring-gold outline-none" 
                       placeholder="e.g. Papa Elf"
                       value={displayName}
                       onChange={e => setDisplayName(e.target.value)}
                     />
                  </div>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full p-3 border-2 border-pine rounded-lg bg-snow focus:ring-2 focus:ring-gold outline-none" 
                      placeholder="Create a password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Choose your Look</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                       {AVATARS.slice(0, 8).map(a => (
                         <button 
                           key={a} type="button" 
                           onClick={() => setAvatar(a)}
                           className={`text-2xl p-2 rounded-lg border-2 ${avatar === a ? 'bg-gold border-santa-red scale-110' : 'border-transparent hover:bg-gray-100'}`}
                         >
                           {a}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-pine font-bold text-xs uppercase mb-1">Group Code (Optional)</label>
                    <input 
                      className="w-full p-3 border-2 border-gray-300 border-dashed rounded-lg bg-white uppercase tracking-widest text-center font-bold text-santa-red" 
                      placeholder="ABCD"
                      maxLength={4}
                      value={groupCode}
                      onChange={e => setGroupCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </>
              )}

              {authError && (
                 <div className="bg-red-100 text-santa-red p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                   <Info className="w-4 h-4" /> {authError}
                 </div>
              )}

              <FestiveButton type="submit" className="w-full" shake>
                 {isLogin ? "Enter Workshop" : "Sign Up & Join"}
              </FestiveButton>
            </form>

            <div className="mt-4 text-center">
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
                className="text-pine underline font-bold text-sm hover:text-pine-light"
              >
                {isLogin ? "No account? Sign Up" : "Already have an account? Login"}
              </button>
            </div>
            
            <div className="mt-4 text-center text-xs text-gray-400">
               Real elves only. No bots allowed.
            </div>
        </div>
      </div>
    );
  }

  // --- LOGGED IN: NO GROUP ---
  if (!currentGroup && currentUser && !currentUser.groupId) {
      return (
          <div className="min-h-screen font-body text-gray-900 pattern-stripes relative flex items-center justify-center p-4">
              <Snowfall />
              <div className="bg-white border-4 border-gold p-8 rounded-2xl shadow-xl w-full max-w-md text-center z-10 animate-pop-in">
                  <h2 className="text-2xl font-christmas text-santa-red mb-4">Welcome, {currentUser.displayName}!</h2>
                  <p className="mb-6 text-gray-700">You aren't in a Secret Santa group yet.</p>
                  
                  <div className="space-y-4">
                      <input 
                        className="w-full p-3 border-2 border-pine rounded-lg text-center"
                        placeholder="New Group Name"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                      />
                      <FestiveButton onClick={handleCreateGroup} className="w-full">
                          Create New Group
                      </FestiveButton>
                      
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-xs">OR JOIN EXISTING</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                      </div>
                      
                      <input 
                          className="w-full p-3 border-2 border-gray-300 border-dashed rounded-lg bg-white uppercase tracking-widest text-center font-bold text-santa-red" 
                          placeholder="ENTER CODE"
                          maxLength={4}
                          value={groupCode}
                          onChange={e => setGroupCode(e.target.value.toUpperCase())}
                      />
                       <button 
                        onClick={() => {
                            // Quick join logic directly from here
                            storageService.logout(); // Simple hack: logout to force them to use the code on register, 
                            // OR we could implement a 'joinGroup' service method. 
                            // For simplicity, let's ask them to rejoin via the Signup/Login flow if they missed it, 
                            // OR implementing a join logic:
                            alert("Please logout and use the code during Sign Up, or ask the Admin to send you a link!");
                        }}
                        className="text-pine font-bold underline text-sm"
                      >
                         Join using code
                      </button>

                      <p className="text-xs text-gray-500 mt-4">
                          <button onClick={handleLogout} className="text-santa-red font-bold underline">Logout</button>
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN APP (LOBBY / DRAW / REVEAL) ---
  return (
    <div className="min-h-screen font-body text-gray-900 pattern-stripes relative overflow-x-hidden">
      <Snowfall />

      {/* Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-md z-20 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <span className="text-2xl">{currentUser?.avatar}</span>
             <span className="font-bold text-pine hidden sm:block truncate max-w-[150px]">{currentUser?.displayName}</span>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-santa-red flex items-center gap-1 bg-red-100 px-3 py-1 rounded-full hover:bg-red-200">
             <LogOut className="w-3 h-3" /> <span className="hidden sm:inline">Logout</span>
          </button>
      </nav>

      <main className="relative z-10 container mx-auto px-4 pt-20 pb-8 max-w-md min-h-screen flex flex-col items-center">
        
        {/* Header - Always visible unless drawing */}
        {appState !== 'DRAWING' && currentGroup && (
           <header className="mb-6 text-center w-full animate-wiggle flex flex-col items-center">
             <div className="bg-pine text-white py-2 px-6 rounded-lg shadow-lg border-2 border-gold transform -rotate-1 mb-4">
                 <h2 className="font-christmas text-2xl">{currentGroup.name}</h2>
             </div>
             
             {/* Invite Section */}
             <div className="flex items-center gap-2 bg-white/80 p-2 rounded-full border border-pine-light shadow-sm cursor-pointer hover:bg-white transition-colors" onClick={copyInvite}>
                <span className="text-xs font-bold text-pine uppercase tracking-widest pl-2">Code:</span>
                <span className="font-mono font-bold text-santa-red text-lg">{currentGroup.code}</span>
                <div className="bg-pine text-white p-1.5 rounded-full">
                    <Copy className="w-3 h-3" />
                </div>
             </div>
             <p className="mt-2 text-white text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-1 rounded">
                 Tap to copy & invite friends
             </p>
           </header>
        )}

        {/* --- LOBBY VIEW --- */}
        {appState === 'LOBBY' && (
          <div className="w-full flex flex-col items-center animate-pop-in">
             
             {/* Participants List */}
             <div className="bg-white/90 backdrop-blur p-4 rounded-xl w-full border-4 border-santa-red shadow-xl mb-8 relative">
                {/* Decoration */}
                <div className="absolute -top-3 -right-3 bg-gold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">
                    <Users className="w-4 h-4 text-santa-red" />
                </div>

                <h3 className="text-center text-santa-red font-bold uppercase text-sm mb-4 border-b-2 border-dashed border-gray-200 pb-2">
                   Elves in the Room ({groupMembers.length}/{MAX_GROUP_SIZE})
                </h3>
                
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {groupMembers.map((p) => (
                    <div key={p.id} className="bg-green-50 p-2 rounded-lg flex items-center gap-2 border border-green-100 relative">
                       <span className="text-2xl filter drop-shadow-sm">{p.avatar}</span>
                       <div className="overflow-hidden min-w-0">
                         <p className="font-bold text-pine text-sm truncate">{p.displayName}</p>
                         <p className="text-[10px] text-gray-500 font-bold uppercase">
                           {p.drawnUserId ? '✅ Ready' : '⏳ Waiting'}
                         </p>
                       </div>
                    </div>
                  ))}
                  
                  {/* Invite Placeholder if not full */}
                  {groupMembers.length < MAX_GROUP_SIZE && (
                     <button onClick={copyInvite} className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2 text-gray-400 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                        <UserPlus className="w-5 h-5 mb-1 opacity-50" />
                        <span className="text-[10px] font-bold uppercase text-center">Invite Friend</span>
                     </button>
                  )}
                </div>
             </div>

             <div className="relative z-10">
                <div className="absolute -inset-4 bg-gold rounded-full opacity-50 blur-lg animate-pulse"></div>
                <FestiveButton onClick={startDraw} shake className="w-full max-w-xs text-xl">
                  <Sparkles className="w-6 h-6 animate-spin-slow" />
                  Draw My Match
                </FestiveButton>
             </div>
             
             <p className="mt-8 text-white text-center text-sm font-bold max-w-xs bg-black/20 p-2 rounded-lg backdrop-blur-sm">
                 Once you draw, Santa seals the deal. No peeking! 👀
             </p>
          </div>
        )}

        {/* --- DRAWING ANIMATION --- */}
        {appState === 'DRAWING' && (
          <div className="flex flex-col items-center justify-center w-full py-20">
            <div className="bg-white border-8 border-gold p-8 rounded-full w-64 h-64 flex items-center justify-center shadow-[0_0_50px_rgba(255,215,0,0.6)] animate-bounce-wild mb-8 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-santa-red text-white font-bold px-4 py-1 rounded-full shadow border-2 border-white">
                 SPINNING...
              </div>
              <h2 className="font-christmas text-4xl text-santa-red text-center leading-tight break-words w-full">
                {slotName}
              </h2>
            </div>
            <p className="text-white text-xl font-bold animate-pulse uppercase tracking-widest text-center shadow-black drop-shadow-md">
                Checking the Naughty List...
            </p>
          </div>
        )}

        {/* --- REVEALED STATE --- */}
        {appState === 'REVEALED' && drawnMatch && (
          <div className="w-full animate-pop-in">
            <div className="bg-white border-8 border-santa-red border-dashed rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden">
               {/* Ribbons */}
               <div className="absolute top-0 right-0 bg-gold w-20 h-20 rotate-45 translate-x-10 -translate-y-10 shadow-lg"></div>
               <div className="absolute bottom-0 left-0 bg-gold w-20 h-20 rotate-45 -translate-x-10 translate-y-10 shadow-lg"></div>

               <p className="text-pine font-bold uppercase tracking-widest text-xs mb-4 bg-green-100 inline-block px-3 py-1 rounded-full">
                 Mission Locked 🔒
               </p>
               
               <p className="text-gray-500 font-bold">You are the Secret Santa for...</p>
               
               <div className="my-6 relative inline-block">
                 <div className="text-8xl animate-bounce-wild relative z-10 filter drop-shadow-xl">{drawnMatch.avatar}</div>
                 <div className="absolute inset-0 bg-gold blur-xl opacity-60 z-0 animate-pulse"></div>
               </div>
               
               <h2 className="font-christmas text-5xl text-santa-red mb-2 text-shadow-sm">{drawnMatch.displayName}</h2>
               
               <div className="bg-snow p-4 rounded-xl border-2 border-pine-light mb-6 text-left">
                 <div className="flex items-center gap-2 mb-3 text-santa-red border-b border-gray-200 pb-2">
                   <Gift className="w-5 h-5" />
                   <span className="font-bold uppercase text-sm">Elf-Help Ideas</span>
                 </div>
                 
                 {loadingIdeas ? (
                   <p className="text-sm italic text-gray-500 animate-pulse">Contacting the workshop...</p>
                 ) : (
                   <ul className="text-sm text-gray-700 space-y-2 list-none">
                     {giftIdeas.length > 0 ? giftIdeas.map((idea, idx) => (
                       <li key={idx} className="flex items-start gap-2">
                           <span className="text-gold mt-1">★</span> 
                           <span>{idea}</span>
                       </li>
                     )) : (
                         <li className="text-gray-500 italic">No ideas found. You're on your own!</li>
                     )}
                   </ul>
                 )}
               </div>

               <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-4 rounded-xl cursor-not-allowed border-2 border-dashed border-gray-300">
                   Outcome Finalized
               </button>
            </div>
            
            <div className="mt-8 text-center px-4">
              <p className="text-white font-christmas text-2xl animate-pulse text-shadow-glow">
                "Keep it secret, keep it safe!"
              </p>
              <p className="text-white text-xs mt-2 opacity-80">
                 Check back anytime. Your secret is safe here.
              </p>
            </div>
          </div>
        )}

      </main>
      
      {/* Decorative Floor */}
      <div className="fixed bottom-0 left-0 w-full h-8 bg-white z-0" 
           style={{ clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 95% 50%, 90% 0%, 85% 50%, 80% 0%, 75% 50%, 70% 0%, 65% 50%, 60% 0%, 55% 50%, 50% 0%, 45% 50%, 40% 0%, 35% 50%, 30% 0%, 25% 50%, 20% 0%, 15% 50%, 10% 0%, 5% 50%, 0% 0%)' }}>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
