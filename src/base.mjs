import {GameMapEntity} from './gamemap.mjs'

export class Base extends GameMapEntity {
    spriteFrames = []   // spritelist idxs
    ticksPerSpriteTransition = 0 // number of ticks for each frame in the list above

    hp = 0

    _currentSpriteFrame = 0;
    _ticksSinceTransition = 0;

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

        return movementCallback(false, [0, 0], sprite);
    }

    ondeath() {
        alert("You lost!");
    }

    ondamage(atk) {
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

