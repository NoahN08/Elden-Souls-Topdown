// boss.js
const bossSprite_idle = new Image();
bossSprite_idle.src = 'sprite/boss_idle.png';
const bossSprite_angry = new Image();
bossSprite_angry.src = 'sprite/boss_angry.png';
const bossSprite_enraged = new Image();
bossSprite_enraged.src = 'sprite/boss_enraged.png';

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.color = '#9b59b6';
        this.maxHealth = 3000;
        this.health = this.maxHealth;
        this.baseSpeed = 100;
        this.speed = this.baseSpeed;
        this.attackCooldown = 1.5;
        this.attackTimer = this.attackCooldown * 0.5;
        this.attackPattern = 0;
        this.attackDuration = 0;
        this.attackProgress = 0;
        this.attackRadius = 40;
        this.attackDamage = 30;
        this.attackWindup = 0.5;
        this.attackActive = false;
        this.nextAttackTimer = 0.5;
        this.phase = 1;
        this.phaseThreshold = this.maxHealth * 0.5;
        this.finalPhaseThreshold = this.maxHealth * 0.1;
        this.orbs = [];
        this.orbDamage = 15;
        this.orbSpeed = 150;
        this.orbRadius = 8;
        this.sprite = bossSprite_idle;
        
        // Pulsation Attack
        this.pulsationActive = false;
        this.pulsationTimer = 0;
        this.pulsationInterval = 0.8;
        this.pulsationDamage = 60;
        this.pulsationRadius = 0;
        this.maxPulsationRadius = Math.max(canvas.width, canvas.height) * 0.6;
        this.pulsationWidth = 10;
        
        // Line Attack (50% reduced damage)
        this.lineAttackActive = false;
        this.lineAttackTimer = 0;
        this.lineAttackDuration = 1.5;
        this.lineAttackDamage = 10; // Reduced from 20 to 10 (50% reduction)
        this.lineWidth = 30;
        this.lineLength = Math.max(canvas.width, canvas.height);
        this.lineAngle = 0;
        this.lineX = 0;
        this.lineY = 0;
        
        // Multi-laser Attack (50% reduced damage)
        this.multiLaserActive = false;
        this.multiLaserTimer = 0;
        this.multiLaserDuration = 3.0;
        this.multiLaserDamage = 7.5; // Reduced from 15 to 7.5 (50% reduction)
        this.multiLaserCount = 8;
        this.multiLaserAngles = [];
        this.multiLaserRotationSpeed = Math.PI * 0.5;
        
        // Spinning Orb Attack
        this.spinningOrbActive = false;
        this.spinningOrbTimer = 0;
        this.spinningOrbDuration = 4.0;
        this.spinningOrbDamage = 15;
        this.spinningOrbCount = 12;
        this.spinningOrbRadius = 100;
        this.spinningOrbSpeed = Math.PI;
        this.spinningOrbs = [];
        
        // Final Phase
        this.finalPhaseActive = false;
        this.finalPhaseTimer = 20;
        this.finalPhaseOrbCount = 36;
        this.finalPhaseLaserCount = 12;
    }
    
    update(deltaTime, player) {
        this.attackTimer -= deltaTime;
        
        // Update orbs
        this.updateOrbs(deltaTime, player);
        
        // Update attacks
        if (this.pulsationActive) this.updatePulsation(deltaTime, player);
        if (this.lineAttackActive) this.updateLineAttack(deltaTime, player);
        if (this.multiLaserActive) this.updateMultiLaser(deltaTime, player);
        if (this.spinningOrbActive) this.updateSpinningOrbs(deltaTime, player);
        
        // Check for phase transitions
        if (this.health <= this.phaseThreshold && this.phase === 1) {
            this.phase = 2;
            this.speed = this.baseSpeed * 1.25;
            this.attackCooldown *= 0.7;
            this.pulsationInterval *= 0.7;
            this.sprite = bossSprite_angry;
        }
        
        if (this.health <= this.finalPhaseThreshold && !this.finalPhaseActive) {
            this.phase = 3;
            this.finalPhaseActive = true;
            this.sprite = bossSprite_enraged;
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            this.startFinalPhase();
        }
        
        // Final phase updates
        if (this.finalPhaseActive) {
            this.finalPhaseTimer -= deltaTime;
            if (this.finalPhaseTimer <= 0) {
                this.finalPhaseActive = false;
                this.phase = 2;
                this.sprite = bossSprite_angry;
            }
        }
        
        // Move towards player when not attacking (unless in final phase)
        if (!this.finalPhaseActive && !this.attackActive && !this.pulsationActive && 
            !this.lineAttackActive && !this.multiLaserActive && !this.spinningOrbActive && 
            this.nextAttackTimer <= 0) {
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed * deltaTime;
                this.y += (dy / distance) * this.speed * deltaTime;
            }
            
            // Boundary check
            const arenaCenterX = canvas.width / 2;
            const arenaCenterY = canvas.height / 2;
            const arenaRadius = 250 - this.radius;
            
            const arenaDx = this.x - arenaCenterX;
            const arenaDy = this.y - arenaCenterY;
            const arenaDistance = Math.sqrt(arenaDx * arenaDx + arenaDy * arenaDy);
            
            if (arenaDistance > arenaRadius) {
                const angle = Math.atan2(arenaDy, arenaDx);
                this.x = arenaCenterX + Math.cos(angle) * arenaRadius;
                this.y = arenaCenterY + Math.sin(angle) * arenaRadius;
            }
            
            // Start attack when close enough or randomly for special attacks
            if ((distance < 200 || Math.random() < 0.3) && this.attackTimer <= 0) {
                this.startAttack(player);
            }
        }
        
        // Handle attack progression
        if (this.attackActive) {
            this.attackProgress += deltaTime;
            
            // End attack after duration
            if (this.attackProgress >= this.attackDuration) {
                this.attackActive = false;
                this.nextAttackTimer = 0.3;
                this.attackTimer = this.attackCooldown * (0.8 + Math.random() * 0.4);
            } else if (this.attackProgress >= this.attackWindup && !this.attackExecuted) {
                // Execute attack after windup
                this.executeAttack(player);
                this.attackExecuted = true;
            }
        } else {
            this.nextAttackTimer -= deltaTime;
        }
    }
    
    updateOrbs(deltaTime, player) {
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            orb.x += orb.dx * this.orbSpeed * deltaTime;
            orb.y += orb.dy * this.orbSpeed * deltaTime;
            
            // Check if orb hits player
            const dx = orb.x - player.x;
            const dy = orb.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.orbRadius + player.radius && !player.iframes) {
                player.takeDamage(this.orbDamage);
                this.orbs.splice(i, 1);
                continue;
            }
            
            // Remove orbs that go off-screen
            if (orb.x < -50 || orb.x > canvas.width + 50 || 
                orb.y < -50 || orb.y > canvas.height + 50) {
                this.orbs.splice(i, 1);
            }
        }
    }
    
    updatePulsation(deltaTime, player) {
        this.pulsationTimer += deltaTime;
        
        // Pulsate in intervals
        if (this.pulsationTimer >= this.pulsationInterval) {
            this.pulsationTimer = 0;
            this.pulsationRadius = 10;
            
            // Check if player is hit by pulsation
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.pulsationRadius + player.radius && !player.iframes) {
                player.takeDamage(this.pulsationDamage);
            }
        }
        
        // Expand pulsation radius
        if (this.pulsationRadius > 0) {
            this.pulsationRadius += deltaTime * 400;
            if (this.pulsationRadius > this.maxPulsationRadius) {
                this.pulsationRadius = 0;
            }
            
            // Continuous damage check during expansion
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const pulsationInner = this.pulsationRadius - this.pulsationWidth;
            const pulsationOuter = this.pulsationRadius;
            
            if (distance > pulsationInner && distance < pulsationOuter && !player.iframes) {
                player.takeDamage(this.pulsationDamage * deltaTime * 2);
            }
        }
        
        // End pulsation attack after duration
        if (this.attackProgress >= this.attackDuration) {
            this.pulsationActive = false;
            this.pulsationRadius = 0;
        }
    }
    
    updateLineAttack(deltaTime, player) {
        this.lineAttackTimer += deltaTime;
        
        // Damage player if in line (with 50% reduced damage)
        if (!player.iframes) {
            const proj = projectPointOnLine(player.x, player.y, this.x, this.y, 
                                          this.lineAngle, this.lineLength);
            const distToLine = Math.sqrt(Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2));
            
            if (distToLine < this.lineWidth * 0.5 + player.radius) {
                const lineDist = Math.sqrt(Math.pow(proj.x - this.x, 2) + Math.pow(proj.y - this.y, 2));
                if (lineDist <= this.lineLength * 0.5) {
                    player.takeDamage(this.lineAttackDamage * deltaTime * 3);
                }
            }
        }
        
        // End line attack after duration
        if (this.lineAttackTimer >= this.lineAttackDuration) {
            this.lineAttackActive = false;
        }
    }
    
    updateMultiLaser(deltaTime, player) {
        this.multiLaserTimer += deltaTime;
        
        // Rotate lasers
        for (let i = 0; i < this.multiLaserAngles.length; i++) {
            this.multiLaserAngles[i] += this.multiLaserRotationSpeed * deltaTime;
            
            // Damage player if in laser (with 50% reduced damage)
            if (!player.iframes) {
                const angle = this.multiLaserAngles[i];
                const proj = projectPointOnLine(player.x, player.y, this.x, this.y, 
                                              angle, this.lineLength);
                const distToLine = Math.sqrt(Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2));
                
                if (distToLine < this.lineWidth * 0.5 + player.radius) {
                    const lineDist = Math.sqrt(Math.pow(proj.x - this.x, 2) + Math.pow(proj.y - this.y, 2));
                    if (lineDist <= this.lineLength * 0.5) {
                        player.takeDamage(this.multiLaserDamage * deltaTime * 3);
                    }
                }
            }
        }
        
        // End multi-laser attack after duration (extended in phase 3)
        if (this.multiLaserTimer >= (this.finalPhaseActive ? this.multiLaserDuration * 2 : this.multiLaserDuration)) {
            this.multiLaserActive = false;
        }
    }
    
    updateSpinningOrbs(deltaTime, player) {
        this.spinningOrbTimer += deltaTime;
        
        // Update orb positions
        for (let i = 0; i < this.spinningOrbs.length; i++) {
            const orb = this.spinningOrbs[i];
            orb.angle += this.spinningOrbSpeed * deltaTime;
            orb.x = this.x + Math.cos(orb.angle) * this.spinningOrbRadius;
            orb.y = this.y + Math.sin(orb.angle) * this.spinningOrbRadius;
            
            // Check collision with player
            const dx = orb.x - player.x;
            const dy = orb.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.orbRadius + player.radius && !player.iframes) {
                player.takeDamage(this.spinningOrbDamage);
            }
        }
        
        // End spinning orb attack after duration (extended in phase 3)
        if (this.spinningOrbTimer >= (this.finalPhaseActive ? this.spinningOrbDuration * 2 : this.spinningOrbDuration)) {
            this.spinningOrbActive = false;
            this.spinningOrbs = [];
        }
    }
    
    startAttack(player) {
        this.attackActive = true;
        this.attackProgress = 0;
        this.attackExecuted = false;
        
        // Choose attack pattern
        if (this.finalPhaseActive) {
            // In final phase, only use special attacks
            this.attackPattern = 3 + Math.floor(Math.random() * 4); // 3-6
        } else if (this.phase === 1) {
            this.attackPattern = Math.floor(Math.random() * 6);
        } else {
            this.attackPattern = Math.floor(Math.random() * 7);
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
            case 3: // Orb attack (more frequent)
                this.attackDuration = 1.5;
                this.attackDamage = 0;
                this.attackWindup = 0.8;
                this.attackRadius = 0;
                break;
            case 4: // Pulsation attack
                this.pulsationActive = true;
                this.attackDuration = 3.0;
                this.attackDamage = 0;
                this.attackWindup = 0.8;
                this.attackRadius = 0;
                this.pulsationTimer = 0;
                break;
            case 5: // Multi-laser attack
                this.multiLaserActive = true;
                this.attackDuration = this.finalPhaseActive ? this.multiLaserDuration * 2 : this.multiLaserDuration;
                this.attackDamage = 0;
                this.attackWindup = 0.5;
                this.attackRadius = 0;
                this.multiLaserTimer = 0;
                this.multiLaserAngles = [];
                for (let i = 0; i < (this.finalPhaseActive ? this.finalPhaseLaserCount : this.multiLaserCount); i++) {
                    this.multiLaserAngles.push((i / (this.finalPhaseActive ? this.finalPhaseLaserCount : this.multiLaserCount)) * Math.PI * 2);
                }
                break;
            case 6: // Spinning orb attack
                this.spinningOrbActive = true;
                this.attackDuration = this.finalPhaseActive ? this.spinningOrbDuration * 2 : this.spinningOrbDuration;
                this.attackDamage = 0;
                this.attackWindup = 0.5;
                this.attackRadius = 0;
                this.spinningOrbTimer = 0;
                this.spinningOrbs = [];
                for (let i = 0; i < (this.finalPhaseActive ? this.finalPhaseOrbCount : this.spinningOrbCount); i++) {
                    this.spinningOrbs.push({
                        angle: (i / (this.finalPhaseActive ? this.finalPhaseOrbCount : this.spinningOrbCount)) * Math.PI * 2,
                        x: 0,
                        y: 0
                    });
                }
                break;
        }
    }
    
    executeAttack(player) {
        switch (this.attackPattern) {
            case 3: // Orb attack
                this.createOrbAttack();
                break;
            case 4: // Pulsation attack
                break;
            case 5: // Multi-laser attack
                break;
            case 6: // Spinning orb attack
                break;
            default: // Melee attacks
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.radius + player.radius + this.attackRadius) {
                    player.takeDamage(this.attackDamage);
                }
                break;
        }
    }
    
    createOrbAttack() {
        this.orbs = [];
        const orbCount = this.finalPhaseActive ? this.finalPhaseOrbCount : (this.phase === 2 ? 24 : 12);
        
        for (let i = 0; i < orbCount; i++) {
            const angle = (i / orbCount) * Math.PI * 2;
            this.orbs.push({
                x: this.x,
                y: this.y,
                dx: Math.cos(angle),
                dy: Math.sin(angle)
            });
        }
    }
    
    startFinalPhase() {
        // Start all attacks at once with extended durations
        this.attackActive = true;
        this.attackProgress = 0;
        this.attackExecuted = false;
        this.attackDuration = this.finalPhaseTimer;
        this.attackWindup = 0.1;
        
        // Activate all special attacks with extended durations
        this.pulsationActive = true;
        this.pulsationTimer = 0;
        this.pulsationInterval = 0.5;
        
        this.multiLaserActive = true;
        this.multiLaserTimer = 0;
        this.multiLaserCount = this.finalPhaseLaserCount;
        this.multiLaserAngles = [];
        for (let i = 0; i < this.multiLaserCount; i++) {
            this.multiLaserAngles.push((i / this.multiLaserCount) * Math.PI * 2);
        }
        
        this.spinningOrbActive = true;
        this.spinningOrbTimer = 0;
        this.spinningOrbCount = 24;
        this.spinningOrbs = [];
        for (let i = 0; i < this.spinningOrbCount; i++) {
            this.spinningOrbs.push({
                angle: (i / this.spinningOrbCount) * Math.PI * 2,
                x: 0,
                y: 0
            });
        }
        
        // Create initial orb spread
        this.createOrbAttack();
    }
    
    takeDamage(amount, isStunned = false) {
        let damage = amount;
        
        // Phase 2 damage reduction
        if (this.phase >= 2 && !isStunned) {
            damage *= 0.65; // 35% reduction
        }
        
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
        if (this.phase >= 2) {
            ctx.strokeStyle = this.phase === 3 ? '#ff0000' : '#e74c3c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw orbs
        ctx.fillStyle = '#e74c3c';
        for (const orb of this.orbs) {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, this.orbRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw spinning orbs
        for (const orb of this.spinningOrbs) {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, this.orbRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw pulsation
        if (this.pulsationRadius > 0) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
            ctx.lineWidth = this.pulsationWidth;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pulsationRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw line attack
        if (this.lineAttackActive) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            ctx.lineWidth = this.lineWidth;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.lineAngle) * this.lineLength,
                this.y + Math.sin(this.lineAngle) * this.lineLength
            );
            ctx.stroke();
        }
        
        // Draw multi-laser attack
        if (this.multiLaserActive) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
            ctx.lineWidth = this.lineWidth;
            for (const angle of this.multiLaserAngles) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(angle) * this.lineLength,
                    this.y + Math.sin(angle) * this.lineLength
                );
                ctx.stroke();
            }
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
                
            case 3: // Orb attack indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 50 * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.stroke();
                
                const orbCount = this.finalPhaseActive ? this.finalPhaseOrbCount : (this.phase === 2 ? 24 : 12);
                for (let i = 0; i < orbCount; i++) {
                    const angle = (i / orbCount) * Math.PI * 2;
                    const dist = 50 * (this.attackProgress / this.attackWindup);
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist);
                    ctx.stroke();
                }
                break;
                
            case 4: // Pulsation attack indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 50 * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 5: // Multi-laser attack indicator
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = this.lineWidth * (this.attackProgress / this.attackWindup);
                for (let i = 0; i < (this.finalPhaseActive ? this.finalPhaseLaserCount : this.multiLaserCount); i++) {
                    const angle = (i / (this.finalPhaseActive ? this.finalPhaseLaserCount : this.multiLaserCount)) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(
                        this.x + Math.cos(angle) * this.lineLength * (this.attackProgress / this.attackWindup),
                        this.y + Math.sin(angle) * this.lineLength * (this.attackProgress / this.attackWindup)
                    );
                    ctx.stroke();
                }
                break;
                
            case 6: // Spinning orb attack indicator
                ctx.fillStyle = '#e74c3c';
                for (let i = 0; i < (this.finalPhaseActive ? this.finalPhaseOrbCount : this.spinningOrbCount); i++) {
                    const angle = (i / (this.finalPhaseActive ? this.finalPhaseOrbCount : this.spinningOrbCount)) * Math.PI * 2;
                    const dist = this.spinningOrbRadius * (this.attackProgress / this.attackWindup);
                    ctx.beginPath();
                    ctx.arc(
                        this.x + Math.cos(angle) * dist, 
                        this.y + Math.sin(angle) * dist, 
                        10 * (this.attackProgress / this.attackWindup), 
                        0, 
                        Math.PI * 2
                    );
                    ctx.fill();
                }
                break;
        }
        
        ctx.restore();
    }
}

function projectPointOnLine(px, py, lx, ly, angle, length) {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    
    const dx = px - lx;
    const dy = py - ly;
    
    const t = dx * vx + dy * vy;
    
    return {
        x: lx + vx * t,
        y: ly + vy * t
    };
}
