const canvas=document.querySelector('canvas')
const c=canvas.getContext('2d')
const GAME_WIDTH = 1525
const GAME_HEIGHT = 680

canvas.width = GAME_WIDTH
canvas.height = GAME_HEIGHT

function resizeCanvasDisplay() {
    const horizontalPadding = 16
    const verticalPadding = 16
    const maxWidth = window.innerWidth - horizontalPadding
    const maxHeight = window.innerHeight - verticalPadding
    const scale = Math.min(maxWidth / GAME_WIDTH, maxHeight / GAME_HEIGHT, 1)

    canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`
    canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`
}

resizeCanvasDisplay()
window.addEventListener('resize', resizeCanvasDisplay)

const collisionsMap=[];
for(let i=0;i<collisions.length;i+=70){
    collisionsMap.push(collisions.slice(i,70+i));
}

const boundaries=[];
c.fillStyle='white';

const offset={x:-735,y:-650};
c.fillRect(0,0,canvas.width,canvas.height)


collisionsMap.forEach((row,i)=>{
    row.forEach((symbol,j)=>{
        if(symbol===1025)
            boundaries.push(
        new Boundary({
            position:{
                x:j*Boundary.width+offset.x,
                y:i*Boundary.height+offset.y,
            },
        }))
    })
});

const image=new Image()
image.src='./images/town.png'

const foregroundImage=new Image();
foregroundImage.src='./images/foregroundObjects.png';

image.onload=()=>{
    c.drawImage(image,-750,-550);
}

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
        x:-738,
        y:-605,
    },
    image:image,
});

const foreground=new Sprite({
    position:{
        x:offset.x,y:offset.y,
    },
    image:foregroundImage,
})
const keys={
    w:{pressed:false},
    a:{pressed:false},
    s:{pressed:false},
    d:{pressed:false},
};

const movables=[background,foreground,...boundaries];


function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.position.y <= rectangle2.position.y + rectangle2.height &&
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y
    );
}
function animate() {
    window.requestAnimationFrame(animate);
    background.draw();
    boundaries.forEach((boundary) => {
        boundary.draw();
    });

    player.draw();
    foreground.draw();
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