class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.color = '#9b59b6';
        this.maxHealth = 3000; // Young Necklace Boss HP
        this.health = this.maxHealth;
        this.speed = 100;
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
        this.orbs = [];
        this.orbDamage = 15;
        this.orbSpeed = 150;
        this.orbRadius = 8;
        
        // Enhanced Pulsation Attack (200% more damage)
        this.pulsationActive = false;
        this.pulsationTimer = 0;
        this.pulsationInterval = 0.8;
        this.pulsationDamage = 60; // Increased from 20 to 60
        this.pulsationRadius = 0;
        this.maxPulsationRadius = Math.max(canvas.width, canvas.height) * 0.6;
        this.pulsationWidth = 10;
        
        // Nerfed Line Attack (50% less damage)
        this.lineAttackActive = false;
        this.lineAttackTimer = 0;
        this.lineAttackDuration = 1.5;
        this.lineAttackDamage = 20; // Reduced from 40 to 20
        this.lineWidth = 30;
        this.lineLength = Math.max(canvas.width, canvas.height);
        this.lineAngle = 0;
        this.lineX = 0;
        this.lineY = 0;
    }
    
    update(deltaTime, player) {
        this.attackTimer -= deltaTime;
        
        // Update orbs
        this.updateOrbs(deltaTime, player);
        
        // Update pulsation attack
        if (this.pulsationActive) {
            this.updatePulsation(deltaTime, player);
        }
        
        // Update line attack
        if (this.lineAttackActive) {
            this.updateLineAttack(deltaTime, player);
        }
        
        // Move towards player when not attacking
        if (!this.attackActive && !this.pulsationActive && !this.lineAttackActive && this.nextAttackTimer <= 0) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.x += (dx / distance) * this.speed * deltaTime;
                this.y += (dy / distance) * this.speed * deltaTime;
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
        
        // Phase transition (Young Necklace Phase 2)
        if (this.health <= this.phaseThreshold && this.phase === 1) {
            this.phase = 2;
            this.speed *= 1.3;
            this.attackCooldown *= 0.7;
            this.pulsationInterval *= 0.7;
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
        
        // Pulsate in intervals (Young Necklace's Deadly Pulse)
        if (this.pulsationTimer >= this.pulsationInterval) {
            this.pulsationTimer = 0;
            this.pulsationRadius = 10;
            
            // Check if player is hit by pulsation
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.pulsationRadius + player.radius && !player.iframes) {
                player.takeDamage(this.pulsationDamage); // 60 damage
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
        
        // Damage player if in line (Young Necklace's Weakened Beam)
        if (!player.iframes) {
            const proj = projectPointOnLine(player.x, player.y, this.x, this.y, 
                                          this.lineAngle, this.lineLength);
            const distToLine = Math.sqrt(Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2));
            
            if (distToLine < this.lineWidth * 0.5 + player.radius) {
                const lineDist = Math.sqrt(Math.pow(proj.x - this.x, 2) + Math.pow(proj.y - this.y, 2));
                if (lineDist <= this.lineLength * 0.5) {
                    player.takeDamage(this.lineAttackDamage * deltaTime * 3); // 20 damage/sec
                }
            }
        }
        
        // End line attack after duration
        if (this.lineAttackTimer >= this.lineAttackDuration) {
            this.lineAttackActive = false;
        }
    }
    
    startAttack(player) {
        this.attackActive = true;
        this.attackProgress = 0;
        this.attackExecuted = false;
        
        // Choose attack pattern (Young Necklace's Arsenal)
        if (this.phase === 1) {
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
            case 3: // Orb attack
                this.attackDuration = 2.5;
                this.attackDamage = 0;
                this.attackWindup = 1.0;
                this.attackRadius = 0;
                break;
            case 4: // Enhanced Pulsation attack
                this.pulsationActive = true;
                this.attackDuration = 3.0;
                this.attackDamage = 0;
                this.attackWindup = 0.8;
                this.attackRadius = 0;
                this.pulsationTimer = 0;
                break;
            case 5: // Nerfed Line attack
                this.lineAttackActive = true;
                this.attackDuration = this.lineAttackDuration;
                this.attackDamage = 0;
                this.attackWindup = 0.5;
                this.attackRadius = 0;
                this.lineAttackTimer = 0;
                // Aim line at player
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                this.lineAngle = Math.atan2(dy, dx);
                this.lineX = this.x;
                this.lineY = this.y;
                break;
            case 6: // Phase 2 only - rapid strikes
                this.attackDuration = 2.0;
                this.attackDamage = 20;
                this.attackWindup = 0.4;
                this.attackRadius = 40;
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
            case 5: // Line attack
                break;
            default: // Melee attacks
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.radius + player.radius + this.attackRadius) {
                    const parried = player.takeDamage(this.attackDamage);
                    
                    if (parried) {
                        this.takeDamage(this.attackDamage * 0.65);
                    }
                }
                break;
        }
    }
    
    createOrbAttack() {
        this.orbs = [];
        const orbCount = this.phase === 2 ? 24 : 12;
        
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
    
    takeDamage(amount, isStunned = false) {
        const damage = isStunned ? amount * 1.35 : amount;
        this.health -= damage;
        updateHealthBars();
    }
    
    render(ctx) {
        // Draw Young Necklace boss
        ctx.save();
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Phase indicator
        if (this.phase === 2) {
            ctx.strokeStyle = '#e74c3c';
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
        
        // Draw pulsation (Young Necklace's Signature Attack)
        if (this.pulsationRadius > 0) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
            ctx.lineWidth = this.pulsationWidth;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pulsationRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw line attack
        if (this.lineAttackActive) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)'; // Slightly more transparent
            ctx.lineWidth = this.lineWidth;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.lineAngle) * this.lineLength,
                this.y + Math.sin(this.lineAngle) * this.lineLength
            );
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
                
            case 3: // Orb attack indicator
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 50 * (this.attackProgress / this.attackWindup), 0, Math.PI * 2);
                ctx.stroke();
                
                const orbCount = this.phase === 2 ? 24 : 12;
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
                
            case 5: // Line attack indicator
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = this.lineWidth * (this.attackProgress / this.attackWindup);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                
                // Aim at player during windup
                const angle = this.lineAngle;
                ctx.lineTo(
                    this.x + Math.cos(angle) * this.lineLength * (this.attackProgress / this.attackWindup),
                    this.y + Math.sin(angle) * this.lineLength * (this.attackProgress / this.attackWindup)
                );
                ctx.stroke();
                break;
                
            case 6: // Rapid strikes indicator
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

// Helper function for line attack
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
