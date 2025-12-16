import { User, Group } from '../types';
import { MAX_GROUP_SIZE } from '../constants';

const KEY_USERS = 'jingleDraw_users_v2'; // Versioning to avoid conflict with old schema
const KEY_GROUPS = 'jingleDraw_groups_v2';
const KEY_CURRENT_USER = 'jingleDraw_session_v2';

// Helper to get data
const get = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper to save data
const save = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storageService = {
  // --- AUTH ---
  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(KEY_CURRENT_USER);
    if (!session) return null;
    const users = get<User>(KEY_USERS);
    return users.find(u => u.id === session) || null;
  },

  logout: () => {
    localStorage.removeItem(KEY_CURRENT_USER);
  },

  login: (email: string, password: string): { success: boolean; message?: string; user?: User } => {
    const users = get<User>(KEY_USERS);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (user) {
      localStorage.setItem(KEY_CURRENT_USER, user.id);
      return { success: true, user };
    }
    return { success: false, message: "Invalid email or password. Santa is watching!" };
  },

  register: (email: string, password: string, displayName: string, avatar: string, groupCode?: string): { success: boolean; message?: string; user?: User } => {
    const users = get<User>(KEY_USERS);
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: "This email is already on the Nice List!" };
    }

    let groupId: string | null = null;
    
    // Join Group Logic
    if (groupCode) {
      const groups = get<Group>(KEY_GROUPS);
      const group = groups.find(g => g.code === groupCode);
      if (!group) return { success: false, message: "Invalid Workshop Code" };
      if (group.memberIds.length >= MAX_GROUP_SIZE) return { success: false, message: "Workshop is full (20 Elves Max)" };
      
      groupId = group.id;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      displayName,
      password,
      avatar,
      groupId,
      drawnUserId: null
    };

    users.push(newUser);
    save(KEY_USERS, users);
    
    // Update Group if joined immediately
    if (groupId) {
      const groups = get<Group>(KEY_GROUPS);
      const group = groups.find(g => g.id === groupId);
      if (group) {
        group.memberIds.push(newUser.id);
        save(KEY_GROUPS, groups);
      }
    }

    localStorage.setItem(KEY_CURRENT_USER, newUser.id);
    return { success: true, user: newUser };
  },

  // --- GROUPS ---
  createGroup: (name: string, userId: string): Group => {
    const groups = get<Group>(KEY_GROUPS);
    const users = get<User>(KEY_USERS);
    
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      code: Math.random().toString(36).substring(2, 6).toUpperCase(),
      memberIds: [userId]
    };

    groups.push(newGroup);
    save(KEY_GROUPS, groups);

    // Update creator
    const user = users.find(u => u.id === userId);
    if (user) {
      user.groupId = newGroup.id;
      save(KEY_USERS, users);
    }

    return newGroup;
  },

  getGroup: (groupId: string): { group: Group, members: User[] } | null => {
    const groups = get<Group>(KEY_GROUPS);
    const users = get<User>(KEY_USERS);
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return null;
    
    const members = users.filter(u => group.memberIds.includes(u.id));
    return { group, members };
  },

  // --- DRAW LOGIC ---
  drawSecretSanta: (userId: string, groupId: string): { success: boolean, match?: User, message?: string } => {
    const users = get<User>(KEY_USERS);
    const groupData = storageService.getGroup(groupId);
    
    if (!groupData) return { success: false, message: "Group not found" };
    
    const { members } = groupData;
    const currentUser = members.find(m => m.id === userId);
    
    if (!currentUser) return { success: false, message: "User not in group" };
    if (currentUser.drawnUserId) {
        const match = members.find(m => m.id === currentUser.drawnUserId);
        return { success: true, match };
    }

    // 1. Get all IDs that have already been drawn by someone
    const alreadyDrawnIds = new Set(members.map(m => m.drawnUserId).filter(Boolean));
    
    // 2. Filter candidates: Must not be me, must not be already drawn
    let candidates = members.filter(m => m.id !== userId && !alreadyDrawnIds.has(m.id));

    // EDGE CASE: If I am the last person to draw, and only I am left in the pool.
    if (candidates.length === 0) {
      const undrawnPeople = members.filter(m => !alreadyDrawnIds.has(m.id));
      
      // If the only undrawn person is me...
      if (undrawnPeople.length === 1 && undrawnPeople[0].id === userId) {
          // Find a victim to swap with. Ideally someone who didn't draw me.
          // For simplicity: Pick the first person who has drawn someone.
          const swapper = members.find(m => m.drawnUserId && m.drawnUserId !== userId);
          
          if (!swapper || !swapper.drawnUserId) {
              return { success: false, message: "Not enough elves to draw! Need at least 2." };
          }
          
          const stolenGiftId = swapper.drawnUserId; // The person the swapper originally drew
          
          // Assign that person to ME
          currentUser.drawnUserId = stolenGiftId;
          
          // Assign ME to the Swapper
          swapper.drawnUserId = currentUser.id;
          
          // Save both
          const uIndex = users.findIndex(u => u.id === userId);
          const sIndex = users.findIndex(u => u.id === swapper.id);
          users[uIndex] = currentUser;
          users[sIndex] = swapper;
          save(KEY_USERS, users);
          
          const match = members.find(m => m.id === stolenGiftId);
          return { success: true, match };
      }
      
      return { success: false, message: "The magic failed. Try again!" };
    }

    // Standard Draw
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Update DB
    currentUser.drawnUserId = winner.id;
    const index = users.findIndex(u => u.id === userId);
    users[index] = currentUser;
    save(KEY_USERS, users);

    return { success: true, match: winner };
  }
};
