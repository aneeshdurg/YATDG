import {Tower} from './towers.mjs'
import {Attack} from './entity.mjs'
import {DeathEvent} from './events.mjs'

export class Base extends Tower {
    ontick(movementCb, eventCb) {
        if (this.hp == 0) {
            this.ondeath();
            eventCb([new DeathEvent()]);
        }
        return movementCb(true, [0, 0], 0, this.getSprite());
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

