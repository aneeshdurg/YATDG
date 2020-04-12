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
    resistances = [] // Resistances to attack types

    // spawnID should be a monotonically increase ID for all enemies spawned in
    // a particular wave
    constructor(spawnID, diceRoll) {
        super();
        this._spawnID = spawnID;
        this._diceRoll = diceRoll;

        this._statusEffects = [];
        this._deathByBase = false;
    }

    get spawnID() { return this._spawnID; }

    ondeath(eventsCallback) {
        eventsCallback([new DeathEvent()])
    }

    ontick(movementCallback, eventsCallback) {
        const sprite = this.getSprite();

        let currentVelocity = VMath.copy(this.velocity);
        if (this.hp > 0) {
            // compute any status effects
            this._statusEffects.forEach((effect) => {
                if (effect.duration > 0)
                    effect.duration -= 1;

                this.ondamage(effect);

                if (!isNaN(effect.velocityModifer))
                    currentVelocity = VMath.mul(currentVelocity, effect.velocityModifier);
            });

            this._statusEffects = this._statusEffects.filter(effect => effect.duration);
        } else {
            currentVelocity = VMath.mul(currentVelocity, 0);
        }

        if (this.hp == 0 && this._currentFrameSet == "idle") {
            this.ondeath(eventsCallback);
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
            if (attack.type == "BASE")
                this._deathByBase = true;
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

    onrender(ctx, spriteList) {
        this._statusEffects.forEach(effect => {
            const frame = effect.getFrameOnTick();
            if (frame) {
                ctx.drawImage(spriteList[frame.spriteID], -this.position[0] / 2, -this.position[1] / 2);
            }
        });
    }
}
