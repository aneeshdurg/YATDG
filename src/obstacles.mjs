import {Tower} from './towers.mjs'
import {Attack} from './entity.mjs'
import {DeathEvent} from './events.mjs'
import {DONTUPDATE} from './gamemap.mjs'

class ObstacleAttack extends Attack {
    constructor(damage) {
        super();
        this.damage = damage;
    }
}

export class Obstacle extends Tower {
    hp = 0

    ondeath(eventCB) {
        eventCB([new DeathEvent()]);
    }

    ontick(moveCB, eventCB) {
        const retval = super.ontick(moveCB, eventCB);
        if (this.hp == 0) {
            this.ondeath(eventCB);
            return DONTUPDATE;
        }
        return retval;
    }

    ondamage(atk) {
        if (this.spriteFrames["damage"] && this._currentFrameSet != "damage")
            this._currentFrameSet = "damage";
        this.hp -= atk;
        this.hp = Math.max(this.hp, 0);
    }

    onenemy(enemy) {
        const atk = new ObstacleAttack(this.hp);
        this.ondamage(enemy.strength);
        enemy.ondamage(atk);
    }
}
