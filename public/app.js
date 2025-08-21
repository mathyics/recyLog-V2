// API Configuration
const API_BASE = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'recyclog_token';

// DOM Elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Global variables
let currentUser = null;
let recyclingChart = null;
let materialsChart = null;
let qrScanner = null;
let activityData = [];

// Utility Functions
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide forms
    if (tabName === 'login') {
        showElement(loginForm);
        hideElement(registerForm);
    } else {
        showElement(registerForm);
        hideElement(loginForm);
    }
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function isAuthenticated() {
    return !!getToken();
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication Functions
async function login(email, password) {
    try {
        const data = await apiRequest('/users/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        setToken(data.data.token);
        await loadUserProfile();
        showApp();
        return data;
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
        throw error;
    }
}

async function register(username, email, password) {
    try {
        const data = await apiRequest('/users/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        setToken(data.data.token);
        await loadUserProfile();
        showApp();
        return data;
    } catch (error) {
        document.getElementById('register-error').textContent = error.message;
        throw error;
    }
}

async function logout() {
    try {
        await apiRequest('/users/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clean up charts
        if (recyclingChart) {
            recyclingChart.destroy();
            recyclingChart = null;
        }
        if (materialsChart) {
            materialsChart.destroy();
            materialsChart = null;
        }
        
        clearToken();
        showAuth();
    }
}

async function loadUserProfile() {
    try {
        const data = await apiRequest('/users/me');
        currentUser = data.data.user;
        
        // Update UI with user data
        document.getElementById('total-items').textContent = currentUser.totalItemsRecycled || 0;
        document.getElementById('co2-saved').textContent = `${(currentUser.co2Saved || 0).toFixed(1)} kg`;
        document.getElementById('points').textContent = currentUser.points || 0;
        
        // Update profile section
        updateProfileSection();
        
        // Initialize charts and data
        initializeCharts();
        loadActivityFeed();
        updateChallenges();
        loadLeaderboard();
        
        return currentUser;
    } catch (error) {
        console.error('Failed to load user profile:', error);
        throw error;
    }
}

// UI Functions
function showAuth() {
    hideElement(appSection);
    showElement(authSection);
}

function showApp() {
    hideElement(authSection);
    showElement(appSection);
}

// Sidebar Navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

// Modal Functions
function showLogModal() {
    document.getElementById('log-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('log-modal').style.display = 'none';
}

// QR Scanner Functions
function startQRScanner() {
    document.getElementById('qr-modal').style.display = 'block';
    
    if (!qrScanner) {
        qrScanner = new Html5Qrcode("qr-reader");
    }
    
    qrScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
            handleQRCode(decodedText);
            closeQRScanner();
        },
        (errorMessage) => {
            // Handle scan error
        }
    ).catch((err) => {
        console.error('QR Scanner error:', err);
    });
}

function closeQRScanner() {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            document.getElementById('qr-modal').style.display = 'none';
        });
    } else {
        document.getElementById('qr-modal').style.display = 'none';
    }
}

function handleQRCode(qrData) {
    try {
        const data = JSON.parse(qrData);
        if (data.item_type && data.quantity) {
            document.getElementById('item-type').value = data.item_type;
            document.getElementById('item-quantity').value = data.quantity;
            showLogModal();
        }
    } catch (error) {
        alert('Invalid QR code format');
    }
}

// Recycling Functions
async function logRecycling() {
    const itemType = document.getElementById('item-type').value;
    const quantity = document.getElementById('item-quantity').value;
    
    if (!itemType || !quantity) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const data = await apiRequest('/recycling/log', {
            method: 'POST',
            body: JSON.stringify({ item_type: itemType, quantity: parseInt(quantity) })
        });
        
        // Refresh user data
        await loadUserProfile();
        
        // Add to activity feed
        addActivityItem(itemType, quantity, new Date());
        
        // Close modal
        closeModal();
        
        alert('Recycling activity logged successfully!');
    } catch (error) {
        alert('Failed to log activity: ' + error.message);
    }
}

function addActivityItem(type, quantity, date) {
    const activityFeed = document.getElementById('activity-feed');
    
    // Create activity item
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const typeEmoji = {
        plastic: '🥤',
        glass: '🍷',
        paper: '📄',
        metal: '🥫'
    };
    
    activityItem.innerHTML = `
        <div class="activity-icon">${typeEmoji[type] || '♻️'}</div>
        <div class="activity-details">
            <div class="activity-text">Recycled ${quantity} ${type} items</div>
            <div class="activity-time">${date.toLocaleDateString()}</div>
        </div>
    `;
    
    // Add to activity feed
    const activityList = activityFeed.querySelector('.activity-list') || activityFeed;
    if (!activityFeed.querySelector('.activity-list')) {
        const list = document.createElement('div');
        list.className = 'activity-list';
        activityFeed.appendChild(list);
    }
    
    const list = activityFeed.querySelector('.activity-list');
    list.insertBefore(activityItem, list.firstChild);
    
    // Keep only last 10 activities
    if (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}

// Chart Functions
function initializeCharts() {
    // Destroy existing charts first
    if (recyclingChart) {
        recyclingChart.destroy();
        recyclingChart = null;
    }
    if (materialsChart) {
        materialsChart.destroy();
        materialsChart = null;
    }
    
    // Recycling Chart
    const recyclingCtx = document.getElementById('recycling-chart');
    if (recyclingCtx) {
        recyclingChart = new Chart(recyclingCtx, {
            type: 'line',
            data: {
                labels: getLast7Days(),
                datasets: [{
                    label: 'Items Recycled',
                    data: generateSampleData(7),
                    borderColor: '#00b894',
                    backgroundColor: 'rgba(0, 184, 148, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Recycling Activity (Last 7 Days)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Materials Chart
    const materialsCtx = document.getElementById('materials-chart');
    if (materialsCtx) {
        materialsChart = new Chart(materialsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Plastic', 'Glass', 'Paper', 'Metal'],
                datasets: [{
                    data: [30, 25, 20, 25],
                    backgroundColor: [
                        '#00b894',
                        '#74b9ff',
                        '#fdcb6e',
                        '#e17055'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Recycling by Material Type'
                    }
                }
            }
        });
    }
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dates;
}

function generateSampleData(days) {
    return Array.from({ length: days }, () => Math.floor(Math.random() * 20) + 5);
}

function updateChartDateRange() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (startDate && endDate) {
        // Update chart with new date range
        if (recyclingChart) {
            // This would typically fetch data from the backend
            recyclingChart.data.labels = [startDate, endDate];
            recyclingChart.data.datasets[0].data = generateSampleData(2);
            recyclingChart.update();
        }
    }
}

// Challenge Functions
function updateChallenges() {
    const weeklyProgress = Math.min((currentUser?.totalItemsRecycled || 0) / 50 * 100, 100);
    const monthlyProgress = Math.min((currentUser?.co2Saved || 0) / 100 * 100, 100);
    
    // Update progress bars
    const weeklyBar = document.querySelector('#challenges .progress');
    const monthlyBar = document.querySelector('#challenges .progress:last-of-type');
    
    if (weeklyBar) weeklyBar.style.width = `${weeklyProgress}%`;
    if (monthlyBar) monthlyBar.style.width = `${monthlyProgress}%`;
    
    // Update progress text
    const weeklyText = document.querySelector('#challenges .stat-card:first-child p:last-of-type');
    const monthlyText = document.querySelector('#challenges .stat-card:last-child p:last-of-type');
    
    if (weeklyText) weeklyText.textContent = `${Math.min(currentUser?.totalItemsRecycled || 0, 50)}/50 items`;
    if (monthlyText) monthlyText.textContent = `${Math.min((currentUser?.co2Saved || 0).toFixed(1), 100)}/100 kg`;
}

// Leaderboard Functions
async function loadLeaderboard() {
    try {
        // Fetch real leaderboard data from backend
        const data = await apiRequest('/users/leaderboard');
        const leaderboardData = data.data.users || [];
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            
            if (leaderboardData.length === 0) {
                // Show message if no users found
                const noDataRow = document.createElement('div');
                noDataRow.className = 'leaderboard-row';
                noDataRow.style.textAlign = 'center';
                noDataRow.style.padding = '30px';
                noDataRow.style.color = 'var(--text-secondary)';
                noDataRow.innerHTML = '<span>No users found. Start recycling to appear on the leaderboard!</span>';
                leaderboardList.appendChild(noDataRow);
                return;
            }
            
            leaderboardData.forEach((user, index) => {
                const userRow = document.createElement('div');
                userRow.className = 'leaderboard-row';
                userRow.style.display = 'grid';
                userRow.style.gridTemplateColumns = '80px 1fr 100px';
                userRow.style.gap = '20px';
                userRow.style.padding = '15px';
                userRow.style.borderBottom = '1px solid var(--bg-primary)';
                
                // Highlight current user
                const isCurrentUser = currentUser && user._id === currentUser._id;
                if (isCurrentUser) {
                    userRow.style.backgroundColor = 'var(--accent-color)';
                    userRow.style.color = 'white';
                    userRow.style.borderRadius = '8px';
                }
                
                userRow.innerHTML = `
                    <span style="font-weight: 600; color: ${isCurrentUser ? 'white' : 'var(--accent-color)'};">#${index + 1}</span>
                    <span>${user.username} ${isCurrentUser ? '(You)' : ''}</span>
                    <span style="font-weight: 600;">${user.points || 0}</span>
                `;
                
                leaderboardList.appendChild(userRow);
            });
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        
        // Fallback to show error message
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = `
                <div class="leaderboard-row" style="text-align: center; padding: 30px; color: var(--danger);">
                    <span>Failed to load leaderboard. Please try again later.</span>
                </div>
            `;
        }
    }
}

// Rewards Functions
function claimReward(cost, rewardName) {
    if (currentUser && currentUser.points >= cost) {
        if (confirm(`Claim ${rewardName} for ${cost} points?`)) {
            // In real app, this would call backend API
            alert(`Congratulations! You've claimed ${rewardName}!`);
        }
    } else {
        alert('Not enough points to claim this reward!');
    }
}

// Theme Functions
function toggleTheme() {
    const html = document.documentElement;
    const themeBtn = document.getElementById('theme-btn');
    
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeBtn.textContent = 'Switch to Dark Theme';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeBtn.textContent = 'Switch to Light Theme';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeBtn = document.getElementById('theme-btn');
        if (themeBtn) {
            themeBtn.textContent = savedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
        }
    }
}

// Activity Feed Functions
function loadActivityFeed() {
    // Mock activity data (in real app, this would come from backend)
    const mockActivities = [
        { type: 'plastic', quantity: 5, date: new Date(Date.now() - 86400000) },
        { type: 'glass', quantity: 3, date: new Date(Date.now() - 172800000) },
        { type: 'paper', quantity: 8, date: new Date(Date.now() - 259200000) }
    ];
    
    mockActivities.forEach(activity => {
        addActivityItem(activity.type, activity.quantity, activity.date);
    });
}

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        await login(email, password);
    } catch (error) {
        console.error('Login failed:', error);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        await register(username, email, password);
    } catch (error) {
        console.error('Registration failed:', error);
    }
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Initialize App
async function initApp() {
    loadSavedTheme();
    
    if (isAuthenticated()) {
        try {
            await loadUserProfile();
            showApp();
        } catch (error) {
            console.error('Failed to load profile:', error);
            clearToken();
            showAuth();
        }
    } else {
        showAuth();
    }
}

// Profile Functions
function updateProfileSection() {
    if (!currentUser) return;
    
    // Update profile header
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileJoinDate = document.getElementById('profile-join-date');
    
    if (profileUsername) profileUsername.textContent = currentUser.username;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    
    // Update join date
    const joinDate = new Date(currentUser.createdAt || Date.now());
    if (profileJoinDate) profileJoinDate.textContent = `Joined: ${joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    
    // Update profile form inputs
    const usernameInput = document.getElementById('profile-username-input');
    const emailInput = document.getElementById('profile-email-input');
    
    if (usernameInput) usernameInput.value = currentUser.username;
    if (emailInput) emailInput.value = currentUser.email;
    
    // Update profile stats
    const profileTotalItems = document.getElementById('profile-total-items');
    const profileCo2Saved = document.getElementById('profile-co2-saved');
    const profilePoints = document.getElementById('profile-points');
    const profileMemberSince = document.getElementById('profile-member-since');
    
    if (profileTotalItems) profileTotalItems.textContent = currentUser.totalItemsRecycled || 0;
    if (profileCo2Saved) profileCo2Saved.textContent = `${(currentUser.co2Saved || 0).toFixed(1)} kg`;
    if (profilePoints) profilePoints.textContent = currentUser.points || 0;
    if (profileMemberSince) profileMemberSince.textContent = joinDate.getFullYear();
    
    // Update avatar if exists
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    if (currentUser.avatar && profileAvatarImg) {
        profileAvatarImg.src = currentUser.avatar;
    }
}

function resetProfileForm() {
    if (currentUser) {
        const usernameInput = document.getElementById('profile-username-input');
        const emailInput = document.getElementById('profile-email-input');
        const passwordInput = document.getElementById('profile-password');
        const confirmPasswordInput = document.getElementById('profile-confirm-password');
        
        if (usernameInput) usernameInput.value = currentUser.username;
        if (emailInput) emailInput.value = currentUser.email;
        if (passwordInput) passwordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    }
}

// Profile Update Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profile-update-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('profile-username-input').value;
            const email = document.getElementById('profile-email-input').value;
            const password = document.getElementById('profile-password').value;
            const confirmPassword = document.getElementById('profile-confirm-password').value;
            
            // Validate password confirmation
            if (password && password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            try {
                // Prepare update data
                const updateData = { username, email };
                if (password) {
                    updateData.password = password;
                }
                
                // Call API to update profile
                await apiRequest('/users/profile', {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                
                // Refresh user profile
                await loadUserProfile();
                
                alert('Profile updated successfully!');
                
                // Clear password fields
                document.getElementById('profile-password').value = '';
                document.getElementById('profile-confirm-password').value = '';
                
            } catch (error) {
                alert('Failed to update profile: ' + error.message);
            }
        });
    }
    
    // Avatar upload handler
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('avatar', file);
                    
                    // Call API to upload avatar - use different endpoint for file uploads
                    const token = getToken();
                    const response = await fetch(`${API_BASE}/users/profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                            // Don't set Content-Type - let browser set it for FormData
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `HTTP ${response.status}`);
                    }
                    
                    // Refresh user profile
                    await loadUserProfile();
                    
                    alert('Avatar updated successfully!');
                    
                } catch (error) {
                    console.error('Avatar upload error:', error);
                    alert('Failed to update avatar: ' + error.message);
                }
            }
        });
    }
});

// Start the app
document.addEventListener('DOMContentLoaded', initApp);