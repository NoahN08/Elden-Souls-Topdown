// player.js
const playerSprite = new Image();
playerSprite.src = 'sprite/player_idle.png';

class Player {
    constructor(x, y, stats) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.baseSpeed = 200;
        this.speed = this.baseSpeed;
        this.color = '#3498db';
        
        // Stats
        this.strength = stats.strength;
        this.agility = stats.agility;
        this.vitality = stats.vitality;
        this.dexterity = stats.dexterity;
        this.intelligence = stats.intelligence;
        
        // Derived attributes
        this.maxHealth = 100 + (this.vitality * 10);
        this.health = this.maxHealth;
        this.attackDamage = 20 + (this.strength * 3);
        this.attackCooldown = 0.5 - (this.dexterity * 0.01);
        this.rollCooldown = 1.5 - (this.agility * 0.05);
        this.spellDamage = 30 + (this.intelligence * 4);
        
        // State
        this.attackTimer = 0;
        this.rollTimer = 0;
        this.isRolling = false;
        this.rollDirection = { x: 0, y: 0 };
        this.rollSpeed = 400;
        this.iframes = false;
        this.iframesTimer = 0;
        this.blocking = false;
        this.spellCooldown = 0;
        this.spellActive = false;
        this.spellTimer = 0;
        this.spellDirection = { x: 0, y: 0 };
        this.spellX = 0;
        this.spellY = 0;
        this.spellRadius = 10;
        this.rotationAngle = 0; // Added for sprite rotation
    }
    
    update(deltaTime, keys, mouse, boss) {
        // Handle timers
        this.attackTimer -= deltaTime;
        this.rollTimer -= deltaTime;
        this.spellCooldown -= deltaTime;
        
        if (this.iframes) {
            this.iframesTimer -= deltaTime;
            if (this.iframesTimer <= 0) {
                this.iframes = false;
            }
        }
        
        if (this.spellActive) {
            this.spellTimer -= deltaTime;
            this.spellX += this.spellDirection.x * 500 * deltaTime;
            this.spellY += this.spellDirection.y * 500 * deltaTime;
            
            // Check spell collision with boss
            const dx = this.spellX - boss.x;
            const dy = this.spellY - boss.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.spellRadius + boss.radius) {
                boss.takeDamage(this.spellDamage, stunActive);
                addToStunMeter(this.spellDamage * 0.5);
                this.spellActive = false;
            }
            
            if (this.spellTimer <= 0) {
                this.spellActive = false;
            }
        }
        
        // Handle blocking
        this.blocking = mouse.right;
        this.speed = this.blocking ? this.baseSpeed * 0.5 : this.baseSpeed;
        
        // Movement
        let moveX = 0;
        let moveY = 0;
        
        if (!this.isRolling) {
            if (keys['a'] || keys['arrowleft']) moveX = -1;
            if (keys['d'] || keys['arrowright']) moveX = 1;
            if (keys['w'] || keys['arrowup']) moveY = -1;
            if (keys['s'] || keys['arrowdown']) moveY = 1;
            
            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.7071;
                moveY *= 0.7071;
            }
            
            // Handle rolling
            if ((keys[' '] || keys['shift']) && this.rollTimer <= 0 && (moveX !== 0 || moveY !== 0)) {
                this.isRolling = true;
                this.rollTimer = this.rollCooldown;
                this.rollDirection = { x: moveX, y: moveY };
                this.iframes = true;
                this.iframesTimer = 0.3;
            }
        }
        
        // Handle rolling movement
        if (this.isRolling) {
            moveX = this.rollDirection.x;
            moveY = this.rollDirection.y;
            
            // End roll after short duration
            this.rollTimer -= deltaTime;
            if (this.rollTimer <= this.rollCooldown - 0.4) {
                this.isRolling = false;
            }
        }
        
        // Apply movement
        const newX = this.x + moveX * this.speed * deltaTime * (this.isRolling ? this.rollSpeed / this.speed : 1);
        const newY = this.y + moveY * this.speed * deltaTime * (this.isRolling ? this.rollSpeed / this.speed : 1);
        
        // Boundary checks
        const arenaCenterX = canvas.width / 2;
        const arenaCenterY = canvas.height / 2;
        const arenaRadius = 250 - this.radius;
        
        const dx = newX - arenaCenterX;
        const dy = newY - arenaCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= arenaRadius) {
            this.x = newX;
            this.y = newY;
        } else {
            // Slide along the boundary
            const angle = Math.atan2(dy, dx);
            this.x = arenaCenterX + Math.cos(angle) * arenaRadius;
            this.y = arenaCenterY + Math.sin(angle) * arenaRadius;
        }
        
        // Prevent overlapping with boss
        const bossDx = this.x - boss.x;
        const bossDy = this.y - boss.y;
        const bossDistance = Math.sqrt(bossDx * bossDx + bossDy * bossDy);
        const minDistance = this.radius + boss.radius;
        
        if (bossDistance < minDistance) {
            const angle = Math.atan2(bossDy, bossDx);
            this.x = boss.x + Math.cos(angle) * minDistance;
            this.y = boss.y + Math.sin(angle) * minDistance;
        }
        
        // Calculate rotation to face boss
        const angleToBoss = Math.atan2(boss.y - this.y, boss.x - this.x);
        // Add 90 degrees (π/2 radians) to make the "front" of the sprite face the boss
        this.rotationAngle = angleToBoss + Math.PI / 2;
        
        // Handle attacking
        if (mouse.left && this.attackTimer <= 0 && !this.isRolling && !this.blocking) {
            this.attack(boss);
            this.attackTimer = this.attackCooldown;
        }
        
        // Handle spell casting
        if (keys['q'] && this.spellCooldown <= 0 && !this.isRolling) {
            this.castSpell(mouse);
            this.spellCooldown = 2;
        }
    }
    
    attack(boss) {
        // Check if attack hits the boss
        const dx = this.x - boss.x;
        const dy = this.y - boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.radius + boss.radius + 30) { // 30 is attack range
            const damage = this.attackDamage * (stunActive ? 1.35 : 1);
            boss.takeDamage(damage, stunActive);
            addToStunMeter(damage * 0.7);
        }
    }
    
    castSpell(mouse) {
        // Calculate direction towards mouse
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.spellDirection = {
                x: dx / distance,
                y: dy / distance
            };
            
            this.spellX = this.x;
            this.spellY = this.y;
            this.spellActive = true;
            this.spellTimer = 1.5;
        }
    }
    
    takeDamage(amount) {
        if (this.iframes) return false;
        
        if (this.blocking) {
            // Regular block - take reduced damage
            this.health -= amount * 0.65;
            updateHealthBars();
            return false;
        } else {
            // No block - take full damage
            this.health -= amount;
            updateHealthBars();
            return false;
        }
    }
    
    render(ctx) {
        // Draw player
        ctx.save();
        
        if (this.iframes) {
            ctx.globalAlpha = 0.6;
        }
        
        // Translate to player position
        ctx.translate(this.x, this.y);
        
        // Rotate to face boss
        ctx.rotate(this.rotationAngle);
        
        // Draw sprite (centered)
        const spriteSize = this.radius * 2;
        ctx.drawImage(
            playerSprite,
            -spriteSize / 2,  // x position (centered)
            -spriteSize / 2,  // y position (centered)
            spriteSize,        // width
            spriteSize         // height
        );
        
        // Block indicator
        if (this.blocking) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw spell if active
        if (this.spellActive) {
            this.renderSpell(ctx);
        }
    }
    
    renderSpell(ctx) {
        ctx.save();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.spellX, this.spellY, this.spellRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
