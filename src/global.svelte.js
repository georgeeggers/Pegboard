import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://127.0.0.1:8090');

export const globalState = $state({
    init: false,
    mainColor: "c5a103",
    dotColor: "f8fBf8",
    backgroundColor: '1a1a1a',
    noteWidth: '500',
    imageWidth: '500'
})