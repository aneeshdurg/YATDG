import {Tower} from './towers.mjs'
import {Attack} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class Base extends Tower {
    ontick(movementCb, eventCb) {
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

        if (this.hp == 0) {
            this.ondeath();
            eventCb([new DeathEvent()]);
        }
        return movementCb(false, 0, sprite);
    }

    ondeath() {
        alert("You lost!");
    }

    onenemy(enemy) {
        this.ondamage(enemy.strength);
        const atk = new Attack();
        atk.damage = enemy.hp;
        enemy.ondamage(atk);
    }
}

