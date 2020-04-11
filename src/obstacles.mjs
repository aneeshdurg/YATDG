import {Tower} from './towers.mjs'
import {Attack} from './entity.mjs'
import {DeathEvent} from './events.mjs'

class ObstacleAttack extends Attack {
    constructor(damage) {
        super();
        this.damage = damage;
    }
}

export class Obstacle extends Tower {
    hp = 0

    _currentSpriteFrame = 0
    _currentFrameSet = "idle"
    _ticksSinceTransition = 0

    ondeath() {
        return new DeathEvent();
    }

    ontick(moveCb, eventCb) {
        const retval = super.ontick(moveCb, eventCb);
        if (this.hp == 0) {
            eventCb([new DeathEvent()]);
            return -1;
        }
        return retval;
    }

    ondamage(atk) {
        if (this.spriteFrames["damage"] && this._currentFrameSet != "damage")
            this._currentFrameSet = "damage";
        this.hp -= atk;
        if (this.hp == 0)
            return this.ondeath();
        return;
    }

    onenemy(enemy) {
        const atk = new ObstacleAttack(this.hp);
        this.ondamage(enemy.strength);
        enemy.ondamage(atk);
    }
}
