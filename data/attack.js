const attacks = {
  Tackle: {
    name: 'Tackle',
    damage: 12,
    type: 'Normal',
    color: '#222'
  },
  Fireball: {
    name: 'Fireball',
    damage: 24,
    type: 'Fire',
    color: '#e74c3c',
    cooldown: 1,
    statusEffect: {
      type: 'burn',
      chance: 0.35,
      duration: 3
    }
  },
  PoisonSting: {
    name: 'PoisonSting',
    damage: 10,
    type: 'Poison',
    color: '#8e44ad',
    cooldown: 1,
    statusEffect: {
      type: 'poison',
      chance: 0.45,
      duration: 4
    }
  },
  ThunderShock: {
    name: 'ThunderShock',
    damage: 11,
    type: 'Electric',
    color: '#f1c40f',
    cooldown: 2,
    statusEffect: {
      type: 'stun',
      chance: 0.3,
      duration: 1
    }
  },
  IronGuard: {
    name: 'IronGuard',
    damage: 0,
    type: 'Steel',
    color: '#7f8c8d',
    cooldown: 2,
    selfEffect: {
      defenseBuff: {
        stages: 1,
        duration: 3
      }
    }
  },
  Recover: {
    name: 'Recover',
    damage: 0,
    type: 'Support',
    color: '#2ecc71',
    cooldown: 3,
    heal: 28
  }
}