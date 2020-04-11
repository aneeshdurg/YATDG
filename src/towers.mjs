import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class Tower extends Entity {
    spriteFrames = {
        idle: {
            frames: [],
            tpt: 0, // tpt == ticksPerSpriteTransition
        },
        attack: {
            frames: [],
            tpt: 0,
        },
        damage: {
            frames: [],
            tpt: 0,
        }
    }

    hp = 0
    range = 0 // range in tiles

    _currentSpriteFrame = 0
    _currentFrameSet = "idle"
    _ticksSinceTransition = 0

    constructor(spawnID) {
        super();
        this._spawnID = spawnID;
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

        return movementCallback(false, 0, NaN, sprite);
    }

    ondamage(atk) {
        if (this.spriteFrames["damage"] && this._currentFrameSet != "damage")
            this._currentFrameSet = "damage";
        this.hp -= atk;
        this.hp = Math.max(0, this.hp);
    }

    onenemy(enemy) {
        // TODO rethink event system
        return {tower: null, enemy: null};
    }
}
