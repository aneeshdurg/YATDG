import {Entity} from './entity.mjs'
import {DeathEvent} from './events.mjs'
import {VMath} from './vmath.mjs'
import {DONTUPDATE} from './gamemap.mjs'

export class Bullet extends Entity {
    velocityMagnitude = 0
    lifespan = 0
    pierce = 0
    attack = null

    _velocity = [0, 0] // horzt/vert velocity in blocks per tick

    // spawnID should be a monotonically increase ID for all enemies spawned in
    // a particular wave
    constructor(spawnID, diceRoll) {
        super();
        this._spawnID = spawnID;
        this._diceRoll = diceRoll;
    }

    setTower(tower) {
        // TODO use tower to track damage dealt or something
        this._tower = tower;
    }

    setDirection(direction) {
        this._velocity = VMath.mul(direction, this.velocityMagnitude / VMath.magnitude(direction));
    }

    get spawnID() { return this._spawnID; }

    ondeath(eventsCallback) {
        eventsCallback([new DeathEvent()])
    }

    ontick(movementCallback, eventsCallback) {
        this.lifespan--;
        if (this.lifespan == 0 || this.pierce == 0) {
            if (this.spriteFrames["dying"])
                this._currentFrameSet = "dying";
        }

        const sprite = this.getSprite();

        let currentVelocity = VMath.copy(this._velocity);
        if (this.lifespan == 0)
            currentVelocity = VMath.mul(currentVelocity, 0);

        if (this.lifespan == 0 && this._currentFrameSet == "idle") {
            this.ondeath(eventsCallback);
            return DONTUPDATE;
        } else
            return movementCallback(true, currentVelocity, NaN, sprite);
    }

    onenemy(enemy) {
        if (!this.lifespan || !this.pierce)
            return;
        enemy.ondamage(this.attack);
        this.pierce--;
        if (this.pierce < 0)
            this.pierce = 0;
    }
}
