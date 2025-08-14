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
    noteWidth: '500',
    imageWidth: '500',
    experimental: false,
    pocket: new PocketBase('http://127.0.0.1:8090'),
    url: 'http://127.0.0.1:8090'
})

export const refresh_pocket = (url) => {
    try {
        globalState.pocket = new PocketBase(url);
    } catch (err) {
        console.log("Error " + err + " logged in pocketbase.svelte.js");
    }
}