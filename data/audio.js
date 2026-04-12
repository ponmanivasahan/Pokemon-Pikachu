const audio={
    Map:new Howl({
        src:['./audioFiles/map.wav'],
        loop:true,
        preload:true,
        volume:0.3
    }),
    initBattle:new Howl({
        src:['./audioFiles/initBattle.wav'],
        preload:true,
        volume:0.1
    }),
    battle:new Howl({
        src:['./audioFiles/battle.mp3'],
        loop:true,
        preload:true,
        volume:0.2
    }),
    tackleHit:new Howl({
        src:['./audioFiles/tackleHit.wav'],
        preload:true,
        volume:0.2
    }),
    fireballHit:new Howl({
        src:['./audioFiles/initFireball.wav'],
        preload:true,
        volume:0.2
    }),
    victory:new Howl({
        src:['./audioFiles/victory.wav'],
        preload:true,
        volume:0.2
    })
}