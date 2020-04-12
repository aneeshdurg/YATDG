// TODO subclass DeathEvent
export class Event {
    remove = false
    spawn = null
}

export class DeathEvent {
    remove = true
}

export class SpawnEvent {
    constructor(entitiesToSpawn) {
        this.spawn = entitiesToSpawn;
    }
}
