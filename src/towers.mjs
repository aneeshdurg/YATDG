import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class Tower extends Entity {
    hp = 0
    range = 0 // range in tiles

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
