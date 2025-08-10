import PocketBase from 'pocketbase';

export const globalState = $state({
    init: false,
    mainColor: "c5a103",
    dotColor: "f8fBf8",
    backgroundColor: '1a1a1a',
    hoverColor: '947900',
    noteWidth: '500',
    imageWidth: '500',
    pocket: new PocketBase('http://73.173.154.154:8090'),
    url: 'http://73.173.154.154:8090'
})

export const refresh_pocket = (url) => {
    try {
        globalState.pocket = new PocketBase(url);
    } catch (err) {
        console.log("Error " + err + " logged in pocketbase.svelte.js");
    }
}