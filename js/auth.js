// ===== AUTH SYSTEM (localStorage-based) =====
const Auth = {
    USERS_KEY: 'smartup_users',
    SESSION_KEY: 'smartup_session',

    getUsers() {
        return JSON.parse(localStorage.getItem(this.USERS_KEY) || '{}');
    },

    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
    },

    register(username, displayName, password) {
        const users = this.getUsers();
        const key = username.toLowerCase().trim();

        if (key.length < 3) return { success: false, message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' };
        if (password.length < 4) return { success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' };
        if (users[key]) return { success: false, message: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' };

        users[key] = {
            username: key,
            displayName: displayName || username,
            passwordHash: this.hashPassword(password),
            createdAt: Date.now(),
            xp: 0,
            level: 1,
            streak: 0,
            lastCheckIn: null,
            checkInDays: [],
            achievements: [],
            quizHistory: [],
            stats: {
                math: { score: 0, quizzes: 0, best: 0 },
                science: { score: 0, quizzes: 0, best: 0 },
                scienceM3: { score: 0, quizzes: 0, best: 0 },
                english: { score: 0, quizzes: 0, best: 0 },
                mathExtra: { score: 0, quizzes: 0, best: 0 }
            }
        };

        this.saveUsers(users);
        this.setSession(key);
        return { success: true, message: 'สมัครสมาชิกสำเร็จ!' };
    },

    login(username, password) {
        const users = this.getUsers();
        const key = username.toLowerCase().trim();
        const user = users[key];

        if (!user) return { success: false, message: 'ไม่พบชื่อผู้ใช้นี้' };
        if (user.passwordHash !== this.hashPassword(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };

        this.setSession(key);
        return { success: true, message: 'เข้าสู่ระบบสำเร็จ!' };
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'auth.html';
    },

    setSession(username) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify({
            username,
            loginAt: Date.now()
        }));
    },

    getSession() {
        const data = localStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        const users = this.getUsers();
        return users[session.username] || null;
    },

    updateUser(username, updates) {
        const users = this.getUsers();
        if (users[username]) {
            Object.assign(users[username], updates);
            this.saveUsers(users);
        }
    },

    isLoggedIn() {
        return !!this.getSession();
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'auth.html';
            return false;
        }
        return true;
    }
};

// ===== XP & LEVEL SYSTEM =====
const XPSystem = {
    LEVELS: [
        { level: 1, xp: 0, title: 'มือใหม่หัดเรียน' },
        { level: 2, xp: 100, title: 'นักเรียนตัวน้อย' },
        { level: 3, xp: 300, title: 'ผู้แสวงหาความรู้' },
        { level: 4, xp: 600, title: 'นักคิดรุ่นเยาว์' },
        { level: 5, xp: 1000, title: 'เด็กเก่ง' },
        { level: 6, xp: 1500, title: 'นักเรียนดีเด่น' },
        { level: 7, xp: 2200, title: 'อัจฉริยะน้อย' },
        { level: 8, xp: 3000, title: 'ปราชญ์แห่งความรู้' },
        { level: 9, xp: 4000, title: 'เทพแห่งการเรียน' },
        { level: 10, xp: 5500, title: 'ตำนานแห่ง SmartUp' }
    ],

    getLevel(xp) {
        let current = this.LEVELS[0];
        for (const lvl of this.LEVELS) {
            if (xp >= lvl.xp) current = lvl;
            else break;
        }
        return current;
    },

    getNextLevel(xp) {
        for (const lvl of this.LEVELS) {
            if (xp < lvl.xp) return lvl;
        }
        return null;
    },

    getProgress(xp) {
        const current = this.getLevel(xp);
        const next = this.getNextLevel(xp);
        if (!next) return 100;
        const range = next.xp - current.xp;
        const progress = xp - current.xp;
        return Math.round((progress / range) * 100);
    },

    addXP(username, amount, reason) {
        const users = Auth.getUsers();
        const user = users[username];
        if (!user) return;

        const oldLevel = this.getLevel(user.xp);
        user.xp += amount;
        const newLevel = this.getLevel(user.xp);
        user.level = newLevel.level;

        Auth.saveUsers(users);

        if (newLevel.level > oldLevel.level) {
            return { levelUp: true, newLevel: newLevel };
        }
        return { levelUp: false };
    }
};

// ===== CHECK-IN SYSTEM =====
const CheckIn = {
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    canCheckIn(user) {
        return user.lastCheckIn !== this.getToday();
    },

    doCheckIn(username) {
        const users = Auth.getUsers();
        const user = users[username];
        if (!user) return null;

        const today = this.getToday();
        if (user.lastCheckIn === today) {
            return { success: false, message: 'คุณเช็คอินวันนี้แล้ว' };
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (user.lastCheckIn === yesterdayStr) {
            user.streak += 1;
        } else {
            user.streak = 1;
        }

        user.lastCheckIn = today;
        if (!user.checkInDays) user.checkInDays = [];
        user.checkInDays.push(today);
        if (user.checkInDays.length > 60) {
            user.checkInDays = user.checkInDays.slice(-60);
        }

        Auth.saveUsers(users);

        let xpEarned = 10;
        if (user.streak >= 7) xpEarned = 30;
        else if (user.streak >= 3) xpEarned = 20;

        const xpResult = XPSystem.addXP(username, xpEarned, 'check-in');

        Achievements.check(username);

        return {
            success: true,
            streak: user.streak,
            xpEarned,
            levelUp: xpResult?.levelUp,
            newLevel: xpResult?.newLevel
        };
    }
};

// ===== ACHIEVEMENT SYSTEM =====
const Achievements = {
    LIST: [
        { id: 'first_login', name: 'ก้าวแรก', desc: 'เข้าสู่ระบบครั้งแรก', icon: '&#127793;', xp: 10 },
        { id: 'streak_3', name: 'ขยันสม่ำเสมอ', desc: 'เช็คอิน 3 วันติดต่อกัน', icon: '&#128293;', xp: 30 },
        { id: 'streak_7', name: 'นักสู้ 7 วัน', desc: 'เช็คอิน 7 วันติดต่อกัน', icon: '&#9889;', xp: 70 },
        { id: 'streak_30', name: 'เหล็กกล้าไม่ท้อ', desc: 'เช็คอิน 30 วันติดต่อกัน', icon: '&#128142;', xp: 300 },
        { id: 'first_quiz', name: 'ลองของ', desc: 'ทำแบบทดสอบครั้งแรก', icon: '&#128221;', xp: 15 },
        { id: 'perfect_score', name: 'เพอร์เฟค!', desc: 'ได้คะแนนเต็ม 100%', icon: '&#127775;', xp: 50 },
        { id: 'all_subjects', name: 'รอบรู้', desc: 'ทำแบบทดสอบครบทุกวิชา', icon: '&#127891;', xp: 100 },
        { id: 'xp_500', name: 'นักสะสม', desc: 'สะสม XP ครบ 500', icon: '&#128176;', xp: 50 },
        { id: 'xp_2000', name: 'ร่ำรวยความรู้', desc: 'สะสม XP ครบ 2,000', icon: '&#128081;', xp: 100 },
        { id: 'level_5', name: 'เด็กเก่ง', desc: 'ถึง Level 5', icon: '&#11088;', xp: 80 },
        { id: 'quiz_10', name: 'นักทดสอบ', desc: 'ทำแบบทดสอบครบ 10 ครั้ง', icon: '&#128202;', xp: 60 },
        { id: 'high_avg', name: 'คะแนนงาม', desc: 'คะแนนเฉลี่ยเกิน 80%', icon: '&#127942;', xp: 80 }
    ],

    check(username) {
        const users = Auth.getUsers();
        const user = users[username];
        if (!user) return [];

        if (!user.achievements) user.achievements = [];
        const newAchievements = [];

        const earned = new Set(user.achievements);

        const checks = {
            'first_login': () => true,
            'streak_3': () => user.streak >= 3,
            'streak_7': () => user.streak >= 7,
            'streak_30': () => user.streak >= 30,
            'first_quiz': () => user.quizHistory && user.quizHistory.length >= 1,
            'perfect_score': () => user.quizHistory && user.quizHistory.some(q => q.percent === 100),
            'all_subjects': () => {
                const s = user.stats;
                if (!s.scienceM3) s.scienceM3 = { score: 0, quizzes: 0, best: 0 };
                return s.math.quizzes > 0 && s.science.quizzes > 0 && s.scienceM3.quizzes > 0 && s.english.quizzes > 0 && s.mathExtra.quizzes > 0;
            },
            'xp_500': () => user.xp >= 500,
            'xp_2000': () => user.xp >= 2000,
            'level_5': () => user.level >= 5,
            'quiz_10': () => user.quizHistory && user.quizHistory.length >= 10,
            'high_avg': () => {
                if (!user.quizHistory || user.quizHistory.length < 3) return false;
                const avg = user.quizHistory.reduce((s, q) => s + q.percent, 0) / user.quizHistory.length;
                return avg >= 80;
            }
        };

        for (const achievement of this.LIST) {
            if (!earned.has(achievement.id) && checks[achievement.id] && checks[achievement.id]()) {
                user.achievements.push(achievement.id);
                newAchievements.push(achievement);
                user.xp += achievement.xp;
            }
        }

        user.level = XPSystem.getLevel(user.xp).level;
        Auth.saveUsers(users);
        return newAchievements;
    },

    getEarned(user) {
        if (!user || !user.achievements) return [];
        return this.LIST.filter(a => user.achievements.includes(a.id));
    },

    getAll() {
        return this.LIST;
    }
};

// ===== LEADERBOARD =====
const Leaderboard = {
    getRankings(sortBy = 'xp') {
        const users = Auth.getUsers();
        const list = Object.values(users).map(u => ({
            displayName: u.displayName,
            username: u.username,
            xp: u.xp || 0,
            level: u.level || 1,
            streak: u.streak || 0,
            totalQuizzes: u.quizHistory ? u.quizHistory.length : 0,
            avgScore: u.quizHistory && u.quizHistory.length > 0
                ? Math.round(u.quizHistory.reduce((s, q) => s + q.percent, 0) / u.quizHistory.length)
                : 0,
            achievements: u.achievements ? u.achievements.length : 0
        }));

        list.sort((a, b) => b[sortBy] - a[sortBy]);
        return list;
    }
};

// ===== QUIZ INTEGRATION WITH AUTH =====
function recordQuizResult(subject, correct, total) {
    const session = Auth.getSession();
    if (!session) return;

    const users = Auth.getUsers();
    const user = users[session.username];
    if (!user) return;

    const percent = Math.round((correct / total) * 100);

    if (!user.quizHistory) user.quizHistory = [];
    user.quizHistory.push({
        subject,
        correct,
        total,
        percent,
        date: new Date().toISOString()
    });

    if (!user.stats[subject]) user.stats[subject] = { score: 0, quizzes: 0, best: 0 };
    user.stats[subject].quizzes++;
    user.stats[subject].score += correct;
    if (percent > user.stats[subject].best) {
        user.stats[subject].best = percent;
    }

    Auth.saveUsers(users);

    let xpEarned = 20;
    if (percent === 100) xpEarned = 80;
    else if (percent >= 80) xpEarned = 50;
    else if (percent >= 60) xpEarned = 35;

    const xpResult = XPSystem.addXP(session.username, xpEarned, `quiz-${subject}`);
    const newAchievements = Achievements.check(session.username);

    // Refresh navbar XP/level display
    if (typeof initAuthUI === 'function') {
        try { initAuthUI(); } catch (e) {}
    }

    return {
        xpEarned,
        levelUp: xpResult?.levelUp || false,
        newLevel: xpResult?.newLevel || null,
        newAchievements: newAchievements || []
    };
}

// ===== NAVBAR USER DISPLAY =====
function initAuthUI() {
    const user = Auth.getCurrentUser();
    const navLinks = document.getElementById('navLinks');

    if (user && navLinks) {
        const levelInfo = XPSystem.getLevel(user.xp);

        const existingProfile = navLinks.querySelector('.nav-profile');
        if (existingProfile) existingProfile.remove();

        const li = document.createElement('li');
        li.className = 'nav-profile';
        li.innerHTML = `
            <a href="profile.html" style="display:flex;align-items:center;gap:8px;">
                <span style="background:var(--gradient-1);color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">Lv${user.level}</span>
                <span>${user.displayName}</span>
            </a>
        `;
        navLinks.appendChild(li);

        const li2 = document.createElement('li');
        li2.innerHTML = `<a href="leaderboard.html">&#127942; อันดับ</a>`;
        navLinks.insertBefore(li2, li);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
});
