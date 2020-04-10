import {GameMapEntity, DeathEvent} from './gamemap.mjs'

export class Tower extends GameMapEntity {
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

    ontick(movementCallback) {
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

        return movementCallback(false, [0, 0], sprite);
    }

    ondeath() {
        alert("You lost!");
    }

    ondamage(atk) {
        if (this.spriteFrames["damage"] && this._currentFrameSet != "damage")
            this._currentFrameSet = "damage";
        this.hp -= atk;
    }

    onenemy(enemy) {
        this.ondamage(enemy.strength);

        if (this.hp == 0) {
            return {tower: this.ondeath(), enemy: enemy.ondeath()};
        }

        return {tower: null, enemy: enemy.ondeath()};
    }
}
