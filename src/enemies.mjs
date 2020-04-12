import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'
import {VMath} from './vmath.mjs'
import {DONTUPDATE} from './gamemap.mjs'

export class Enemy extends Entity {
    hp = 0
    velocity = [0, 0] // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks
    strength = 0 // attack strength when reaching tower

    isFlying = false

    spawnOnDeath = [] // enemies to spawn on death
    resistances = [] // Resistances to attack types

    // spawnID should be a monotonically increase ID for all enemies spawned in
    // a particular wave
    constructor(spawnID, diceRoll) {
        super();
        this._spawnID = spawnID;
        this._diceRoll = diceRoll;

        this._statusEffects = [];
    }

    get spawnID() { return this._spawnID; }

    ontick(movementCallback, eventsCallback) {
        const sprite = this.getSprite();

        let currentVelocity = VMath.copy(this.velocity);
        if (this.hp > 0) {
            // compute any status effects
            this._statusEffects.forEach((effect) => {
                if (effect.ticks >= 0)
                    effect.ticks -= 1;

                if (effect.damagePerTick > 0)
                    this.hp -= effect.damagePerTick;

                if (effect.velocityModifer)
                    currentVelocity = VMath.mul(currentVelocity, effect.velocityModifier);
            });
        } else {
            currentVelocity = VMath.mul(currentVelocity, 0);
        }

        if (this.hp == 0 && this._currentFrameSet == "idle") {
            eventsCallback([new DeathEvent()])
            return DONTUPDATE;
        } else
            return movementCallback(this.isFlying, currentVelocity, NaN, sprite);
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
