const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Database file path
const __dirname = path.resolve();
const file = path.join(__dirname, 'db.json');

// Ensure db directory exists
if (!fs.existsSync(path.dirname(file))) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
}

class Database {
    constructor() {
        this.adapter = new JSONFile(file);
        this.db = new Low(this.adapter, this.getDefaultData());
    }

    async initialize() {
        await this.db.read();
        this.db.data ||= this.getDefaultData();
        await this.db.write();
    }

    getDefaultData() {
        return {
            users: [
                {
                    id: 'user1',
                    email: 'user@example.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                    role: 'user',
                    balance: 10000,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'admin1',
                    email: 'admin@example.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                    role: 'admin',
                    balance: 50000,
                    createdAt: new Date().toISOString()
                }
            ],
            matches: [
                {
                    id: 'match1',
                    team1: 'India',
                    team2: 'Australia',
                    odds: { back: 1.85, lay: 2.05 },
                    status: 'live',
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'match2',
                    team1: 'England',
                    team2: 'Pakistan',
                    odds: { back: 1.95, lay: 1.95 },
                    status: 'live',
                    updatedAt: new Date().toISOString()
                }
            ],
            bets: [],
            transactions: [],
            withdrawals: []
        };
    }

    async getUserByEmail(email) {
        await this.db.read();
        return this.db.data.users.find(u => u.email === email);
    }

    async createUser(userData) {
        await this.db.read();
        const user = {
            id: uuidv4(),
            ...userData,
            createdAt: new Date().toISOString()
        };
        this.db.data.users.push(user);
        await this.db.write();
        return user;
    }

    async updateUserBalance(userId, amount, type = 'bet') {
        await this.db.read();
        const userIndex = this.db.data.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return false;

        if (type === 'deduct' && this.db.data.users[userIndex].balance < amount) {
            return false; // Insufficient balance
        }

        this.db.data.users[userIndex].balance += type === 'credit' ? amount : -amount;
        await this.db.write();
        return true;
    }

    async createBet(betData) {
        await this.db.read();
        const bet = {
            id: uuidv4(),
            ...betData,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        this.db.data.bets.push(bet);
        await this.db.write();
        return bet;
    }

    async getUserBets(userId) {
        await this.db.read();
        return this.db.data.bets
            .filter(bet => bet.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
    }

    async getMatches() {
        await this.db.read();
        return this.db.data.matches;
    }

    async updateMatchOdds(matchId, odds) {
        await this.db.read();
        const matchIndex = this.db.data.matches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) return false;

        this.db.data.matches[matchIndex].odds = odds;
        this.db.data.matches[matchIndex].updatedAt = new Date().toISOString();
        await this.db.write();
        return true;
    }

    async createTransaction(userId, amount, type, reference) {
        await this.db.read();
        const transaction = {
            id: uuidv4(),
            userId,
            amount,
            type,
            reference,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        this.db.data.transactions.push(transaction);
        await this.db.write();
        return transaction;
    }

    async createWithdrawal(userId, amount, status = 'pending') {
        await this.db.read();
        const withdrawal = {
            id: uuidv4(),
            userId,
            amount,
            status,
            createdAt: new Date().toISOString()
        };
        this.db.data.withdrawals.push(withdrawal);
        await this.db.write();
        return withdrawal;
    }

    async updateWithdrawal(id, status) {
        await this.db.read();
        const withdrawalIndex = this.db.data.withdrawals.findIndex(w => w.id === id);
        if (withdrawalIndex === -1) return false;

        this.db.data.withdrawals[withdrawalIndex].status = status;
        if (status === 'approved') {
            const withdrawal = this.db.data.withdrawals[withdrawalIndex];
            // Deduct from balance (in real app, integrate with payment gateway)
            await this.updateUserBalance(withdrawal.userId, withdrawal.amount, 'deduct');
        }
        await this.db.write();
        return true;
    }

    async getWithdrawals() {
        await this.db.read();
        return this.db.data.withdrawals;
    }
}

// Global DB instance
const db = new Database();
db.initialize();

module.exports = { db };
