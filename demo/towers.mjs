import {HPBar} from "../src/hpbar.mjs"
import {Base} from "../src/base.mjs"
import {Bullet} from "../src/bullets.mjs"
import {Obstacle} from "../src/obstacles.mjs"
import {Tower, TowerAbility} from "../src/towers.mjs"
import {AttackEvent} from "../src/events.mjs"
import {StatusEffect, Attack} from "../src/entity.mjs"
import {VMath} from "../src/vmath.mjs"

import {LookupSprite} from "./sprites.mjs"
import {gameover} from "./main.mjs"

export class Burn extends StatusEffect {
    damage = 0.5
    duration = 20
    type = "FIRE"
    sprites = {
        frames: [new LookupSprite("fire0.png"), new LookupSprite("fire1.png")],
        tpt: 5
    }
}

export class FlameArrowAttack extends Attack {
    damage = 1
    statusEffects = [new Burn()]
    effectChance = 0.25
}

export class FlameArrow extends Bullet {
    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("flameArrow0.png"),
                new LookupSprite("flameArrow1.png"),
                new LookupSprite("flameArrow2.png"),
            ],
            tpt: 5,
        },
    }

    velocityMagnitude = 0.4
    lifespan = 10
    pierce = 2
    attack = new FlameArrowAttack()
}

export class FlameArrowAbility extends TowerAbility {
    cooldown = 20
    ability = FlameArrow
}

export class ArrowAttack extends Attack {
    damage = 1
}

export class Arrow extends Bullet {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("arrow.png")],
            tpt: 0,
        },
    }

    velocityMagnitude = 0.1
    lifespan = 20
    pierce = 1
    attack = new ArrowAttack()
}

export class ArrowAbility extends TowerAbility {
    cooldown = 10
    ability = Arrow
}

export class FoxTower extends Tower {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("foxTower.png")],
            tpt: 0,
        },
    }

    hp = 1
    range = 3
    abilities = [new ArrowAbility()]

    rotationSpeed = 0.1 // in radians per tick
    priority = "first"

    rendersRange = false

    constructor(spawnID) {
        super(spawnID);
        this.rotation = 0;
    }

    ontick(movementCallback, eventsCallback, queryEnemiesCB) {
        return super.ontick((_velIsDir, _vel, _rot, sprite) => {
            const queryRes = queryEnemiesCB(this.range, true);

            const enemies = queryRes.enemies.filter(
                e => !e.enemy.isFlying && (!e.enemy.hp == 0));
            const selfCoords = queryRes.selfCoords;

            if (enemies.length && this.rotationSpeed) {
                if (this.priority == "first")
                    enemies.sort((e1, e2) => e1.distanceToBase > e2.distanceToBase);
                else if (this.priority == "last")
                    enemies.sort((e1, e2) => e1.distanceToBase < e2.distanceToBase);

                const enemyDescription = enemies[0];
                const rotationVector = VMath.mul([1, -1], VMath.sub(selfCoords, enemyDescription.coords));
                const theta = Math.atan2(...rotationVector);

                let minAngle = theta - this.rotation;
                let tmp = theta - ((2 * Math.PI) + this.rotation)
                if (Math.abs(tmp) < Math.abs(minAngle))
                    minAngle = tmp;
                tmp = ((2 * Math.PI) + theta) - this.rotation;
                if (Math.abs(tmp) < Math.abs(minAngle))
                    minAngle = tmp;

                if (Math.abs(minAngle) > this.rotationSpeed)
                    minAngle = Math.sign(minAngle) * this.rotationSpeed;

                this.rotation += minAngle;

                this.abilities.forEach(ability => {
                    const bullet = ability.ontick();
                    // TODO add some way to spawn this into a different map
                    // instead of the tower map.
                    if (bullet) {
                        const b = new bullet();
                        const x = VMath.copy(this.position);
                        b.position = x;
                        b.setTower(this);
                        b.setDirection([-Math.sin(this.rotation), Math.cos(this.rotation)]);
                        eventsCallback([new AttackEvent([b])]);
                    }
                });
            }

            return movementCallback(false, 0, this.rotation, sprite);
        });
    }

    onrender(ctx) {
        if (this.rendersRange) {
            ctx.beginPath();
            // TODO don't hard code 64, maybe pass in gamemap.map instead?
            ctx.arc(0, 0, this.range * 64, 0, 2 * Math.PI);
            ctx.fillStyle = "#2b2b2b40"
            ctx.fill();
            ctx.stroke();
        }
    }
}

export class ThumbTack extends Obstacle {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("thumbTacks.png")],
            tpt: 0, // tpt == ticksPerSpriteTransition
        },
    }

    position = [32, 32]

    hp = 10

    ondamage(atk) {
        const retval = super.ondamage(atk);
        this.spriteFrames.idle.frames.map(frame => {
            frame.filter = `opacity(${this.hp / 10})`;
        });
        return retval;
    }
}

export class BasicBase extends Base {
    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("base/0.png"),
                new LookupSprite("base/1.png"),
                new LookupSprite("base/2.png"),
            ],
            tpt: 5
        }
    }

    hp = 100

    constructor(spawnID) {
        super(spawnID);
        this.hpbar = new HPBar(this.hp, 64, 4);
    }

    ondeath() { gameover(); }

    ondamage(atk) {
        super.ondamage(atk);
        this.hpbar.update(this.hp);
        const death = 1 - this.hp / this.hpbar.totalHP;
        if (death != 1)
            this.spriteFrames.idle.tpt = 5 + 20 * death;
        else
            this.spriteFrames.idle.tpt = 0;
         this.spriteFrames.idle.frames.map(frame => { frame.filter = `grayscale(${death})`; });
    }

    onrender(ctx) {
        ctx.translate(-this.position[0], -(this.position[1] + 1));
        this.hpbar.render(ctx);
        ctx.translate(this.position[0], this.position[1] + 1);
    }
}
