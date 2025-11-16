// Game state
const gameState = {
    score: 0,
    lives: 3,
    highScore: 0,
    isPlaying: false,
    fruits: [],
    particles: [],
    trail: [],
    lastSpawnTime: 0,
    spawnInterval: 1000,
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false
};

// Fruit types configuration
const fruitTypes = [
    { name: 'watermelon', color: '#FF6B6B', size: 60, points: 10 },
    { name: 'apple', color: '#FF4444', size: 45, points: 10 },
    { name: 'orange', color: '#FFA500', size: 45, points: 10 },
    { name: 'banana', color: '#FFD700', size: 50, points: 10, shape: 'oval' },
    { name: 'strawberry', color: '#E63946', size: 35, points: 10, shape: 'triangle' }
];

// Game configuration
const config = {
    initialLives: 3,
    spawnIntervalMin: 800,
    spawnIntervalMax: 1500,
    bombProbability: 0.12,
    trailFadeTime: 200,
    sliceDetectionThreshold: 30
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Menu and screen management
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const playAgainButton = document.getElementById('playAgainButton');
const menuButton = document.getElementById('menuButton');

startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', startGame);
menuButton.addEventListener('click', showMenu);

function showMenu() {
    menuScreen.classList.remove('hidden');
    gameScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameState.isPlaying = false;
    document.getElementById('menuHighScore').textContent = gameState.highScore;
}

function startGame() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.add('active');
    gameOverScreen.classList.remove('active');
    
    // Reset game state
    gameState.score = 0;
    gameState.lives = config.initialLives;
    gameState.isPlaying = true;
    gameState.fruits = [];
    gameState.particles = [];
    gameState.trail = [];
    gameState.lastSpawnTime = Date.now();
    gameState.spawnInterval = config.spawnIntervalMin + Math.random() * (config.spawnIntervalMax - config.spawnIntervalMin);
    
    updateUI();
    gameLoop();
}

function gameOver() {
    gameState.isPlaying = false;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
    }
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('bestScore').textContent = gameState.highScore;
    
    gameOverScreen.classList.add('active');
}

function updateUI() {
    document.getElementById('scoreValue').textContent = gameState.score;
    document.getElementById('livesValue').textContent = gameState.lives;
}

// Input handling
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    gameState.isMouseDown = true;
    gameState.mouseX = e.clientX;
    gameState.mouseY = e.clientY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (gameState.isMouseDown && gameState.isPlaying) {
        gameState.mouseX = e.clientX;
        gameState.mouseY = e.clientY;
        
        addTrailPoint(e.clientX, e.clientY);
        checkSlice(lastMouseX, lastMouseY, e.clientX, e.clientY);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

canvas.addEventListener('mouseup', () => {
    gameState.isMouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
    gameState.isMouseDown = false;
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    gameState.isMouseDown = true;
    gameState.mouseX = touch.clientX;
    gameState.mouseY = touch.clientY;
    lastMouseX = touch.clientX;
    lastMouseY = touch.clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState.isMouseDown && gameState.isPlaying) {
        const touch = e.touches[0];
        gameState.mouseX = touch.clientX;
        gameState.mouseY = touch.clientY;
        
        addTrailPoint(touch.clientX, touch.clientY);
        checkSlice(lastMouseX, lastMouseY, touch.clientX, touch.clientY);
        
        lastMouseX = touch.clientX;
        lastMouseY = touch.clientY;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.isMouseDown = false;
});

// Trail management
function addTrailPoint(x, y) {
    gameState.trail.push({
        x: x,
        y: y,
        time: Date.now()
    });
}

// Fruit spawning
function spawnFruit() {
    const isBomb = Math.random() < config.bombProbability;
    
    if (isBomb) {
        spawnBomb();
    } else {
        const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        const x = Math.random() * (canvas.width - 100) + 50;
        const vx = (Math.random() - 0.5) * 8;
        const vy = -(Math.random() * 5 + 15);
        
        gameState.fruits.push({
            x: x,
            y: canvas.height,
            vx: vx,
            vy: vy,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            type: fruitType,
            isBomb: false,
            sliced: false
        });
    }
}

function spawnBomb() {
    const x = Math.random() * (canvas.width - 100) + 50;
    const vx = (Math.random() - 0.5) * 8;
    const vy = -(Math.random() * 5 + 15);
    
    gameState.fruits.push({
        x: x,
        y: canvas.height,
        vx: vx,
        vy: vy,
        rotation: 0,
        rotationSpeed: 0,
        type: { name: 'bomb', color: '#000000', size: 40 },
        isBomb: true,
        sliced: false
    });
}

// Collision detection
function checkSlice(x1, y1, x2, y2) {
    gameState.fruits.forEach((fruit) => {
        if (!fruit.sliced) {
            const dist = distanceToLineSegment(fruit.x, fruit.y, x1, y1, x2, y2);
            
            if (dist < fruit.type.size / 2 + config.sliceDetectionThreshold) {
                sliceFruit(fruit);
            }
        }
    });
}

function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
        return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

function sliceFruit(fruit) {
    fruit.sliced = true;
    
    if (fruit.isBomb) {
        gameOver();
        return;
    }
    
    gameState.score += fruit.type.points;
    updateUI();
    
    // Create particle effect
    createParticles(fruit.x, fruit.y, fruit.type.color);
    
    // Create fruit halves
    createFruitHalves(fruit);
}

function createParticles(x, y, color) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        
        gameState.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: color,
            size: Math.random() * 8 + 3
        });
    }
}

function createFruitHalves(fruit) {
    // Left half
    gameState.fruits.push({
        x: fruit.x - 5,
        y: fruit.y,
        vx: fruit.vx - 5,
        vy: fruit.vy,
        rotation: fruit.rotation,
        rotationSpeed: -0.3,
        type: fruit.type,
        isBomb: false,
        sliced: true,
        isHalf: true,
        halfSide: 'left'
    });
    
    // Right half
    gameState.fruits.push({
        x: fruit.x + 5,
        y: fruit.y,
        vx: fruit.vx + 5,
        vy: fruit.vy,
        rotation: fruit.rotation,
        rotationSpeed: 0.3,
        type: fruit.type,
        isBomb: false,
        sliced: true,
        isHalf: true,
        halfSide: 'right'
    });
}

// Update loop
function updateGame(deltaTime) {
    const now = Date.now();
    
    // Spawn fruits
    if (now - gameState.lastSpawnTime > gameState.spawnInterval) {
        spawnFruit();
        gameState.lastSpawnTime = now;
        gameState.spawnInterval = config.spawnIntervalMin + Math.random() * (config.spawnIntervalMax - config.spawnIntervalMin);
    }
    
    // Update fruits
    gameState.fruits = gameState.fruits.filter((fruit) => {
        fruit.vy += 0.5; // Gravity
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;
        fruit.rotation += fruit.rotationSpeed;
        
        // Check if fruit fell off screen
        if (fruit.y > canvas.height + 100) {
            if (!fruit.sliced && !fruit.isBomb && !fruit.isHalf) {
                gameState.lives--;
                updateUI();
                
                if (gameState.lives <= 0) {
                    gameOver();
                }
            }
            return false;
        }
        
        return fruit.y < canvas.height + 200;
    });
    
    // Update particles
    gameState.particles = gameState.particles.filter((particle) => {
        particle.vy += 0.3; // Gravity
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        
        return particle.life > 0;
    });
    
    // Update trail
    gameState.trail = gameState.trail.filter((point) => {
        return now - point.time < config.trailFadeTime;
    });
}

// Render loop
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw fruits
    gameState.fruits.forEach((fruit) => {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        // Draw shadow
        if (!fruit.isHalf) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            if (fruit.type.shape === 'oval') {
                ctx.ellipse(2, 5, fruit.type.size * 0.6, fruit.type.size * 0.4, 0, 0, Math.PI * 2);
            } else if (fruit.type.shape === 'triangle') {
                const size = fruit.type.size;
                ctx.moveTo(0, -size * 0.6 + 5);
                ctx.lineTo(-size * 0.5, size * 0.4 + 5);
                ctx.lineTo(size * 0.5, size * 0.4 + 5);
            } else {
                ctx.arc(2, 5, fruit.type.size / 2, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        
        // Draw fruit or bomb
        if (fruit.isBomb) {
            // Draw bomb
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(0, 0, fruit.type.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw highlight
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(-8, -8, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw fuse
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -fruit.type.size / 2);
            ctx.lineTo(5, -fruit.type.size / 2 - 15);
            ctx.stroke();
            
            // Draw spark
            ctx.fillStyle = '#FF6600';
            ctx.beginPath();
            ctx.arc(5, -fruit.type.size / 2 - 15, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (fruit.isHalf) {
            // Draw half fruit
            ctx.fillStyle = fruit.type.color;
            ctx.beginPath();
            if (fruit.halfSide === 'left') {
                ctx.arc(0, 0, fruit.type.size / 2, Math.PI / 2, -Math.PI / 2);
            } else {
                ctx.arc(0, 0, fruit.type.size / 2, -Math.PI / 2, Math.PI / 2);
            }
            ctx.closePath();
            ctx.fill();
            
            // Draw inner part
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            if (fruit.halfSide === 'left') {
                ctx.arc(0, 0, fruit.type.size / 3, Math.PI / 2, -Math.PI / 2);
            } else {
                ctx.arc(0, 0, fruit.type.size / 3, -Math.PI / 2, Math.PI / 2);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // Draw whole fruit
            ctx.fillStyle = fruit.type.color;
            ctx.beginPath();
            
            if (fruit.type.shape === 'oval') {
                ctx.ellipse(0, 0, fruit.type.size * 0.6, fruit.type.size * 0.4, 0, 0, Math.PI * 2);
            } else if (fruit.type.shape === 'triangle') {
                const size = fruit.type.size;
                ctx.moveTo(0, -size * 0.6);
                ctx.lineTo(-size * 0.5, size * 0.4);
                ctx.lineTo(size * 0.5, size * 0.4);
                ctx.closePath();
            } else {
                ctx.arc(0, 0, fruit.type.size / 2, 0, Math.PI * 2);
            }
            
            ctx.fill();
            
            // Draw highlight
            if (!fruit.type.shape) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.arc(-fruit.type.size / 6, -fruit.type.size / 6, fruit.type.size / 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    });
    
    // Draw particles
    gameState.particles.forEach((particle) => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
    
    // Draw trail
    if (gameState.trail.length > 1) {
        const now = Date.now();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        
        ctx.beginPath();
        ctx.moveTo(gameState.trail[0].x, gameState.trail[0].y);
        
        for (let i = 1; i < gameState.trail.length; i++) {
            const age = now - gameState.trail[i].time;
            const alpha = 1 - (age / config.trailFadeTime);
            ctx.globalAlpha = alpha;
            ctx.lineTo(gameState.trail[i].x, gameState.trail[i].y);
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

// Main game loop
let lastTime = Date.now();

function gameLoop() {
    if (!gameState.isPlaying) return;
    
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;
    
    updateGame(deltaTime);
    renderGame();
    
    requestAnimationFrame(gameLoop);
}

// Initialize
document.getElementById('menuHighScore').textContent = gameState.highScore;