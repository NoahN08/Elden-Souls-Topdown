
const bossSprite_idle = new Image();
bossSprite_idle.src = 'sprite/boss_idle.png';
const bossSprite_angry = new Image();
bossSprite_angry.src = 'sprite/boss_angry.png'

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.color = '#9b59b6';
        this.maxHealth = 500;
        this.health = this.maxHealth;
        this.speed = 100;
        this.attackCooldown = 2;
        this.attackTimer = this.attackCooldown;
        this.attackPattern = 0;
        this.attackDuration = 0;
        this.attackProgress = 0;
        this.attackRadius = 40;
        this.attackDamage = 30;
        this.attackWindup = 0.5;
        this.attackActive = false;
        this.nextAttackTimer = 1;
        this.phase = 1;
        this.phaseThreshold = this.maxHealth * 0.5;
        this.sprite = bossSprite_idle;
    }
    
    update(deltaTime, player) {
        this.attackTimer -= deltaTime;
        
        // Move towards player when not attacking
        if (!this.attackActive && this.nextAttackTimer <= 0) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed * deltaTime;
                this.y += (dy / distance) * this.speed * deltaTime;
            }
            
            // Start attack when close enough
            if (distance < 150 && this.attackTimer <= 0) {
                this.startAttack();
            }
        }
        
        // Handle attack progression
        if (this.attackActive) {
            this.attackProgress += deltaTime;
            
            // End attack after duration
            if (this.attackProgress >= this.attackDuration) {
                this.attackActive = false;
                this.nextAttackTimer = 0.5;
                this.attackTimer = this.attackCooldown;
            } else if (this.attackProgress >= this.attackWindup && !this.attackExecuted) {
                // Execute attack after windup
                this.executeAttack(player);
                this.attackExecuted = true;
            }
        } else {
            this.nextAttackTimer -= deltaTime;
        }
        
        // Phase transition
        if (this.health <= this.phaseThreshold && this.phase === 1) {
            this.phase = 2;
            this.speed *= 1.3;
            this.attackCooldown *= 0.7;
            this.color = '#800000';
            this.sprite = bossSprite_angry;
        }
    }
    
    startAttack() {
        this.attackActive = true;
        this.attackProgress = 0;
        this.attackExecuted = false;
        
        // Choose attack pattern
        if (this.phase === 1) {
            this.attackPattern = Math.floor(Math.random() * 3);
        } else {
            this.attackPattern = Math.floor(Math.random() * 4);
        }
        
        // Set attack parameters based on pattern
        switch (this.attackPattern) {
            case 0: // Overhead smash
                this.attackDuration = 1.2;
                this.attackDamage = 40;
                this.attackWindup = 0.7;
                this.attackRadius = 50;
                break;
            case 1: // Sweeping attack
                this.attackDuration = 1.5;
                this.attackDamage = 30;
                this.attackWindup = 0.6;
                this.attackRadius = 60;
                break;
            case 2: // Jump attack
                this.attackDuration = 1.8;
                this.attackDamage = 50;
                this.attackWindup = 1.0;
                this.attackRadius = 70;
                break;
            case 3: // Phase 2 only - rapid strikes
                this.attackDuration = 2.0;
                this.attackDamage = 20;
                this.attackWindup = 0.4;
                this.attackRadius = 40;
                break;
        }
    }
    
    executeAttack(player) {
        // Check if attack hits player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.radius + player.radius + this.attackRadius) {
            const parried = player.takeDamage(this.attackDamage);
            
            if (parried) {
                // Boss takes parry damage
                this.takeDamage(this.attackDamage * 0.65);
            }
        }
    }
    
    takeDamage(amount, isStunned = false) {
        const damage = isStunned ? amount * 1.35 : amount;
        this.health -= damage;
        updateHealthBars();
    }
    
    render(ctx) {
        // Draw boss
        ctx.save();
        
        // Body
        const spriteSize = this.radius * 2;
        ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, spriteSize, spriteSize);
        
        // Phase indicator
        if (this.phase === 2) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderAttackIndicators(ctx) {
        if (!this.attackActive || this.attackProgress >= this.attackWindup) return;
        
        ctx.save();
        ctx.globalAlpha = 0.5;
        
        switch (this.attackPattern) {
            case 0: // Overhead smash indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y + this.radius + 10, this.attackRadius * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 1: // Sweeping attack indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, (this.radius + this.attackRadius) * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 2: // Jump attack indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y - (this.radius + 20) * (1 - this.attackProgress / this.attackWindup), 
                       this.attackRadius * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 3: // Rapid strikes indicator
                ctx.fillStyle = '#e74c3c';
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2 + (this.attackProgress * 5);
                    const dist = this.radius + 20 + this.attackRadius * (this.attackProgress / this.attackWindup);
                    ctx.beginPath();
                    ctx.arc(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, 
                           10 * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
        
        ctx.restore();
    }
}
