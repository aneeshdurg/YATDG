export class UpgradeNode {
    static description = ""
    static icon = null
    static price = 0
    static children = []

    static effect(tower) {}
}

export class UpgradeTree {
    totalSpent = 0
    currentLeaves = [] // [UpgradesNode]
    tower = null

    constructor(tower) {
        this.tower = tower;
    }

    upgrade(u) {
        const id = this.currentLeaves.findIndex(u_ => u == u_);
        const node = this.currentLeaves.splice(id, 1)[0]
        node.children.forEach(child => { this.currentLeaves.push(child); });
        node.effect(this.tower);
        this.totalSpent += node.price;
    }
}
