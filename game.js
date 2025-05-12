// Main game loop and setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameRunning = false;
let lastTime = 0;
let player;
let boss;
let keys = {};
let mouse = { x: 0, y: 0, left: false, right: false };
let stunMeter = 0;
const STUN_THRESHOLD = 100;
let stunActive = false;
let stunTimer = 0;
const STUN_DURATION = 2; // seconds

// Initialize game
function initGame(stats) {
    player = new Player(canvas.width / 2, canvas.height / 2, stats);
    boss = new Boss(canvas.width / 2, 150);
    gameRunning = true;
    stunMeter = 0;
    stunActive = false;
    updateStunMeter();
    updateHealthBars();
    requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTime) {
    player.update(deltaTime, keys, mouse, boss);
    boss.update(deltaTime, player);
    
    // Update stun timer if active
    if (stunActive) {
        stunTimer -= deltaTime;
        if (stunTimer <= 0) {
            stunActive = false;
        }
    }
    
    // Check for death or victory
    if (player.health <= 0) {
        gameRunning = false;
        showScreen('death-screen');
    } else if (boss.health <= 0) {
        gameRunning = false;
        showScreen('win-screen');
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw arena
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 250, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player and boss
    player.render(ctx);
    boss.render(ctx);
    
    // Draw attack indicators
    boss.renderAttackIndicators(ctx);
    
    // Draw spell effects if any
    if (player.spellActive) {
        player.renderSpell(ctx);
    }
}

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Helper functions
function updateHealthBars() {
    document.getElementById('player-health').style.width = `${(player.health / player.maxHealth) * 100}%`;
    document.getElementById('boss-health').style.width = `${(boss.health / boss.maxHealth) * 100}%`;
}

function updateStunMeter() {
    document.getElementById('stun-meter').style.width = `${(stunMeter / STUN_THRESHOLD) * 100}%`;
}

function addToStunMeter(amount) {
    if (stunActive) return;
    
    stunMeter += amount;
    if (stunMeter >= STUN_THRESHOLD) {
        stunMeter = STUN_THRESHOLD;
        stunActive = true;
        stunTimer = STUN_DURATION;
    }
    updateStunMeter();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// Stat distribution system
function initializeStats() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.value = 1;
        input.nextElementSibling.textContent = 1;
        input.min = 1;
        input.max = 20;
    });
    document.getElementById('points-left').textContent = 20;
}

function updateStatDistribution() {
    const inputs = document.querySelectorAll('input[type="number"]');
    let totalAddedPoints = 0;
    
    // Calculate how many points have been added beyond the base 1 in each stat
    inputs.forEach(input => {
        let value = parseInt(input.value);
        if (isNaN(value)) value = 1;
        if (value < 1) value = 1;
        if (value > 20) value = 20;
        input.value = value;
        
        // Points added beyond the base 1
        totalAddedPoints += (value - 1);
        
        // Update the displayed value
        input.nextElementSibling.textContent = value;
    });
    
    // Adjust points to ensure total added points is exactly 20
    if (totalAddedPoints > 20) {
        // Find the first input that has points we can reduce
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const currentValue = parseInt(input.value);
            if (currentValue > 1) {
                const neededReduction = totalAddedPoints - 20;
                const possibleReduction = currentValue - 1;
                const reduction = Math.min(neededReduction, possibleReduction);
                
                input.value = currentValue - reduction;
                input.nextElementSibling.textContent = input.value;
                totalAddedPoints -= reduction;
                
                if (totalAddedPoints <= 20) break;
            }
        }
    }
    
    document.getElementById('points-left').textContent = 20 - totalAddedPoints;
}

// Initialize UI
document.getElementById('start-game').addEventListener('click', () => {
    const stats = {
        strength: parseInt(document.getElementById('strength').value),
        agility: parseInt(document.getElementById('agility').value),
        vitality: parseInt(document.getElementById('vitality').value),
        dexterity: parseInt(document.getElementById('dexterity').value),
        intelligence: parseInt(document.getElementById('intelligence').value)
    };
    
    showScreen('game-screen');
    initGame(stats);
});

document.getElementById('play-again-win').addEventListener('click', () => {
    showScreen('stat-screen');
});

document.getElementById('play-again-death').addEventListener('click', () => {
    showScreen('stat-screen');
});

// Initialize stat distribution
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', updateStatDistribution);
});

// Initialize the stat screen
showScreen('stat-screen');
initializeStats();