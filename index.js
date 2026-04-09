const canvas=document.querySelector('canvas')
const c=canvas.getContext('2d')
c.imageSmoothingEnabled=false
c.webkitImageSmoothingEnabled=false
c.mozImageSmoothingEnabled=false
c.msImageSmoothingEnabled=false

canvas.width = 1024
canvas.height = 576

function resizeCanvasDisplay() {
    const horizontalPadding = 16
    const verticalPadding = 16
    const maxWidth = window.innerWidth - horizontalPadding
    const maxHeight = window.innerHeight - verticalPadding
    const scale = Math.min(maxWidth / GAME_WIDTH, maxHeight / GAME_HEIGHT, 1)

    canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`
    canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`

    const container = document.querySelector('.container')
    if (container) {
        container.style.width = canvas.style.width
        container.style.height = canvas.style.height
    }
}

resizeCanvasDisplay()
window.addEventListener('resize', resizeCanvasDisplay)

const collisionsMap=[];
for(let i=0;i<collisions.length;i+=70){
    collisionsMap.push(collisions.slice(i,70+i));
}

const battleZonesMap = [];
for (let i = 0; i < battleZones.length; i += 70) {
    battleZonesMap.push(battleZones.slice(i, 70 + i));
}

const boundaries=[];
c.fillStyle='white';

const worldOffset={x:-750,y:-550};
c.fillRect(0,0,canvas.width,canvas.height)

const battleZoneAreas = [];


collisionsMap.forEach((row,i)=>{
    row.forEach((symbol,j)=>{
        if(symbol===1025)
            boundaries.push(
        new Boundary({
            position:{
                x:j*Boundary.width+worldOffset.x,
                y:i*Boundary.height+worldOffset.y,
            },
        }))
    })
});

battleZonesMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if (symbol === 1025) {
            battleZoneAreas.push(
                new Boundary({
                    position: {
                        x: j * Boundary.width + worldOffset.x,
                        y: i * Boundary.height + worldOffset.y
                    }
                })
            );
        }
    });
});

const image=new Image()
image.src='./images/town.png'

const foregroundImage=new Image();
foregroundImage.src='./images/foregroundObjects.png';

const playerImage=new Image();
playerImage.src='./images/playerDown.png';


const player=new Sprite({
    position:{
        x:canvas.width/2-192/4/2,
        y:canvas.height/2-68/2,
    },
    image:playerImage,
    frames:{
        max:4,
    },
});

const background=new Sprite({
    position:{
        x:worldOffset.x,
        y:worldOffset.y,
    },
    image:image,
});

const foreground=new Sprite({
    position:{
        x:worldOffset.x,
        y:worldOffset.y,
    },
    image:foregroundImage,
})
const keys={
    w:{pressed:false},
    a:{pressed:false},
    s:{pressed:false},
    d:{pressed:false},
};

const movables=[background,foreground,...boundaries, ...battleZoneAreas];
const battle={
    initiated:false,
};


function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.position.y <= rectangle2.position.y + rectangle2.height &&
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y
    );
}
function animate() {
    const animationId = window.requestAnimationFrame(animate);
    background.draw();
    boundaries.forEach((boundary) => {
        boundary.draw();
    });

    player.draw();
    foreground.draw();

    if (battle.initiated) return;

    if (keys.w.pressed || keys.a.pressed || keys.s.pressed || keys.d.pressed) {
        for (let i = 0; i < battleZoneAreas.length; i++) {
            const battleZone = battleZoneAreas[i];
            const overlappingWidth =
                Math.min(
                    player.position.x + player.width,
                    battleZone.position.x + battleZone.width
                ) - Math.max(player.position.x, battleZone.position.x);
            const overlappingHeight =
                Math.min(
                    player.position.y + player.height,
                    battleZone.position.y + battleZone.height
                ) - Math.max(player.position.y, battleZone.position.y);
            const overlappingArea = Math.max(0, overlappingWidth) * Math.max(0, overlappingHeight);

            if (
                rectangularCollision({ rectangle1: player, rectangle2: battleZone }) &&
                overlappingArea > (player.width * player.height) / 2 &&
                Math.random() < 0.01
            ) {
                window.cancelAnimationFrame(animationId);
                battle.initiated = true;

                gsap.to('#overlappingDiv', {
                    opacity: 1,
                    repeat: 3,
                    yoyo: true,
                    duration: 0.35,
                    onComplete() {
                        gsap.to('#overlappingDiv', {
                            opacity: 1,
                            duration: 0.25,
                            onComplete() {
                                initBattle();
                                animateBattle();
                                gsap.to('#overlappingDiv', {
                                    opacity: 0,
                                    duration: 0.35
                                });
                            }
                        });
                    }
                });
                break;
            }
        }
    }

    let moving=true;
    if (keys.w.pressed && lastKey === 'w') {
        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i];
            if(
                rectangularCollision({
                    rectangle1:player,
                    rectangle2:{
                        ...boundary,
                        position:{
                            x:boundary.position.x,
                            y:boundary.position.y+3,
                        },
                    },
                })
            ){
                console.log("colliding");
                moving=false;
                break;
            }
        }

        if(moving){
            movables.forEach((movable) => {
                movable.position.y += 3;
            });
        }
    } else if (keys.a.pressed && lastKey === 'a') {
        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i];
            if(
                rectangularCollision({
                    rectangle1:player,
                    rectangle2:{
                        ...boundary,
                        position:{
                            x:boundary.position.x+3,
                            y:boundary.position.y,
                        },
                    },
                })
            ){
                moving=false;
                break;
            }
        }

        if(moving){
            movables.forEach((movable) => {
                movable.position.x += 3;
            });
        }
    } else if (keys.d.pressed && lastKey === 'd') {
        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i];
            if(
                rectangularCollision({
                    rectangle1:player,
                    rectangle2:{
                        ...boundary,
                        position:{
                            x:boundary.position.x-3,
                            y:boundary.position.y,
                        },
                    },
                })
            ){
                moving=false;
                break;
            }
        }

        if(moving){
            movables.forEach((movable) => {
                movable.position.x -= 3;
            });
        }
    } else if (keys.s.pressed && lastKey === 's') {
        for(let i=0;i<boundaries.length;i++){
            const boundary=boundaries[i];
            if(
                rectangularCollision({
                    rectangle1:player,
                    rectangle2:{
                        ...boundary,
                        position:{
                            x:boundary.position.x,
                            y:boundary.position.y-3,
                        },
                    },
                })
            ){
                moving=false;
                break;
            }
        }

        if(moving){
            movables.forEach((movable) => {
                movable.position.y -= 3;
            });
        }
    }
}
animate();

let lastKey = '';

function setMovementKey(key) {
    if (!keys[key]) return;
    keys[key].pressed = true;
    lastKey = key;
}

function clearMovementKey(key) {
    if (!keys[key]) return;
    keys[key].pressed = false;
}

window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'w':
            setMovementKey('w');
            break;
        case 'a':
            setMovementKey('a');
            break;
        case 's':
            setMovementKey('s');
            break;
        case 'd':
            setMovementKey('d');
            break;
    }
    console.log(keys);
});
window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'w':
            clearMovementKey('w');
            break;
        case 'a':
            clearMovementKey('a');
            break;
        case 's':
            clearMovementKey('s');
            break;
        case 'd':
            clearMovementKey('d');
            break;
    }
    console.log(keys);
});

const controlButtons = document.querySelectorAll('#mobileControls .controlButton');

controlButtons.forEach((button) => {
    const key = button.dataset.key;
    if (!key) return;

    button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        setMovementKey(key);
        button.classList.add('active');
    });

    const release = () => {
        clearMovementKey(key);
        button.classList.remove('active');
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
});