const size = 64;
const images = [
    // "blp:Action_Promote",
    // "blp:nar_rew_promotion",
];

function layerImage(url, size, background, layers=1) {
    const ground = document.createElement("div");
    ground.classList.value = "relative";
    ground.style.backgroundColor = background;
    ground.style.height = ground.style.width = `${size}px`;
    for (let i = 0; i < layers; ++i) {
        const image = document.createElement("img");
        image.classList.value = "absolute inset-0";
        image.src = url;
        ground.appendChild(image);
    }
    return ground;
}

if (images.length) {
    const capture = document.createElement("div");
    capture.classList.value = "absolute flex flex-col";
    capture.style.backgroundColor = "#808080";
    document.body.appendChild(capture);

    for (const image of images) {
        const row = document.createElement("div");
        row.classList.value = "flex flex-row";
        capture.appendChild(row);
        row.appendChild(layerImage(image, size, "#ffffff"));
        row.appendChild(layerImage(image, size, "transparent", 256));
        row.appendChild(layerImage(image, size, "#000000"));
    }
}
