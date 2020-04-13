import {SpawnEvent} from "../src/events.mjs"
import {Enemy} from "../src/enemies.mjs"

import {updateMoney, vendor} from "./main.mjs"
import {LookupSprite} from "./sprites.mjs"

export class BasicEnemy extends Enemy {
    // TODO don't hardcode this
    position = [32, 32]

    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("enemy/0.png"),
                new LookupSprite("enemy/1.png"),
                new LookupSprite("enemy/2.png"),
            ],
            tpt: 5,
        },
        dying: {
            frames: [
                new LookupSprite("enemy/dying0.png"),
                new LookupSprite("enemy/dying1.png"),
                new LookupSprite("enemy/dying2.png"),
            ],
            tpt: 3,
        },
    }

    hp = 5
    velocity = 0.05 // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks
    strength = 1

    resistances = [] // Resistances to attack types

    _spawnedChildren = false;

    ontick(movementCallback, eventsCallback) {
        const retval = super.ontick(movementCallback, eventsCallback);
        if (this.hp == 0 && !this._spawnedChildren && this.velocity != 0.05 && !this._deathByBase) {
            this._spawnedChildren = true;

            const e1 = new BasicEnemy(vendor.id, Math.random());
            e1.position[0] = Math.floor(Math.random() * this.position[0]);
            e1.position[1] = Math.floor(Math.random() * this.position[1]);
            e1.spriteFrames.idle.frames.map(f => {
                f.filter = 'grayscale(1)';
            });
            e1.spriteFrames.dying.frames.map(f => {
                f.filter = 'grayscale(1)';
            });

            const e2 = new BasicEnemy(vendor.id, Math.random());
            e2.position[0] = Math.floor(Math.random() * this.position[0]);
            e2.position[1] = Math.floor(Math.random() * this.position[1]);
            e2.spriteFrames.idle.frames.map(f => {
                f.filter = 'grayscale(1)';
            });
            e2.spriteFrames.dying.frames.map(f => {
                f.filter = 'grayscale(1)';
            });

            eventsCallback([new SpawnEvent([e1, e2])]);
        }

        return retval;
    }

    ondeath(ecb) {
        super.ondeath(ecb);
        if (!this._deathByBase)
            updateMoney(1);
    }
}

export class BasicBoss extends Enemy {
    position = [32, 32]

    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("boss.png"),
            ],
            tpt: 0,
        },
    }

    hp = 1000
    velocity = 0.01 // horzt/vert velocity in blocks per tick
    attacksTowers = false
    strength = 100

    resistances = [] // Resistances to attack types

    _spawnedChildren = false;

    ondeath(ecb) {
        super.ondeath(ecb);
        if (!this._deathByBase)
            updateMoney(100);
    }


}
