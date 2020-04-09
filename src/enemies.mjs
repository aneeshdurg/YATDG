import {GameMapEntity, DeathEvent} from './gamemap.mjs'

export class Enemy extends GameMapEntity {
    spriteFrames = []   // spritelist idxs
    ticksPerSpriteTransition = 0 // number of ticks for each frame in the list above

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
        this._currentSpriteFrame = 0;
        this._statusEffects = [];
        this._ticksSinceTransition = 0;
        this._spawnID = spawnID;
        this._diceRoll = diceRoll;
    }

    get spawnID() { return this._spawnID; }

    ontick(movementCallback) {
        const sprite = this.spriteFrames[this._currentSpriteFrame];
        if (this.ticksPerSpriteTransition > 0) {
            this._ticksSinceTransition += 1;
            if (this._ticksSinceTransition >= this.ticksPerSpriteTransition) {
                this._currentSpriteFrame += 1;
                this._currentSpriteFrame %= this.spriteFrames.length;
                this._ticksSinceTransition = 0
            }
        }

        let currentVelocity = this.velocity;
        // compute any status effects
        const that = this;
        this._statusEffects.forEach((effect) => {
            if (effect.ticks >= 0)
                effect.ticks -= 1;

            if (effect.damagePerTick > 0)
                that.hp -= effect.damagePerTick;

            if (effect.velocityModifer)
                currentVelocity += effect.velocityModifier;
        });

        // posibility of status effects causing death
        // if (this.hp <= 0)
        //     return this.ondeath();
        // else {
            // handles collisions and such
        // TODO allow unique velocity direction in movementCB
            return movementCallback(true, [currentVelocity, 0], sprite);
        //}
    }

    ondamage(attack) {
        if (this.resistances.findIndex(attack.type) > 0)
            return;
        else
            this.hp -= attack.damage;

        if (this.hp <= 0) {
            return this.ondeath();
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

    ondeath() {
        // TODO add dying animations
        return new DeathEvent();
    }
}
