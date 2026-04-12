const audio={
    Map:new Howl({
        src:'./audioFiles/map.wav',
        html5:true,
        volume:0.1
    }),
    initBattle:new Howl({
        src:'/audioFiles/initBattle.wav',
        html5:true,
        volume:0.1
    }),
    battle:new Howl({
        src:'./audioFiles/battle.mp3',
        html5:true,
        volume:0.1
    }),
    tackleHit:new Howl({
        src:'./audioFiles/tackleHit.wav',
        html5:true,
        volume:0.1
    }),
    fireballHit:new Howl({
        src:'./audioFiles/initFireball.wav',
        html5:true,
        volume:0.1
    }),
    victory:new Howl({
        src:'./audio/victory.wav',
        html5:true,
        volume:0.1
    })
}