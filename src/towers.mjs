import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class TowerAbility {
    cooldown = 0 // ticks before this ability can be used again
    ability = null // instance of Bullet
    modifiers = {} // modifications to the bullet

    _cooldownTimer = 0

    ontick(velocity, enemyDirection) {
        if (this._cooldownTimer > 0)
            this._cooldownTimer -= 1;

        if (this._cooldownTimer <= 0) {
            this._cooldownTimer = this.cooldown;
            return this.ability;
        }
    }
}

// give towers an ability field, use spawn events to spawn the bullets. Might
// need a flag on spawn to indicate that the entity being spawned is a different
// type

export class Tower extends Entity {
    name = ""

    hp = 0
    range = 0 // range in tiles
    abilities = []

    constructor(spawnID) {
        super();
        this._spawnID = spawnID;
    }

    get spawnID() { return this._spawnID; }

    ontick(movementCallback, eventsCallback) {
        return movementCallback(false, 0, NaN, this.getSprite());
    }

    ondamage(atk) {
        if (this.spriteFrames["damage"] && this._currentFrameSet != "damage")
            this._currentFrameSet = "damage";
        this.hp -= atk;
        this.hp = Math.max(0, this.hp);
    }

    onenemy(enemy) {
        if (enemy.isFlying) {
            // TODO tower is attacked by enemy
        }
    }
}
