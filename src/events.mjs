// TODO subclass DeathEvent
export class Event {
    remove = false
    spawn = null
    isAttack = false
}

export class DeathEvent {
    remove = true
}

export class SpawnEvent {
    constructor(entitiesToSpawn) {
        this.spawn = entitiesToSpawn;
    }
}

export class AttackEvent extends SpawnEvent {
    isAttack = true
    constructor(entitiesToSpawn) {
        super(entitiesToSpawn);
    }
}
