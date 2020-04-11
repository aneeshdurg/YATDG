import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class Enemy extends Entity {
    spriteFrames = {
        idle: {
            frames: [],
            tpt: 0,
        },
        dying: {
            frames: [],
            tpt: 0,
        },
    }

    hp = 0
    velocity = [0, 0] // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks
    strength = 0 // attack strength when reaching tower

    spawnOnDeath = [] // enemies to spawn on death
    resistances = [] // Resistances to attack types

    // spawnID should be a monotonically increase ID for all enemies spawned in
    // a particular wave
    constructor(spawnID, diceRoll) {
        super();
        this._spawnID = spawnID;
        this._diceRoll = diceRoll;

        this._currentFrameSet = "idle"
        this._currentSpriteFrame = 0;
        this._statusEffects = [];
        this._ticksSinceTransition = 0;
    }

    get spawnID() { return this._spawnID; }

    ontick(movementCallback, eventsCallback) {
        const frameSet = this.spriteFrames[this._currentFrameSet];
        const sprite = frameSet.frames[this._currentSpriteFrame];
        if (frameSet.tpt > 0) {
            this._ticksSinceTransition += 1;
            if (this._ticksSinceTransition >= frameSet.tpt) {
                this._currentSpriteFrame += 1;
                this._currentSpriteFrame %= frameSet.frames.length;
                this._ticksSinceTransition = 0;

                if (this._currentSpriteFrame == 0 && this._currentFrameSet != "idle") {
                    this._currentFrameSet = "idle";
                }
            }
        }

        let currentVelocity = this.velocity;
        if (this.hp > 0) {
            // compute any status effects
            this._statusEffects.forEach((effect) => {
                if (effect.ticks >= 0)
                    effect.ticks -= 1;

                if (effect.damagePerTick > 0)
                    this.hp -= effect.damagePerTick;

                if (effect.velocityModifer)
                    currentVelocity += effect.velocityModifier;
            });
        } else {
            currentVelocity = 0;
        }

        if (this.hp == 0 && this._currentFrameSet == "idle") {
            eventsCallback([new DeathEvent()])
            return -1;
        } else
            return movementCallback(true, currentVelocity, sprite);
    }

    ondamage(attack) {
        if (this.resistances.findIndex(r => r == attack.type) > 0)
            return;
        else
            this.hp -= attack.damage;

        if (this.hp <= 0) {
            this.hp = 0;
            if (this.spriteFrames["dying"])
                this._currentFrameSet = "dying";
            return;
        }

        if (attack.effectChance > 0) {
            if (Math.random() < (1 - attack.effectChance))
                return;
            const that = this;
            attack.statusEffects.forEach((effect) => {
                this._statusEffects.push(effect.copy());
            });
        }
    }
}
