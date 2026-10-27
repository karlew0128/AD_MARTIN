const screen = document.querySelector("#screen");
const picture = document.querySelector("#bouncing-picture");


const pictures = [
    { src: "assets/pic1.jpg", description: "Picture 1 of 10" },
    { src: "assets/pic2.jpg", description: "Picture 2 of 10" },
    { src: "assets/pic3.jpg", description: "Picture 3 of 10" },
    { src: "assets/pic4.jpg", description: "Picture 4 of 10" },
    { src: "assets/pic5.jpg", description: "Picture 5 of 10" },
    { src: "assets/pic6.jpg", description: "Picture 6 of 10" },
    { src: "assets/pic7.jpg", description: "Picture 7 of 10" },
    { src: "assets/pic8.jpg", description: "Picture 8 of 10" },
    { src: "assets/pic9.jpg", description: "Picture 9 of 10" },
    { src: "assets/pic10.jpg", description: "Picture 10 of 10" },
];

let left = 0;
let topPosition = 0;
let horizontalSpeed = 3;
let verticalSpeed = 3;
let currentPicture = 0;

function showNextPicture() {
    currentPicture = (currentPicture + 1) % pictures.length;
    picture.src = pictures[currentPicture].src;
    picture.alt = `Bouncing ${pictures[currentPicture].description}`;
}

function animatePicture() {
    const maxLeft = screen.clientWidth - picture.offsetWidth;
    const maxTop = screen.clientHeight - picture.offsetHeight;

    left += horizontalSpeed;
    topPosition += verticalSpeed;

    if (left <= 0 || left >= maxLeft) {
        horizontalSpeed *= -1;
        left = Math.max(0, Math.min(left, maxLeft));
        showNextPicture();
    }

    if (topPosition <= 0 || topPosition >= maxTop) {
        verticalSpeed *= -1;
        topPosition = Math.max(0, Math.min(topPosition, maxTop));
        showNextPicture();
    }

    picture.style.left = `${left}px`;
    picture.style.top = `${topPosition}px`;

    requestAnimationFrame(animatePicture);
}

animatePicture();
