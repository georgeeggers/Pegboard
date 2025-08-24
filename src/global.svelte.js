import PocketBase from 'pocketbase';

export const globalState = $state({
    init: false,
    mainColor: "c5a103",
    dotColor: "f8fBf8",
    backgroundColor: '1a1a1a',
    hoverColor: '947900',
    textColor: "f8f8f8",
    titleColor: "f8f8f8",
    inactiveColor: "252525",
    activeColor: "2f2f2f",
    blurRadius: "5",
    gap: "10",
    themeName: "Default",
    noteWidth: '500',
    imageWidth: '500',
    experimental: false,
    pocket: new PocketBase('http://127.0.0.1:8090'),
    url: 'http://127.0.0.1:8090'
});

export const loadSettings = async () => {
    const settings = JSON.parse(await localStorage.getItem("settings"));
    if(settings == null){
        console.log("No Settings :(");
        return;
    }
    console.log(settings);

    globalState.mainColor = settings.mainColor;
    globalState.dotColor = settings.dotColor;
    globalState.backgroundColor = settings.backgroundColor;
    globalState.hoverColor = settings.hoverColor;
    globalState.textColor = settings.textColor;
    globalState.experimental = settings.experimental;
    globalState.titleColor = settings.titleColor;
    globalState.inactiveColor = settings.inactiveColor;
    globalState.activeColor = settings.activeColor;
    globalState.noteWidth = settings.noteWidth;
    globalState.imageWidth = settings.imageWidth;
    globalState.url = settings.url;
    globalState.blurRadius = settings.blurRadius;
    globalState.gap = settings.gap;
    globalState.themeName = settings.theme;
}

export const refresh_pocket = (url) => {
    try {
        globalState.pocket = new PocketBase(url);
    } catch (err) {
        console.log("Error " + err + " logged in pocketbase.svelte.js");
    }
}

export let themes = $state([
{
    name: "Default",
    backgroundColor: "1a1a1a",
    activeColor: "2f2f2f",
    inactiveColor: "252525",
    mainColor: "c5a103",
    hoverColor: "947900",
    textColor: "f8f8f8",
    titleColor: "f8f8f8",
    dotColor: "f8f8f8",
    blurRadius: '0'

},
{
    name: "Cyber",
    backgroundColor: "080808e0",
    activeColor: "151515",
    inactiveColor: "10101088",
    mainColor: "007f77",
    hoverColor: "006e55",
    textColor: "009f77",
    titleColor: "009f77",
    dotColor: "009f77",
    blurRadius: '7'

},
{
    name: "Light",
    backgroundColor: "f8f8f8",
    activeColor: "c8c8c8",
    inactiveColor: "e8e8e8",
    mainColor: "c5a103",
    hoverColor: "947900",
    textColor: "1a1a1a",
    titleColor: "1a1a1a",
    dotColor: "000000",
    blurRadius: '0'

},
{
    name: "Midnight",
    backgroundColor: "000000",
    activeColor: "1a1a1a",
    inactiveColor: "121212",
    mainColor: "f8f8f8",
    hoverColor: "f8f8f8",
    textColor: "ffffff",
    titleColor: "ffffff",
    dotColor: "000000",
    blurRadius: '0'
},    
{
    name: "Mocha",
    backgroundColor: "1e1e2e",
    activeColor: "45475a",
    inactiveColor: "313244",
    mainColor: "ed8796",
    hoverColor: "ee99a0",
    textColor: "cdd6f4",
    titleColor: "b4befe",
    dotColor: "b4befe",
    blurRadius: '0'
},
{
    name: "Glassy",
    backgroundColor: "313244",
    activeColor: "f8f8f880",
    inactiveColor: "e0e0e080",
    mainColor: "ed8796",
    hoverColor: "ee99a0",
    textColor: "1a1a1a",
    titleColor: "0e0e0e",
    dotColor: "ed8796",
    blurRadius: '8'
}

])