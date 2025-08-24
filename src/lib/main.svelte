<script>
  import { scale } from "svelte/transition";
  import { globalState, refresh_pocket, loadSettings, themes } from "../global.svelte";
  import { onDestroy, onMount, tick } from "svelte";

  // contains objects that have titles, bodies, colors, and x and y coords
  let notes = $state([]);
  let selected = $state(-1);
  let dragging = $state(false);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let snapSize = $state(1);
  let clientStorage = $state(false);
  

  $effect(() => {
    globalState.themeName = "MyTheme";
    isCustom = true;
    const colorVars = {
      '--main-color': globalState.mainColor,
      '--dot-color': globalState.dotColor,
      '--bg-color': globalState.backgroundColor,
      '--hover-color': globalState.hoverColor,
      '--text-color': globalState.textColor,
      '--title-color': globalState.titleColor,
      '--inactive-color': globalState.inactiveColor,
      '--note-color': globalState.activeColor
    };

    for (const [varName, value] of Object.entries(colorVars)) {
      document.documentElement.style.setProperty(varName, `#${value}`);
    }

    document.documentElement.style.setProperty('--blur-radius', `${globalState.blurRadius}px`);
  });

  $effect(() => {
    refresh_pocket(globalState.url)
  })

  let isCustom = $state(false);
  let customThemes = $state([]);

  const saveSettings = async () => {
    if(isCustom){
      customThemes.push(JSON.stringify({
        name: globalState.themeName,
        backgroundColor: globalState.backgroundColor,
        activeColor: globalState.activeColor,
        inactiveColor: globalState.inactiveColor,
        mainColor: globalState.mainColor,
        hoverColor: globalState.hoverColor,
        textColor: globalState.textColor,
        titleColor: globalState.titleColor,
        dotColor: globalState.dotColor,
        blurRadius: globalState.blurRadius
      }));

      themes.push({
        name: globalState.themeName,
        backgroundColor: globalState.backgroundColor,
        activeColor: globalState.activeColor,
        inactiveColor: globalState.inactiveColor,
        mainColor: globalState.mainColor,
        hoverColor: globalState.hoverColor,
        textColor: globalState.textColor,
        titleColor: globalState.titleColor,
        dotColor: globalState.dotColor,
        blurRadius: globalState.blurRadius
      })
    }
    const prefs = {
      mainColor: globalState.mainColor,
      dotColor: globalState.dotColor,
      backgroundColor: globalState.backgroundColor,
      hoverColor: globalState.hoverColor,
      textColor: globalState.textColor,
      experimental: globalState.experimental,
      titleColor: globalState.titleColor,
      inactiveColor: globalState.inactiveColor,
      activeColor: globalState.activeColor,
      noteWidth: globalState.noteWidth,
      imageWidth: globalState.imageWidth,
      blurRadius: globalState.blurRadius,
      theme: globalState.themeName,
      customs: customThemes,
      url: globalState.url,
      gap: globalState.gap
    }
    isCustom = false;
    localStorage.setItem("settings", JSON.stringify(prefs));
    addNotification("Settings saved!");
  }



  const clearSettings = () => {
    try {
      localStorage.removeItem("settings");
    } catch (E) {
      console.log(E);
    }
    addNotification("Settings cleared! Reload for changes to take effect")
  }

  const loadTheme = async (theme) => {
      globalState.hoverColor = theme.hoverColor;
      globalState.textColor = theme.textColor;
      globalState.titleColor = theme.titleColor;
      globalState.inactiveColor = theme.inactiveColor;
      globalState.activeColor = theme.activeColor;
      globalState.backgroundColor = theme.backgroundColor;
      globalState.dotColor = theme.dotColor;
      globalState.mainColor = theme.mainColor;
      globalState.blurRadius = theme.blurRadius;
      await tick;
      globalState.themeName = theme.name;
      isCustom = false;
  }

  /*

  --bg-color: #1a1a1a;
  --note-color: #2f2f2f;
  --inactive-color: #252525;
  --main-color: #c5a103;
  --hover-color: #947900;
  --text-color: #f8f8f8;
  --title-color: #f8f8f8;
  --dot-color: #F8FBF8;

  */

  let dragLogic = (e) => {
    if(dragging){
      notes[selected].x = e.pageX + offsetX;
      notes[selected].y = e.pageY + offsetY;
    }
  }

  let mouseUpLogic = async (e) => {
    if(e.button == 0 && dragging){
      // @ts-ignore
      dragging = false;
      document.removeEventListener('mousemove', dragLogic);
      if(notes[selected].x < 0) {
        notes[selected].x = 0;
      }
      if(notes[selected].y < 0) {
        notes[selected].y = 0;
      }
      notes[selected].x = (Math.round(notes[selected].x / snapSize) * snapSize);
      notes[selected].y = (Math.round(notes[selected].y / snapSize) * snapSize);

      if(notes[selected].type != "settings" && notes[selected].type != "style"){
        try {
          const _record = await globalState.pocket.collection('notes').update(notes[selected].id, notes[selected]);
        } catch(Err) {
          console.log("Its yelling because of delete or repeat requests but we good non fatal error type stuff");
        }
      }
    }

  }

  let mouseDownLogic = async (e) => {
    if(e.button == 0){
      const element = e.target.closest('.mover');
      if(element != null){
        if(element.id.split('-').length == 2){
          // @ts-ignore
          selected = parseInt(element.id.split('-')[1]);
          offsetX = notes[selected].x - e.pageX;
          offsetY = notes[selected].y -  e.pageY;
          dragging = true;
          document.addEventListener('mousemove', dragLogic);
        }
      } else {
        selected = parseInt(e.currentTarget.id);
      }
    }
  }

  const moveLogic = (e) => {
    if(moveDrag){
      window.scrollBy(e.movementX * -1, e.movementY * -1);
    }
  }

  const globalMouseDown = (e) => {
    if(e.button == 1 && dragging){
      // @ts-ignore
      dragging = false;
      document.removeEventListener('mousemove', dragLogic);
      if(notes[selected].x < 0) {
        notes[selected].x = 0;
      }
      if(notes[selected].y < 0) {
        notes[selected].y = 0;
      }
    } else if (e.button == 2){
      e.preventDefault();
      moveDrag = true;
      document.addEventListener('mousemove', moveLogic);
    }
  }

  const globalMouseUp = (e) => {
    if(e.button == 2){
      moveDrag = false;
      document.removeEventListener('mousemove', moveLogic);
    }
  }

  let moveDrag = $state(false);
  
  let unsubscribe;
  onMount(async () => {
    isCustom = false;
    await loadSettings();
    try {
      const response = await globalState.pocket.collection("notes").getFullList({
        sort: "-created",
      });
      notes = response;
      for(let i of notes) {
        i.editing = false;
      }
      unsubscribe = await globalState.pocket
        .collection("notes")
        .subscribe("*", async ({ action, record }) => {
          console.log(action);
          if (action == "create") {
            let thing = record;
            thing.editing = false;
            thing.playing = false;
            await notes.push(thing);

            // add the event listeners up here
            let tempElement = document.getElementById((notes.length - 1).toString());
            tempElement.addEventListener('mousedown', mouseDownLogic);
            tempElement.addEventListener('mouseup', mouseUpLogic);
            edit(notes.length - 1);
            selected = notes.length - 1;


            let temp = await document.getElementById((notes.length - 1).toString());
            temp.addEventListener('mousedown', mouseDownLogic);
            temp.addEventListener('mouseup', mouseUpLogic);
          } else if (action == "update"){
            // get index
            let index = 0;
            for(let i of notes){
              if(i.id == record.id){
                break;
              }
              index++;
            }

            let temp = record;
            temp.playing = notes[index].playing;
            temp.editing = notes[index].editing;
            notes[index] = temp;
          } else if (action == "delete"){
            let index = 0;
            for(let i of notes){
              if(i.id == record.id){
                break;
              }
              index++;
            }

            notes.splice(index, 1);
          }
        });
    } catch {
      addNotification("Failed to connect to note server")
    }


    let n = document.getElementsByClassName('note');

    for(let i of n){
      i.addEventListener('mousedown', mouseDownLogic)

      i.addEventListener('mouseup', mouseUpLogic);
    }
    
    if(!globalState.init){
      document.addEventListener('mousedown', globalMouseDown);
      document.addEventListener('mouseup', globalMouseUp)
      document.addEventListener('contextmenu', (event) => { 
        event.preventDefault(); 
      });
      globalState.init = true;
    }

  });

  async function upload(file, index) {
    try {
        const data = {
          "type": "image",
          "title": notes[index].title,
          "image": file,
          "x": notes[index].x,
          "y": notes[index].y
        }

        const upload = await globalState.pocket.collection('notes').update(notes[index].id, data);
        if(upload){
          console.log("File Uploaded");
          const record = await globalState.pocket.collection('notes').getOne(notes[index].id);
          notes[index] = record;
          notes[index].editing = true;
          notes[index].uploading = false;
        }
    } catch (err) {
      addNotification("Something went wrong. Try again later");
    }
  }

  const getType = (ext) => {
    for(let name of [
      "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif",
      "webp", "heif", "heic", "ico", "avif",
      "psd", "ai", "eps", "raw", "cr2", "nef"
    ]){
      if(name == ext){
        return "image";
      }
    }
    for(let name of [
      "wav", "mp3", "ogg"
    ]){
      if(name == ext){
        return "audio";
      }
    }
    return "other";
  }

  const get_thumbnail = (index) => {
    let ext = notes[index].image.split('.').reverse()[0];
    return {type: getType(ext.toLowerCase()), data: globalState.pocket.files.getURL(notes[index], notes[index].image)}

  }

  async function handleFileChange(e, index){ 
    notes[index].uploading = true;
    if(e.type == "change"){
      await upload(e.target.files[0], index);
    } else if (e.type == "drop"){
      e.preventDefault();
      await upload(e.dataTransfer.files[0], index);
    }
  };

  onDestroy(() => {
    unsubscribe?.();
  });

  const edit = async (index) => {
    notes[index].editing = !notes[index].editing;
    if(notes[index].editing == false){
      try {
        const _record = await globalState.pocket.collection('notes').update(notes[index].id, notes[index]);
      } catch (Err) {
        console.log("This should be fine")
      }
    }
  }

  const deleteNote = async (index) => {
    console.log("deleting");
    let id = notes[index].id;
    notes.splice(index, 1);
    await globalState.pocket.collection('notes').delete(id);
    selected = -1;
  }

  let menuToggle = $state(false);

  const toggleMenu = () => {
    menuToggle = !menuToggle;
  }

  const add = async () => {
    let data = {
      type: "note", 
      title: "",
      content: "",
      x: window.scrollX + window.outerWidth / 2 - 100,
      y: window.scrollY + window.outerHeight / 2 - 100
    };

    const record = await globalState.pocket.collection('notes').create(data);
  }

  const settings = async () => {
    await deleteSettings();

    let data = {
      id: '',
      type: "settings", 
      title: "",
      content: "",
      editing: false,
      image: null,
      list: null,
      x: window.scrollX,
      y: window.scrollY
    };

    await notes.push(data);


    let temp = document.getElementById((notes.length - 1).toString());
    temp.addEventListener('mousedown', mouseDownLogic);
    temp.addEventListener('mouseup', mouseUpLogic);
    selected = notes.length - 1;
  }

  const copy = async (index) => {
    try {
      let text;
      let note = notes[index];
      if(note.type == "note"){
        if(note.title != ""){
          text = note.title + '\n' + note.content;
        } else {
          text = note.content;
        }
      } else {
        if(note.title != ""){
          text = note.title + '\n';
        }
        for(let i = 0; i < note.todo.items.length; i++){
          if(typeof(note.todo.values[i]) == "boolean"){
            text += `(${note.todo.values[i] ? "x" : " "}) - ${note.todo.items[i]}\n`;
          } else {
            text += `(${isComplete(note.todo.values[i].values) ? "x" : " "}) - ${note.todo.items[i]}\n`;
            for(let j = 0; j < note.todo.values[i].items.length; j++){
              text += `  (${note.todo.values[i].values[j] ? "x" : " "}) - ${note.todo.values[i].items[j]}\n`;
            }
          }
        }
      }

      await navigator.clipboard.writeText(text);
      addNotification("Copied to Clipboard")      
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  }

  const addNotification = async (content) => {
    let notifArea = document.getElementById('notifArea');
    let div = document.createElement('div');
    div.style.cssText = `
      opacity: 0.0;
      transform: translateY(32px);
      transition: 
        opacity 500ms,
        transform 500ms
      ;
      background-color: var(--main-color);
      padding-left: 10px;
      padding-right: 10px;
      border-radius: 10px;
      width: fit-content;
      height: fit-content;
      box-sizing: border-box;
    `
    let notif = document.createElement('p1');
    notif.style.cssText = `
      color: var(--text-color);      
    `
    notif.innerText = content;
    await div.appendChild(notif);
    await notifArea.appendChild(div);
    
    setTimeout(() => {
      div.style['opacity'] = '1.0';
      div.style['transform'] = 'translateY(0px)';
    }, 250);
    
    setTimeout(() => {
      div.style['opacity'] = "0.0";
      div.style['transform'] = "translateY(-32px)";
    }, 3500);

    setTimeout(() => {
      div.remove();
    }, 4000)
  }

  const download = (index) => {
      const url = globalState.pocket.files.getURL(notes[index], notes[index].image) + "?download=1";
      return url
  }

  const addImage = async () => {
    let data = {
      type: "image", 
      title: "",
      uploading: false,
      x: window.scrollX + window.outerWidth / 2 - 100,
      y: window.scrollY + window.outerHeight / 2 - 100
    };

    const _record = await globalState.pocket.collection('notes').create(data);
  }

  const addTodo = async () => {
    let data = {
      type: "list", 
      title: "",
      todo: {
        "items": [
          ""
        ],
        "values": [
          false
        ]
      },
      x: window.scrollX + window.outerWidth / 2 - 100,
      y: window.scrollY + window.outerHeight / 2 - 100
    };

    const _record = await globalState.pocket.collection('notes').create(data);
  }

  const isComplete = (arr) => {
    for(let i of arr){
      if(!i){
        return false;
      }
    }
    return true;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const updateNote = async (index) => {
    const _record = await globalState.pocket.collection('notes').update(notes[selected].id, notes[selected]);
  }

  // will contain objects that look like 
  /*

    {
      low: highest y coord,
      high: highest y coord,
      x: the x to give
    }

  */

  let collisionBounds = [];
  let maxY = 0;
  const checkCollison = (y1, y2) => {
    let x1 = 0;
    let validIndex = 0;
    for(let index = collisionBounds.length - 1; index >= 0; index--){
      let i = collisionBounds[index];
      if(y1 >= i.low && y1 <= i.high){
        x1 = i.x;
        validIndex = index;
        break;
      }
    }
    for(let index = collisionBounds.length - 1; index >= 0; index--){
      let i = collisionBounds[index];
      if(y2 >= i.low && y2 <= i.high){
        if(i.x == x1){
          return {x: x1, y: y1};
        } else {
          if(x1 < i.x){
            return {x: i.x, y: i.low + 10};
          } else {
            return {x: i.x, y: collisionBounds[validIndex].high}
          }
        }
      }
    }
  }

  const gethighestY = (x, borders) => {
    let highestY = 0;
    for(let border of borders){
      if(x >= border.low && x <= border.high){
        if(border.output > highestY){
          highestY = border.output;
        }
      }
    }
    return highestY;
  }

  const sort = async () => {
    let deleted = false;

    for(let index = notes.length - 1; index >= 0; index--){
      let note = notes[index];
      if(note.title == "" && note.content == "" && note.image == "" && (note.todo == null || note.todo.items[0] == '') && note.editing == false){
        console.log(index);
        await deleteNote(index);
        deleted = true;
      }
    }

    if(deleted){
      await sleep(550);
    }

    collisionBounds = [];
    maxY = 0;
    let noteDivs = document.getElementsByClassName('note');
    let totalWidth = 0;
    let totalHeight = 0;
    let sortList = [];
    for(let i of noteDivs){
      if(!(i.classList[1].toString() == "settingsType") && !(i.classList[1].toString() == "styleType")){
        sortList.push({
          // @ts-ignore
          area: i.offsetWidth * i.offsetHeight,
          // @ts-ignore
          width: i.offsetWidth,
          // @ts-ignore
          height: i.offsetHeight,
          id: i.id,
          // @ts-ignore
          flatness: i.offsetWidth / i.offsetHeight,
          x: 0,
          y: 0
        });
        // @ts-ignore
        totalWidth += i.offsetWidth;
        // @ts-ignore
        totalHeight += i.offsetHeight;
      }

    }
    let time = Math.round(1500 / sortList.length / 2);
    sortList.sort((a, b) => {
      if(a.flatness < b.flatness){
        return 1;
      } else if (a.flatness > b.flatness){
        return -1;
      }
      if(a.height < b.height){
        return -1;
      } else if (a.height > b.height){
        return 1;
      }
      return 0;
    });

    let idealWidth = (totalWidth / (Math.ceil(Math.sqrt(sortList.length)))) * 1.5;
    let eclipsedWidth = 0;
    const gap = parseInt(globalState.gap);
    let nextX = gap;
    let nextY = gap;
    let count = 0;
    let layers = 0;
    
    let borders = [];
    let itemLayers = [];
    let currentLayer = [];


    for(let i of [...sortList]){
      eclipsedWidth += gap + i.width;
      let id = parseInt(i.id);
      notes[id].y = nextY;
      notes[id].x = nextX;
      sortList[sortList.indexOf(i)].x = nextX;
      sortList[sortList.indexOf(i)].y = nextY;
      selected = id;
      if(layers == 0){
        sortList.splice(sortList.indexOf(i), 1);
        borders.push({
          low: nextX,
          high: i.width + nextX + gap,
          output: nextY + i.height + gap
        });
      }

      nextX += gap + i.width;
      if(i.height > maxY){
        maxY = i.height;
      }
      count++;
      await sleep(time);

      currentLayer.push(i);
      if(eclipsedWidth >= idealWidth){
        eclipsedWidth = 0;
        nextY += maxY + gap;
        nextX = gap;
        maxY = 0;
        layers++;
        itemLayers.push(currentLayer);
        currentLayer = [];
      }
    }
    itemLayers.push(currentLayer);

    let temp = [];

    for(let ind = 0; ind < layers; ind++){
      for(let i of itemLayers[ind + 1]){
        let y1 = gethighestY(i.x, borders);
        let y2 = gethighestY(i.x + i.width, borders);
        let id = parseInt(i.id);
        if(y1 > y2){
          notes[id].y = y1;
          temp.push({
            low: i.x,
            high: i.width + i.x + gap,
            output: y1 + i.height + gap
          })
        } else {
          notes[id].y = y2;
          temp.push({
            low: i.x,
            high: i.width + i.x + gap,
            output: y2 + i.height + gap
          })
        }
        await(sleep(time));
      }
      for(let i of temp){
        borders.push(i);
      }
      temp = [];
    }

    for(let i of notes){
      if(i.type != "settings" && i.type != "style"){
        const _result = await globalState.pocket.collection('notes').update(i.id, i);
      }
    }
  }

  const deleteSettings = () => {
    for(let index = notes.length - 1; index >= 0; index--){
      if(notes[index].type == "settings"){
        notes.splice(index, 1);
      }
    }
  }

  const deleteStyles = () => {
    for(let index = notes.length - 1; index >= 0; index--){
      if(notes[index].type == "style"){
        notes.splice(index, 1);
      }
    }
  }

  const style = async () => {
    await deleteStyles();
    let data = {
      id: 'style',
      type: "style", 
      title: "",
      content: "",
      editing: false,
      image: null,
      list: null,
      x: window.scrollX,
      y: window.scrollY
    };

    await notes.push(data);

    let temp = document.getElementById((notes.length - 1).toString());
    temp.addEventListener('mousedown', mouseDownLogic);
    temp.addEventListener('mouseup', mouseUpLogic);
    selected = notes.length - 1;
  }

  const playTime = (_e, display, audio) => {
    display.style.setProperty('width', `${Math.floor((audio.currentTime / audio.duration) * 100)}%`);
  }

  // what kinda hacky tomfoolery did I get up to here???

  const addAudioListeners = (index) => {
    const display = document.getElementById(`b${index}`);
    const element = document.getElementById(`a${index}`);
    element.addEventListener('ended', (e) => removeAudioListeners(e));
    element.removeEventListener('play', (e) => playSound(index));
    element.addEventListener('pause', (e) => pauseSound(index));
    element.addEventListener('timeupdate', (e) => {
      playTime(e, display, element);
    });
  }

  const removeAudioListeners = (index) => {
    const display = document.getElementById(`b${index}`);
    const element = document.getElementById(`a${index}`);
    element.removeEventListener('ended', (e) => removeAudioListeners(e));
    element.addEventListener('play', (e) => playSound(index));
    element.removeEventListener('pause', (e) => pauseSound(index));
    element.removeEventListener('timeupdate', (e) => {
      playTime(e, display, element);
    });
  }

  const playSound = async (index) => {
    const element = document.getElementById(`a${index}`);
    await addAudioListeners(index);
    notes[index].playing = true;
    // @ts-ignore
    element.play();
  }

  const pauseSound = async (index) => {
    const audio = document.getElementById(`a${index}`);
    await removeAudioListeners(index);
    notes[index].playing = false;
    // @ts-ignore
    audio.pause();
  }

  const back = (index) => {
    const audio = document.getElementById(`a${index}`);
    // @ts-ignore
    audio.currentTime -= 15;
  }

  const forward = (index) => {
    const audio = document.getElementById(`a${index}`);
    // @ts-ignore
    audio.currentTime += 15;
  }


</script>

<div class="viewport">

{#each notes as note(note.id)}
  <div 
    class="note {note.type}Type" id='{notes.indexOf(note).toString()}' 
    style="left: {note.x}px; top: {note.y}px; {selected == notes.indexOf(note) ? "background-color: var(--note-color); z-index: 2;": ""} max-width: {note.type == "image" ? globalState.imageWidth : (note.type == "note" ? globalState.noteWidth : "1000000")}px;"
    transition:scale={{ duration: 500 }}  
  >

    {#if note.editing}
      <textarea
        bind:value={note.title}
        class="title"
        placeholder="Title"
      >
      </textarea>
    {:else}
      <p1 class="title">{note.title}</p1>
    {/if}
    
    {#if note.type == "note"}
      {#if note.editing}
        <textarea
          class="body"
          placeholder="Content"
          bind:value={note.content}
        ></textarea>
      {:else}
        <p1
          class="body"
        >{note.content}</p1>
      {/if}
    {:else if note.type == "image"}
      {#if note.editing}
        <input
          type="file"
          onchange={(event) => handleFileChange(event, notes.indexOf(note))}
          id="uploadTrigger{note.id}"
          style="visibility: hidden; position: fixed;"
        >

      {/if}
      {#if note.image == ""}
        {#if note.uploading}
          <div class="imagePlaceholder" style="flex-direction: row;" >

            <svg class='bigSvg' viewBox="0,0,1340,1340"
              fill='currentColor'
            >
            <!-- Upload -->
              <path d="M0,0M808,171 C808,171,1155,517,1155,517 C1168,530,1184,537,1201,537 C1218,537,1234,530,1247,517 C1260,504,1266,489,1266,471 C1266,454,1259,438,1246,425 C1246,425,790,-31,790,-31 C777,-44,761,-51,743,-51 C724,-51,708,-45,695,-32 C695,-32,690,-26,690,-26 C690,-26,249,421,249,421 C236,434,229,450,229,467 C229,485,236,501,249,514 C262,527,278,534,295,534 C312,534,328,527,341,514 C341,514,676,174,676,174 C676,174,676,941,676,941 C676,960,683,976,696,989 C709,1002,724,1008,742,1008 C761,1008,776,1002,789,989 C802,976,808,960,808,941 C808,941,808,171,808,171Z M1316,1156 C1316,1156,169,1156,169,1156 C150,1156,134,1162,121,1175 C108,1188,101,1204,101,1223 C101,1241,108,1256,121,1269 C134,1282,150,1289,169,1289 C169,1289,1316,1289,1316,1289 C1335,1289,1351,1282,1364,1269 C1377,1256,1383,1241,1383,1222 C1383,1204,1377,1188,1364,1175 C1351,1162,1335,1156,1316,1156Z "/>
            </svg>

          </div>
        {:else}
          <label class="imagePlaceholder hover" style="flex-direction: row;"for="uploadTrigger{note.id}"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
          >+</label>
        {/if}
      {:else}


          {#if get_thumbnail(notes.indexOf(note)).type == "image"}
            <label for="uploadTrigger{note.id}"
              class="imagePlaceholder"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
            >
              <img src="{get_thumbnail(notes.indexOf(note)).data}" class="thumbnailImage" alt="thumbnail" draggable="false"/>
            </label>
          {:else if get_thumbnail(notes.indexOf(note)).type == "audio" && globalState.experimental}
            <label for="uploadTrigger{note.id}"
              class="imagePlaceholder"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
            >

              <audio id="a{notes.indexOf(note)}">
                <source src="{get_thumbnail(notes.indexOf(note)).data}">
              </audio>
              <button id="play{note.id}" style="visibility: hidden; position: fixed;" onclick={() => playSound(notes.indexOf(note))}>Play</button>
              <button id="pause{note.id}" style="visibility: hidden; position: fixed;" onclick={() => pauseSound(notes.indexOf(note))}>Pause</button>
              <button id="back{note.id}" style="visibility: hidden; position: fixed;" onclick={() => back(notes.indexOf(note))}>Back</button>
              <button id="forward{note.id}" style="visibility: hidden; position: fixed;" onclick={() => forward(notes.indexOf(note))}>Forward</button>


                <label for="back{note.id}">
                  <svg fill="currentColor" class="mediumSvg hover" style="cursor: pointer;" viewBox="0 0 1301 1301">
                    <!-- Rewind  -->
                    <path d="M1125.5,650c0-71-13-138-40-201s-64-119-112-167-104-85-167-112c-63-26-130-39-201-39-134,0-250,49-347,146h127c18,0,33,6,46,19s19,28,19,45-6,34-19,47-28,20-46,19H109.5c-18,0-33-6-46-19s-19-28-19-46V72c0-19,6-34,19-47,13-12,28-18,46-18s33,6,46,18c13,13,19,28,19,47v104C295.5,59,439.5,0,604.5,0s173,17,252,50,149,80,209,140,107,129,141,208c33,79,50,163,50,252s-29,227-88,328c-28,49-62,93-101,132-39,40-83,74-131,102-49,29-101,51-156,66s-112,23-171,23c-87,0-169-16-248-48-79-31-151-79-215-143s-19-28-19-46,7-34,20-46c13-11,28-17,46-17s33,6,46,19c102,100,225,150,370,150s140-14,203-42c63-27,119-65,166-114,47-48,83-104,109-167,25-63,38-128,38-197Z"/>
                  </svg>
                </label>
              {#if note.playing}
                <label for="pause{note.id}">
                  <svg fill="currentColor" class="bigSvg hover" style="cursor: pointer" viewBox="0 0 1289 1289">
                    <!-- Pause  -->
                    <path d="M207,1228V65c-1-18,5-33,18-46S253,0,272,0s33,6,46,19c12,13,18,28,18,46l1,1163c0,17-6,32-19,43-13,12-28,18-46,18s-33-6-46-17-19-26-19-44ZM922,1228V65c0-18,6-33,19-46S969,0,988,0s33,6,46,19c12,13,18,28,18,46l1,1163c0,17-6,32-19,43-13,12-28,18-46,18s-34-6-47-17-19-26-19-44Z"/>
                  </svg>
                </label>
              {:else}
                <label for="play{note.id}">
                  <svg fill="currentColor" class="bigSvg hover" style="cursor: pointer" viewBox="0 0 1289 1289">
                    <!-- Play  -->
                    <path d="M7.5,1235V62c0-12,2-21,6-26,5-11,13-20,23-26C46.5,3,57.5,0,68.5,0s19,2,30,7l1150,574c12,5,22,13,29,24,7,10,10,22,10,35s-3,25-10,36-17,19-30,24L98.5,1290c-7,3-14,5-21,5-11,0-23-3-36-10-22-11-33-28-34-50ZM1079.5,643L121.5,161v972l958-490Z"/>
                  </svg>
                </label>
              {/if}

                <label for="forward{note.id}">
                  <svg fill="currentColor" class="mediumSvg hover" style="cursor: pointer;" viewBox="0 0 1301 1301">
                    <!-- Forward -->
                    <path d="M174.9,650c0-71,13-138,40-201,27-63,64.1-119,112.1-167,48.1-48,104.1-85,167.2-112,63.1-26,130.2-39,201.2-39,134.2,0,250.3,49,347.4,146h-127.2c-18,0-33,6-46.1,19s-19,28-19,45,6,34,19,47,28,20,46.1,19h276.3c18,0,33-6,46.1-19s19-28,19-46V72c0-19-6-34-19-47-13-12-28-18-46.1-18s-33,6-46.1,18c-13,13-19,28-19,47v104C1005.9,59,861.8,0,696.6,0s-173.2,17-252.3,50-149.2,80-209.3,140c-60.1,60-107.1,129-141.2,208-33,79-50.1,163-50.1,252s29,227,88.1,328c28,49,62.1,93,101.1,132,39,40,83.1,74,131.2,102,49.1,29,101.1,51,156.2,66s112.1,23,171.2,23c87.1,0,169.2-16,248.3-48,79.1-31,151.2-79,215.3-143s19-28,19-46-7-34-20-46c-13-11-28-17-46.1-17s-33,6-46.1,19c-102.1,100-225.3,150-370.5,150s-140.2-14-203.2-42c-63.1-27-119.1-65-166.2-114-47.1-48-83.1-104-109.1-167-25-63-38-128-38-197Z"/>
                  </svg>
                </label>
              <div class="playbarContainer">
                <div class="playbar" id="b{notes.indexOf(note)}">
                </div>
              </div>


            </label>
            <p1
              class="body"
            >{note.image}</p1>
          {:else}
            <label for="uploadTrigger{note.id}"
              class="imagePlaceholder"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
            >
            <svg class="bigSvg" viewBox="0 0 1461 1461" fill="currentColor"
            >
              <!-- File -->
              <path d="M187,65v1332c0,19,7,35,22,48l8,6,3,2c8,4,17,7,26,8h1061c17-1,32-8,44-21,11-12,17-26,17-43v-884c0-17-6-32-18-45-4-5-8-9-13-13L904,27c-9-9-19-17-30-22-4-1-7-2-7-2l-12-3H251c-18,0-33,6-45,18s-19,28-19,47ZM799,553c9,11,20,19,33,23l12,2h394v753l-921,1V129l468,1v384c0,15,5,28,14,39ZM920,228l217,215h-217v-215Z"/>
            </svg>
            </label>
            <p1
              class="body"
            >{note.image}</p1>
          {/if}

      {/if}

    {:else if note.type == "list"}
        {#each note.todo.items as _item, i}
          {#if typeof(note.todo.values[i]) == "boolean"}

            <span class="inline">
              <button class="toggleTodo" id="{note.id}choice{i}" onclick={() => {note.todo.values[i] = !note.todo.values[i]; updateNote()}}>Toggle</button>
              <div class="todoBorder">
                <label for="{note.id}choice{i}" class="todoButton" style="{note.todo.values[i] ? "background-color: var(--main-color)" : ""}"></label>
              </div>

              {#if note.editing}
                <textarea 
                  class="body"
                  bind:value={note.todo.items[i]}
                ></textarea>
                <button class="inlineButton hover" onclick="{() => {
                  note.todo.items.splice(i, 1);
                  note.todo.values.splice(i, 1);
                }}">
                  <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1302 1302">
                    <!-- xCircle -->
                    <path d="M822.5,22C766.5,7,708.5,0,649.5,0s-117,7-172,22c-56,15-108,37-157,66-48,29-92,63-131,102-39,40-73,84-101,132C29.5,423,.5,533,.5,651s29,227,88,328c28,49,62,93,101,132,39,40,83,74,131,102,49,29,101,51,157,66s113,23,172,23,116-8,172-23,108-37,157-66c48-28,92-62,132-102s74-84,102-132c59-102,89-211,89-328s-30-226-89-329c-28-48-62-92-102-132-40-39-84-73-132-102-49-29-101-51-156-66ZM448.5,171c63-26,131-39,202-39s116,9,171,28,104,46,149,81L243.5,968l-3,4c-35-45-62-94-81-149-19-54-28-111-28-172s13-138,40-201,64-119,111-167,103-85,166-112ZM333.5,1064l729-729c35,45,61,94,80,147,19,54,28,110,28,169s-13,138-40,201-64,119-112,167-104,85-167,112-130,40-201,40-116-9-169-28c-54-18-103-44-148-79Z"/>
                  </svg>
                </button>
                <button class="inlineButton hover" onclick={() => {
                  note.todo.values[i] = {
                    "items": [
                      ""
                    ],
                    "values": [
                      false
                    ]
                  }

                }}>

                  <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1293 1293">
                    <!-- Plus  -->
                    <path d="M708,581.5V66.5c0-19-6-34-19-47S660,.5,642,.5s-34,6-47,19-20,29-20,47v515H66c-19,0-34,7-47,20S0,630.5,0,649.5s7,32,20,45,28,20,46,20h509v512c0,19,7,34,20,47s28,19,47,19,34-7,47-20,19-28,19-46v-512h518c19,0,35-6,48-19s19-28,19-46-6-35-19-48-29-20-48-20h-518Z"/>
                  </svg>

                </button>
              {:else}
                <p1
                  class="body"
                >{note.todo.items[i]}</p1>
              {/if}
            </span>
          {:else}
            <span class="inline">
              <div class="todoBorder">
                <label for="{note.id}choice{i}" class="todoButton" style="{isComplete(note.todo.values[i].values) ? "background-color: var(--main-color)" : ""}"></label>
              </div>

              {#if note.editing}
                <textarea
                  class="body"
                  bind:value={note.todo.items[i]}
                ></textarea>
                <button class="inlineButton hover" onclick="{() => {
                  note.todo.items.splice(i, 1);
                  note.todo.values.splice(i, 1);
                }}">
                  <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1302 1302">
                    <!-- xCircle -->
                    <path d="M822.5,22C766.5,7,708.5,0,649.5,0s-117,7-172,22c-56,15-108,37-157,66-48,29-92,63-131,102-39,40-73,84-101,132C29.5,423,.5,533,.5,651s29,227,88,328c28,49,62,93,101,132,39,40,83,74,131,102,49,29,101,51,157,66s113,23,172,23,116-8,172-23,108-37,157-66c48-28,92-62,132-102s74-84,102-132c59-102,89-211,89-328s-30-226-89-329c-28-48-62-92-102-132-40-39-84-73-132-102-49-29-101-51-156-66ZM448.5,171c63-26,131-39,202-39s116,9,171,28,104,46,149,81L243.5,968l-3,4c-35-45-62-94-81-149-19-54-28-111-28-172s13-138,40-201,64-119,111-167,103-85,166-112ZM333.5,1064l729-729c35,45,61,94,80,147,19,54,28,110,28,169s-13,138-40,201-64,119-112,167-104,85-167,112-130,40-201,40-116-9-169-28c-54-18-103-44-148-79Z"/>
                  </svg>
                </button>
                <button class="inlineButton hover" onclick={async () => {
                  note.todo.values[i].items.push("");
                  note.todo.values[i].values.push(false);
                }}>
                
                  <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1293 1293">
                    <!-- Plus  -->
                    <path d="M708,581.5V66.5c0-19-6-34-19-47S660,.5,642,.5s-34,6-47,19-20,29-20,47v515H66c-19,0-34,7-47,20S0,630.5,0,649.5s7,32,20,45,28,20,46,20h509v512c0,19,7,34,20,47s28,19,47,19,34-7,47-20,19-28,19-46v-512h518c19,0,35-6,48-19s19-28,19-46-6-35-19-48-29-20-48-20h-518Z"/>
                  </svg>
              
                </button>
              {:else}
                <p1
                  class="body"
                >{note.todo.items[i]}</p1>
              {/if}
            </span>
            {#each note.todo.values[i].items as _subItem, index}
              <span class="inline">
                <p1 class="body">{' '}</p1>
                <button class="toggleTodo" id="{note.id}choice{i}sub{index}" onclick={() => {note.todo.values[i].values[index] = !note.todo.values[i].values[index]; updateNote()}}>Toggle</button>
                <div class="todoBorder">
                  <label for="{note.id}choice{i}sub{index}" class="todoButton" style="{note.todo.values[i].values[index] ? "background-color: var(--main-color)" : ""}"></label>
                </div>

                {#if note.editing}
                  <textarea
                    class="body"
                    bind:value={note.todo.values[i].items[index]}
                  ></textarea>
                  <button class="inlineButton hover" onclick="{() => {
                    note.todo.values[i].items.splice(index, 1);
                    note.todo.values[i].values.splice(index, 1);
                    if(note.todo.values[i].items.length == 0){
                      note.todo.values[i] = false;
                    }
                  }}">
                  
                    <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1302 1302">
                      <!-- xCircle -->
                      <path d="M822.5,22C766.5,7,708.5,0,649.5,0s-117,7-172,22c-56,15-108,37-157,66-48,29-92,63-131,102-39,40-73,84-101,132C29.5,423,.5,533,.5,651s29,227,88,328c28,49,62,93,101,132,39,40,83,74,131,102,49,29,101,51,157,66s113,23,172,23,116-8,172-23,108-37,157-66c48-28,92-62,132-102s74-84,102-132c59-102,89-211,89-328s-30-226-89-329c-28-48-62-92-102-132-40-39-84-73-132-102-49-29-101-51-156-66ZM448.5,171c63-26,131-39,202-39s116,9,171,28,104,46,149,81L243.5,968l-3,4c-35-45-62-94-81-149-19-54-28-111-28-172s13-138,40-201,64-119,111-167,103-85,166-112ZM333.5,1064l729-729c35,45,61,94,80,147,19,54,28,110,28,169s-13,138-40,201-64,119-112,167-104,85-167,112-130,40-201,40-116-9-169-28c-54-18-103-44-148-79Z"/>
                    </svg>

                  </button>
                {:else}
                  <p1
                    class="body"
                  >{note.todo.values[i].items[index]}</p1>
                {/if}
              </span>
            {/each}
          {/if}
        {/each}
        {#if note.editing}
          <button class="inlineButton hover" onclick={async () => {
            note.todo.items.push("");
            note.todo.values.push(false);
          }}>
          
            <svg class="inlineSvg" fill="currentColor" viewBox="0 0 1293 1293">
              <!-- Plus  -->
              <path d="M708,581.5V66.5c0-19-6-34-19-47S660,.5,642,.5s-34,6-47,19-20,29-20,47v515H66c-19,0-34,7-47,20S0,630.5,0,649.5s7,32,20,45,28,20,46,20h509v512c0,19,7,34,20,47s28,19,47,19,34-7,47-20,19-28,19-46v-512h518c19,0,35-6,48-19s19-28,19-46-6-35-19-48-29-20-48-20h-518Z"/>
            </svg>
          
          </button>
        {/if}
    {:else if note.type == "settings"}

      <span class="inline">
        <p1 class="title">Max Note Width</p1>
      </span>
        
      <span class="inline">
        <textarea
            class="body"
            bind:value={globalState.noteWidth}
        ></textarea>
        <p1 class="body" style="color: #5f5f5f">px</p1>
      </span>

      <span class="inline">
        <p1 class="title">Max Image Width</p1>
      </span>
        
      <span class="inline">
        <textarea
            class="body"
            bind:value={globalState.imageWidth}
        ></textarea>
        <p1 class="body" style="color: #5f5f5f">px</p1>
      </span>

      <span class="inline">
        <p1 class="title">Cleanup Gap</p1>
      </span>
        
      <span class="inline">
        <textarea
            class="body"
            bind:value={globalState.gap}
        ></textarea>
        <p1 class="body" style="color: #5f5f5f">px</p1>
      </span>

      <span class="inline">
        <p1 class="title">Experimental Features</p1>
      </span>
        
      <span class="inline">
        <button class="toggleTodo" id="experiment" onclick={() => {globalState.experimental = !globalState.experimental}}>Toggle</button>
        <div class="todoBorder">
          <label for="experiment" class="todoButton" style="{globalState.experimental ? "background-color: var(--main-color)" : ""}"></label>
        </div>
        {#if globalState.experimental}
          <p1 class="body" style="color: #5f5f5f">Enabled</p1>
        {:else}
          <p1 class="body" style="color: #5f5f5f">Disabled</p1>
        {/if}
      </span>

      <span class="inline">
        <p1 class="title">Note Server</p1>
      </span>
        
      <span class="inline">
        
        <textarea
            class="body"
            bind:value={globalState.url}
        ></textarea>
      </span>
      
    {:else if note.type == "style"}

      <span class="inline">
        <p1 class="title">Main Color</p1>
      </span>

      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.mainColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.mainColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Secondary Color</p1>
      </span>

      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.hoverColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.hoverColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Background Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.backgroundColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.backgroundColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Dot Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.dotColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.dotColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Title Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.titleColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.titleColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Text Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.textColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.textColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Active Node Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
        <textarea
            class="body"
            bind:value={globalState.activeColor}
        ></textarea>
        <div class="example" style="background-color: #{globalState.activeColor}">

        </div>
      </span>

      <span class="inline">
        <p1 class="title">Inactive Node Color</p1>
      </span>
        
      <span class="inline">
        <p1 class="body" style="color: #5f5f5f">#</p1>
          <textarea
              class="body"
              bind:value={globalState.inactiveColor}
          ></textarea>
          <div class="example" style="background-color: #{globalState.inactiveColor}">
        </div>
      </span>

      <span class="inline">
        <p1 class="title">Blur Radius</p1>
      </span>
        
      <span class="inline">
        <textarea
          class="body"
          bind:value={globalState.blurRadius}
        ></textarea>
        <p1 class="body" style="color: #5f5f5f">px</p1>
      </span>

      <span class="inline">
        <p1 class="title">Select Theme</p1>
      </span>

      <div class="themeContainer">
        {#each themes as theme}
          <div class="inline">
            <button class="body themeSelector" onclick={() => loadTheme(themes[themes.indexOf(theme)])} style="{globalState.themeName == theme.name ? "color: var(--main-color)" : ""}">{theme.name}</button>
            <div class="styleExample" style="background-color: #{theme.mainColor}; border: 2px solid #{theme.textColor} !important;"></div>
            <div class="styleExample" style="background-color: #{theme.hoverColor}; border: 2px solid #{theme.textColor} !important;"></div>
            <div class="styleExample" style="background-color: #{theme.activeColor}; border: 2px solid #{theme.textColor} !important;"></div>
            <div class="styleExample" style="background-color: #{theme.backgroundColor}; border: 2px solid #{theme.textColor} !important;"></div>
          </div>
        {/each}
      </div>

      {#if isCustom}

      <span class="inline">
        <p1 class="title">Custom Theme</p1>
      </span>
      <textarea
        class="body"
        bind:value={globalState.themeName}
      >
      </textarea>

      {/if}

    {/if}

    <span class="controlBar">
      {#if note.type != "settings" && note.type != "style"}
        <button onclick={() => edit(notes.indexOf(note))} class="controlButton" style="{note.editing ? "color: var(--main-color);" : ""}">
          <svg class="controlSvg" fill="currentColor" viewBox="0 0 2589 2589">
            <!-- Edit  -->
            <path d="M1629,239l93.5,91.6c10.8,10.8,23.4,16.2,36,16.2s28.8-5.4,43.2-18c52.1-52.1,97.1-77.3,134.8-77.3s64.7,16.2,97.1,46.7l253.5,253.3c32.4,32.3,48.5,64.7,48.5,98.8s-7.2,43.1-19.8,62.9c-12.6,19.8-32.4,43.1-59.3,70.1-10.8,12.6-16.2,27-16.2,39.5s5.4,25.2,16.2,35.9l93.5,93.4c7.2,9,18,12.6,34.2,12.6s28.8-5.4,37.8-16.2c88.1-88,142-172.5,158.2-253.3,16.2-80.9,5.4-35.9,5.4-55.7,0-73.7-32.4-145.5-98.9-215.6l-3.6-3.6-312.8-314.4-12.6-10.8C2089.2,32.3,2019.1,0,1945.4,0s-32.4,1.8-59.3,7.2c-86.3,21.6-169,73.7-248.1,156.3-12.6,12.6-19.8,28.7-19.8,44.9s3.6,21.6,10.8,30.5ZM2220.5,975.6l-604.1-607.3-3.6-3.6-3.6-3.6c-19.8-21.6-44.9-32.3-77.3-32.3s-64.7,10.8-88.1,34.1L39.6,1766.1s-7.2,9-18,23.4c-12.6,19.8-19.8,43.1-19.8,66.5l-1.8,628.8c0,23.4,5.4,43.1,18,59.3,12.6,16.2,28.8,28.7,50.3,35.9l10.8,3.6c12.6,3.6,27,5.4,39.6,5.4s9,0,12.6-1.8h10.8l596.9,1.8c39.6,0,71.9-14.4,95.3-44.9l1395.2-1392.4c23.4-23.4,36-50.3,36-80.9s-1.8-23.4-5.4-35.9c-1.8-16.2-10.8-32.3-25.2-46.7l-3.6-3.6-10.8-9h0ZM917,2127.3l-447.7-458.2L1526.5,612.7l454.9,452.8-1064.4,1061.8ZM231.9,1906.3l62.9-62.9,454.9,451-62.9,62.9-453.1-1.8-1.8-449.2Z"/>
          </svg>
        </button>
      {/if}

      {#if note.type == "note" || note.type == "list"}
        <button onclick={() => copy(notes.indexOf(note))} class="controlButton">

          <svg class="controlSvg" fill="currentColor" viewBox="0 0 1803 1803">
            <!-- Copy -->
            <path d="M1800,1004V299c0-39-7-77-22-113s-36-68-63-95-58-49-93-65c-36-15-74-24-114-25l-3-1h-698c-4,0-8,1-8,1l-1-1c-39,0-77,7-113,22s-68,36-95,63-49,58-65,93c-16,36-25,74-26,114v711c0,40,8,78,23,114s35,68,62,95,58,49,94,65c35,16,73,24,113,25,0,0,3,1,7,1h694c2,0,4-1,4-1h3l1,1c40,0,78-8,114-23s68-35,95-62c27-26,49-57,65-93,15-35,24-73,25-113,0,0,1-4,1-8ZM1304,1504v-705c0-39-7-77-22-113s-36-68-63-95-58-49-93-65c-36-15-74-24-114-25l-3-1H311c-4,0-8,1-8,1l-1-1c-39,0-77,7-113,22s-68,36-95,63-49,58-65,93c-16,36-25,74-26,114v711c0,40,8,78,23,114s35,68,62,95,58,49,94,65c35,16,73,24,113,25,0,0,3,1,7,1h694c2,0,4-1,4-1h3l1,1c40,0,78-8,114-23s68-35,95-62c27-26,49-57,65-93,15-35,24-73,25-113,0,0,1-4,1-8ZM996,1672H288c-22-1-43-5-63-14s-37-21-52-37-26-34-35-55c-9-20-13-41-13-63v-709c1-22,6-43,15-64,9-20,21-37,37-52s34-26,54-35,41-13,63-13h703c22,0,43,4,64,13s39,21,55,37,28,34,37,55,13,42,13,64v705c0,23-4,45-13,65s-21,38-37,53-34,27-55,36-42,14-65,14ZM1500,1172h-708c-22-1-43-5-63-14s-37-21-52-37-26-34-35-55c-9-20-13-41-13-63V294c1-22,6-43,15-64,9-20,21-37,37-52s34-26,54-35,41-13,63-13h703c22,0,43,4,64,13s39,21,55,37,28,34,37,55,13,42,13,64v705c0,23-4,45-13,65s-21,38-37,53-34,27-55,36-42,14-65,14Z"/>
          </svg>

        </button>
      {:else if note.type == "image"}
        <button onclick={() => window.location.href=download(notes.indexOf(note))} class="controlButton">

          <svg class="controlSvg" viewBox="0 0 1356 1356" fill="currentColor">
            <!-- Download  -->
            <path d="M611,903l-335-341c-13-13-29-20-46-20s-33,7-46,20-20,29-20,46,7,33,21,47l440,446,6,7c7,8,17,14,29,17l10,2c21,2,40-5,55-21l457-455c13-13,20-29,20-47s-6-33-19-46-29-20-46-20-34,7-47,20l-347,347V67c0-19-6-35-19-48S696,0,677,0s-33,6-46,19-20,29-20,48v836ZM1252,1224H104c-19,0-35,6-48,19s-19,28-19,47,6,33,19,46,29,20,48,20h1148c19,0,35-7,48-20s19-28,19-46-6-34-19-47-29-19-48-19Z"/>
          </svg>

        </button>
      {/if}
      {#if note.type != "settings" && note.type != "style"}
        <button onclick={() => deleteNote(notes.indexOf(note))} class="controlButton">

          <svg class="controlSvg" fill="currentColor" viewBox="0 0 1480 1480">
            <!-- Trash -->
            <path d="M1225,582h57c19,0,34-6,47-19s19-28,19-47h1v-89c0-58-18-105-53-140s-88-57-150-58h-161c-1-31-8-61-21-89s-30-52-51-73c-22-21-47-38-75-50-29-11-59-17-90-17v3l-3-2-2-1c-31,0-61,6-89,17-29,12-54,28-76,49s-39,45-51,73c-13,29-19,59-20,90h-167c-64,0-115,19-154,56-37,37-55,84-55,142v89h1c0,19,7,34,20,47s28,19,47,19h55l59,654c9,87,35,150,80,189,22,19,49,33,81,42,31,9,68,13,111,13h316c43,0,80-4,111-13s57-23,78-42c43-39,69-102,77-189l58-654ZM749,112v1c34,0,62,11,83,34,21,22,32,49,33,82h-238c1-33,12-60,33-83,21-22,49-33,83-33h2l2-1h2ZM337,360h803c52,0,78,21,78,64v28H262v-28c0-42,25-63,75-64ZM906,1350h-329c-21,0-38-2-53-5s-28-9-39-17c-23-16-37-47-42-92l-59-653h711l-58,653c-5,46-18,77-40,93s-23,13-37,16c-15,3-33,5-54,5Z"/>
          </svg>

        </button>      
      {:else}
        <button onclick={saveSettings} class="controlButton">

          <svg viewBox="0 0 1461 1461" class="controlSvg" fill="currentColor">
            <!-- File -->
            <path d="M187,65v1332c0,19,7,35,22,48l8,6,3,2c8,4,17,7,26,8h1061c17-1,32-8,44-21,11-12,17-26,17-43v-884c0-17-6-32-18-45-4-5-8-9-13-13L904,27c-9-9-19-17-30-22-4-1-7-2-7-2l-12-3H251c-18,0-33,6-45,18s-19,28-19,47ZM799,553c9,11,20,19,33,23l12,2h394v753l-921,1V129l468,1v384c0,15,5,28,14,39ZM920,228l217,215h-217v-215Z"/>
          </svg>

        </button>
        <button onclick={clearSettings} class="controlButton">

            <svg viewBox="0 0 1382 1382"
              width="20"
            >
              <!-- Refresh -->
              <path fill="currentColor" d="M1080.5,320l-103-2c-19,0-34,6-46,19-13,13-19,28-19,46s6,34,19,47c12,13,28,19,47,18l270,5h7c18-1,33-8,45-21,11-12,17-27,17-45v-3l1-267c0-19-6-35-19-48-13-12-28-18-47-19-18,0-33,6-45,18s-19,29-19,48l-1,118c-60-72-133-129-219-171C879.5,21,787.5,0,692.5,0s-155,13-229,39c-75,26-142,63-201,112-62,50-112,109-151,178s-64,146-74,229l-2,8c-1,3-1,7-1,13,0,19,7,35,21,47,14,13,30,19,48,19s27-4,38-13c11-8,19-20,24-37,7-65,24-125,53-182s67-106,114-149c47-42,101-75,163-98,61-23,127-35,197-35s149,18,218,54c61,31,117,76,170,135ZM300.5,1062l104,2c19-1,34-7,47-20s18-27,18-46c-1-19-7-34-19-47-12-12-28-18-47-18l-262-4s-5-1-11-1c-18,1-33,7-46,19s-19,27-20,45v4l-1,269c-1,19,6,35,19,47,13,13,29,19,48,19s33-6,45-19,18-28,18-47v-116c60,72,133,129,220,170,88,42,180,63,275,63s154-13,229-40c75-26,142-63,202-112,61-49,112-109,151-178s64-146,74-229l1-8c1-7,2-11,2-14,0-19-7-34-21-47-15-12-31-18-49-18s-27,4-38,12c-11,9-19,22-24,39-7,67-25,129-54,186s-66,106-113,147-101,73-162,96-127,34-198,34-147-18-217-54c-61-31-118-76-171-134Z"/>
            </svg>

        </button>
        {#if note.type == "settings"}

          <button onclick={deleteSettings} class="controlButton">

            <svg class="controlSvg" fill="currentColor" viewBox="0 0 1480 1480">
              <!-- Trash -->
              <path d="M1225,582h57c19,0,34-6,47-19s19-28,19-47h1v-89c0-58-18-105-53-140s-88-57-150-58h-161c-1-31-8-61-21-89s-30-52-51-73c-22-21-47-38-75-50-29-11-59-17-90-17v3l-3-2-2-1c-31,0-61,6-89,17-29,12-54,28-76,49s-39,45-51,73c-13,29-19,59-20,90h-167c-64,0-115,19-154,56-37,37-55,84-55,142v89h1c0,19,7,34,20,47s28,19,47,19h55l59,654c9,87,35,150,80,189,22,19,49,33,81,42,31,9,68,13,111,13h316c43,0,80-4,111-13s57-23,78-42c43-39,69-102,77-189l58-654ZM749,112v1c34,0,62,11,83,34,21,22,32,49,33,82h-238c1-33,12-60,33-83,21-22,49-33,83-33h2l2-1h2ZM337,360h803c52,0,78,21,78,64v28H262v-28c0-42,25-63,75-64ZM906,1350h-329c-21,0-38-2-53-5s-28-9-39-17c-23-16-37-47-42-92l-59-653h711l-58,653c-5,46-18,77-40,93s-23,13-37,16c-15,3-33,5-54,5Z"/>
            </svg>

          </button>

        {:else}
          <button onclick={deleteStyles} class="controlButton">

            <svg class="controlSvg" fill="currentColor" viewBox="0 0 1480 1480">
              <!-- Trash -->
              <path d="M1225,582h57c19,0,34-6,47-19s19-28,19-47h1v-89c0-58-18-105-53-140s-88-57-150-58h-161c-1-31-8-61-21-89s-30-52-51-73c-22-21-47-38-75-50-29-11-59-17-90-17v3l-3-2-2-1c-31,0-61,6-89,17-29,12-54,28-76,49s-39,45-51,73c-13,29-19,59-20,90h-167c-64,0-115,19-154,56-37,37-55,84-55,142v89h1c0,19,7,34,20,47s28,19,47,19h55l59,654c9,87,35,150,80,189,22,19,49,33,81,42,31,9,68,13,111,13h316c43,0,80-4,111-13s57-23,78-42c43-39,69-102,77-189l58-654ZM749,112v1c34,0,62,11,83,34,21,22,32,49,33,82h-238c1-33,12-60,33-83,21-22,49-33,83-33h2l2-1h2ZM337,360h803c52,0,78,21,78,64v28H262v-28c0-42,25-63,75-64ZM906,1350h-329c-21,0-38-2-53-5s-28-9-39-17c-23-16-37-47-42-92l-59-653h711l-58,653c-5,46-18,77-40,93s-23,13-37,16c-15,3-33,5-54,5Z"/>
            </svg>

          </button>
        {/if}
      {/if}

      <div class="mover controlButton" id="b-{notes.indexOf(note)}">
        <svg fill="currentColor" viewBox="0 0 1487 1487" class="inlineSvg">
          <!-- dragIcon -->
          <path d="M1291,547c27,0,52,5,76,15,23,10,44,24,63,43,18,19,32,40,42,64,10,23,15,48,15,74s-5,52-15,76-24,45-42,64c-19,18-40,32-63,42-24,10-49,15-76,15s-51-5-75-15c-25-10-46-24-64-42s-33-40-43-63c-10-24-15-50-15-77s5-51,16-75c10-24,24-45,42-63s39-32,64-42c24-11,49-16,75-16ZM1291,676c-19,0-35,7-48,20s-19,28-19,47,6,35,19,48,29,19,48,19,35-6,48-19,19-29,19-48-6-34-19-47-29-20-48-20ZM745,547c27,0,52,5,76,15,23,10,44,24,63,43s32,39,42,63c9,24,14,49,14,75s-5,53-14,77c-10,24-24,45-42,63-19,18-40,32-63,42-24,10-49,15-76,15s-52-5-76-15-45-24-64-42c-19-19-33-40-43-63-10-24-15-50-15-77s5-51,16-75c10-24,24-45,42-63s40-33,64-43c23-10,49-15,76-15ZM744,676c-19,0-34,7-47,20s-20,28-20,47,7,35,20,48,28,19,47,19,35-6,48-19,20-29,20-48-7-34-20-47-29-20-48-20ZM198,547c27,0,52,5,76,15,23,10,44,24,63,43s32,39,42,63c9,24,14,49,14,75s-5,53-14,77c-10,24-24,45-42,63-19,18-40,32-63,42-24,10-49,15-76,15s-51-5-75-15c-25-10-46-24-64-42s-33-40-43-64c-11-24-16-49-16-76s5-51,16-74c10-24,24-45,43-64s39-32,64-42c24-11,49-16,75-16ZM197,676c-19,0-34,7-47,20s-20,28-20,47,7,35,20,48,28,19,47,19,36-6,49-19,19-29,19-48-6-34-19-47-30-20-49-20Z"/>
        </svg>
      </div>
    </span>
  </div>
{/each}

</div>

<button onclick={toggleMenu} class="menuButton" style='z-index: 5; {menuToggle ? "transform: rotate(180deg); color: var(--main-color);" : ""}'>

<svg fill="currentColor" viewBox="0 0 1283 1283">
  <!-- downArrow  -->
  <path d="M1170,589l-469,470V67c0-19-6-35-19-48S653,0,635,0s-34,6-47,19-19,29-19,48v993L113,605c-13-13-29-20-46-20s-33,6-46,19-20,29-20,47,7,34,20,47l566,564,1,1c13,13,29,20,46,20s22-3,34-10c5-3,10-7,13-10l580-580c14-14,21-30,21-48s-7-33-20-46c-15-13-30-20-47-20s-32,7-45,20Z"/>
</svg>

</button>
<button onclick={add} class="menuButton" style='{menuToggle ? "transform: translateY(min(9vw, 9vh));" : ""}'>

  <svg fill="currentColor" viewBox="0 0 1293 1293">
    <!-- Plus  -->
    <path d="M708,581.5V66.5c0-19-6-34-19-47S660,.5,642,.5s-34,6-47,19-20,29-20,47v515H66c-19,0-34,7-47,20S0,630.5,0,649.5s7,32,20,45,28,20,46,20h509v512c0,19,7,34,20,47s28,19,47,19,34-7,47-20,19-28,19-46v-512h518c19,0,35-6,48-19s19-28,19-46-6-35-19-48-29-20-48-20h-518Z"/>
  </svg>

</button>
<button onclick={addImage} class="menuButton" style='{menuToggle ? "transform: translateY(min(18vw, 18vh));" : ""}'>

    <svg viewBox="0 0 1461 1461" fill="currentColor"
    >
      <!-- File -->
      <path d="M187,65v1332c0,19,7,35,22,48l8,6,3,2c8,4,17,7,26,8h1061c17-1,32-8,44-21,11-12,17-26,17-43v-884c0-17-6-32-18-45-4-5-8-9-13-13L904,27c-9-9-19-17-30-22-4-1-7-2-7-2l-12-3H251c-18,0-33,6-45,18s-19,28-19,47ZM799,553c9,11,20,19,33,23l12,2h394v753l-921,1V129l468,1v384c0,15,5,28,14,39ZM920,228l217,215h-217v-215Z"/>
    </svg>

</button>
<button onclick={addTodo} class="menuButton" style='{menuToggle ? "transform: translateY(min(27vw, 27vh));" : ""}'>

  <svg fill="currentColor" viewBox="0 0 1281 1281">
    <!-- Todo  -->
    <path d="M12,192.5C4,209.5,0,228.5,0,247.5s4,37,12,54c7,17,18,32,31,46,13,13,28,24,46,31,17,7,35,11,54,11s39-4,56-11c18-7,34-18,47-31,13-14,23-29,31-46,7-17,11-35,11-54s-4-38-11-55c-8-17-18-32-31-45s-29-23-47-30c-17-7-36-11-56-11s-37,4-54,11c-18,7-33,17-46,30s-24,28-31,45ZM108,283.5c-10-10-15-21-15-35s5-27,15-37,22-14,36-14,27,4,37,14,15,22,15,37-5,25-15,35-22,15-37,15-26-5-36-15ZM430,299.5h799c15,0,28-5,38-15,10-9,14-21,14-35s-4-25-14-35-23-14-38-14H430c-15,0-26,4-36,14s-15,22-15,35,5,25,15,35c10,9,21,15,36,15ZM12,597.5C4,614.5,0,633.5,0,652.5s4,36,12,54c7,17,18,32,31,45,13,14,28,24,46,31,17,8,35,11,54,11s39-3,56-11c18-7,34-17,47-31,13-13,23-28,31-45,7-18,11-36,11-54s-4-38-11-55c-8-18-18-32-31-45-13-12-29-22-47-30-17-6-36-10-56-10s-37,4-54,10c-18,8-33,18-46,30-13,13-24,27-31,45ZM108,688.5c-10-10-15-21-15-36s5-26,15-36c10-9,22-15,36-15s27,6,37,15c10,10,15,22,15,36s-5,26-15,36c-10,9-22,15-37,15s-26-6-36-15ZM430,704.5h799c15,0,28-4,38-14s14-21,14-35-4-26-14-36c-10-9-23-14-38-14H430c-15,0-26,5-36,14-10,10-15,21-15,36s5,24,15,34,21,15,36,15ZM12,1010.5C4,1027.5,0,1046.5,0,1065.5s4,36,12,54c7,17,18,32,31,45,13,14,28,24,46,31,17,8,35,11,54,11s39-3,56-11c18-7,34-17,47-31,13-13,23-28,31-45,7-18,11-36,11-54s-4-38-11-55c-8-18-18-32-31-45-13-12-29-22-47-30-17-6-36-10-56-10s-37,4-54,10c-18,8-33,18-46,30-13,13-24,27-31,45ZM108,1101.5c-10-10-15-21-15-36s5-26,15-36,22-15,36-15,27,5,37,15,15,22,15,36-5,26-15,36c-10,9-22,15-37,15s-26-6-36-15ZM430,1115.5h799c15,0,28-5,38-15s14-21,14-35-4-26-14-36-23-14-38-14H430c-15,0-26,4-36,14s-15,22-15,36,5,25,15,35,21,15,36,15Z"/>
  </svg>

</button>
<button onclick={sort} class="menuButton" style='{menuToggle ? "transform: translateY(min(36vw, 36vh));" : ""}'>

  <svg fill="currentColor" viewBox="0 0 1382 1382">
    <!-- Refresh -->
    <path fill="currentColor" d="M1080.5,320l-103-2c-19,0-34,6-46,19-13,13-19,28-19,46s6,34,19,47c12,13,28,19,47,18l270,5h7c18-1,33-8,45-21,11-12,17-27,17-45v-3l1-267c0-19-6-35-19-48-13-12-28-18-47-19-18,0-33,6-45,18s-19,29-19,48l-1,118c-60-72-133-129-219-171C879.5,21,787.5,0,692.5,0s-155,13-229,39c-75,26-142,63-201,112-62,50-112,109-151,178s-64,146-74,229l-2,8c-1,3-1,7-1,13,0,19,7,35,21,47,14,13,30,19,48,19s27-4,38-13c11-8,19-20,24-37,7-65,24-125,53-182s67-106,114-149c47-42,101-75,163-98,61-23,127-35,197-35s149,18,218,54c61,31,117,76,170,135ZM300.5,1062l104,2c19-1,34-7,47-20s18-27,18-46c-1-19-7-34-19-47-12-12-28-18-47-18l-262-4s-5-1-11-1c-18,1-33,7-46,19s-19,27-20,45v4l-1,269c-1,19,6,35,19,47,13,13,29,19,48,19s33-6,45-19,18-28,18-47v-116c60,72,133,129,220,170,88,42,180,63,275,63s154-13,229-40c75-26,142-63,202-112,61-49,112-109,151-178s64-146,74-229l1-8c1-7,2-11,2-14,0-19-7-34-21-47-15-12-31-18-49-18s-27,4-38,12c-11,9-19,22-24,39-7,67-25,129-54,186s-66,106-113,147-101,73-162,96-127,34-198,34-147-18-217-54c-61-31-118-76-171-134Z"/>
  </svg>

</button>

<button onclick={style} class="menuButton" style='{menuToggle ? "transform: translateY(min(45vw, 45vh));" : ""}'>

  <svg fill="currentColor" viewBox="0 0 1377 1377">
    <!-- Droplet -->
    <path d="M193,870c0-49,6-94,19-135,13-40,29-78,49-114,1-2,2-5,2-5l2-2,2-3,2-4L624,37c1-6,6-13,14-20,7-7,15-11,24-14,7-2,15-3,23-3,13,0,24,2,33,7s16,12,21,19l370,582c5,7,8,13,9,17,20,36,36,74,48,113s18,83,18,132-12,135-37,196c-25,62-59,116-104,162-45,47-98,84-157,110-60,26-124,39-193,39h-9c-69,0-133-13-193-40-60-26-112-62-157-109-45-46-79-100-104-162-25-61-37-127-37-196ZM996,666l-311-496-304,495-2,3c-38,64-57,133-57,206s9,100,27,146c17,46,42,86,75,121s71,62,116,81c44,19,92,29,143,29h10c51,0,99-10,144-29s83-46,116-81,58-75,76-121c17-46,26-95,26-146,0-73-19-140-56-202l-3-6ZM880,880v-13c0-13,5-24,14-32s19-12,31-12,22,4,31,11,13,18,13,32v14c0,41-6,80-19,115-13,36-32,67-56,93-25,27-55,48-90,63s-73,22-116,22h-6c-15,0-26-5-35-15-9-9-13-20-13-32s4-21,12-30c8-8,20-12,35-12h6c28,0,54-5,78-16,24-10,45-24,62-43,17-18,30-40,39-65s14-51,14-80Z"/>
  </svg>

</button>

<button onclick={settings} class="menuButton" style='{menuToggle ? "transform: translateY(min(54vw, 54vh));" : ""}'>

  <svg viewBox="0 0 1361 1361" fill="currentColor">
    <!-- settings  -->
    <path d="M1361.4,584c0-18-7-30-21-37l-3-3c-2,0-4-1-4-1l-106-32-46-98,55-99c4-8,6-15,6-20,0-9-4-18-12-27l-133-133c-9-9-19-13-30-13s-6,0-8,1h-2s-2,1-4,1l-4,2-101,54-100-44-29-104c-7-19-19-28-38-29h-188c-25,0-39,12-43,37l-27,90-113,49-96-53-3-2c-7-5-14-7-21-7s-16,4-25,12c0,0-2,1-4,3l-130,130c-10,10-15,20-15,29s1,8,4,15l2,4,55,102-45,104-103,29c-10,3-17,8-21,13-5,5-7,13-8,23v167c-1,3-1,7,0,10v13c0,25,12,39,37,43l100,31,40,105-53,96c-4,7-6,13-6,20s5,19,15,30l129,130c9,9,19,14,29,14s11-1,14-2l6-3,102-55,105,46,30,104c5,17,15,26,32,28l10,2h184c24,0,38-13,43-38l30-100,105-41,79,43c17,15,32,23,45,24h5c7-2,12-4,14-7l3-3,130-143c9-12,13-23,12-33,1-6,0-11-3-16l-55-101,46-106,86-23,2-1c5-1,9-3,11-4l4-1c10-3,17-7,22-12,4-5,7-14,8-25v-188ZM1118.4,775l-65,171c-1,3-2,8-2,15s1,14,4,18l34,68-39,39-53-29c-4-3-8-5-12-6l-2-1-10-2-2-1c-2-1-5-1-10-1-11,0-25,3-40,10l-166,75c-3,2-7,5-12,10-6,5-9,9-10,14l-24,73h-56l-16-61c-4-13-11-23-20-29-9-9-21-17-36-24l-170-64c-2-1-5-1-10-1h-10c-5,0-10,1-14,3l-67,35-40-39,32-56c6-9,9-20,9-31s-4-30-11-45l-73-165c-8-11-17-20-28-27-11-6-21-8-32-7l-37-12v-55l53-14,10-3c7-2,14-6,22-12,11-9,20-22,27-40l64-172c1-2,1-5,1-10v-9c0-5-1-10-3-14l-35-68,39-39,56,31c9,6,18,9,29,9l15-2,178-68c10-4,18-8,24-12,13-5,21-12,24-22l1-6c4-7,6-16,6-25l9-42h68l11,62c3,11,9,21,18,28,9,9,21,17,35,22l167,64c9,1,15,2,17,2,6,0,11-1,15-3l69-35,39,39-31,55c-6,10-9,20-9,30s1,12,2,15l69,167c6,16,14,29,25,38,11,10,23,15,37,16l48,16v56l-61,16c-15,5-25,12-32,23-8,11-14,21-19,32ZM764.4,476c-27-11-56-16-86-16s-57,5-84,16-50,27-71,47c-21,21-37,44-48,71s-17,55-17,85,6,57,17,84,27,51,48,72c20,21,44,37,71,48,27,12,55,18,84,18s59-6,86-18c27-11,51-27,71-48,20-20,36-44,47-71s17-55,17-85-6-59-17-86-27-50-47-70-44-36-71-47ZM784.4,724c-6,15-14,27-24,37-23,22-50,33-81,33s-30-3-44-9c-15-6-27-14-37-24s-18-22-24-37c-6-14-9-29-9-44,0-31,11-58,33-81,10-10,22-18,37-24,14-6,29-9,44-9,31,0,58,11,81,33,22,23,33,50,33,81s-3,30-9,44Z"/>
  </svg>

</button>

<div 
  id="notifArea" 
  class="notificationArea"
>

</div>


<style>

  .themeContainer {
    width: 100%;
    height: fit-content;
    box-sizing: border-box;
    padding-top: 20px;
    padding-bottom: 20px;
    display: flex;
    flex-wrap: 1;
    flex-direction: column;
    gap: 10px;
  }

  .themeSelector {
    border-radius: 15px;
    min-width: 120px;
    background: none;
    border: none;
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    padding: 5px;
    cursor: pointer;
    transition: color 500ms ease;
  }

  .themeSelector:hover {
    color: var(--main-color);
  }

  .playbarContainer {
    width: 100%;
    background: var(--inactive-color);
    border: 2px solid var(--text-color);
    height: 24px;
    padding: 3px;
    display: flex;
    justify-content: left;
    box-sizing: border-box;
    border-radius: 15px;
  }

  .playbar {
    background-color: var(--main-color);
    display: flex;
    height: 100%;
    border-radius: 15px;
  }

  .example {
    width: 20px;
    height: 20px;
    border: 2px solid var(--text-color);
    box-sizing: border-box;
  }

  .styleExample {
    width: 20px;
    height: 20px;
    border-radius: 100%;
    box-sizing: border-box;
  }

  svg {
    width: 100%;
  }

  .mediumSvg {
    max-width: 36px;
  }

  .bigSvg {
    max-width: 64px;
  }

  .inlineSvg {
    max-width: 20px;
    align-items: center;
    justify-content: center;
    display: flex;
  }

  .controlSvg {
    max-width: 20px;
    align-items: center;
    justify-content: center;
    display: flex;
  }

  .toggleTodo {
    visibility: hidden;
    position: fixed;
  }

  .inlineButton {
    background: none;
    border: none;
    text-align: left;
    padding: 0px;
    width: fit-content;
  }

  .todoButton {
    width: 100%;
    height: 100%;
    border-radius: 100%;
    cursor: pointer;
    transition:
      background-color 500ms
    ;
  }

  .todoBorder {
    width: 20px;
    height: 20px;
    border: 3px solid var(--text-color);
    display: flex;
    box-sizing: border-box;
    border-radius: 100%;
    align-items: center;
    justify-content: center;
  }

  .inline {
    display: flex;
    flex-direction: row;
    gap: 10px;
    width: fit-content;
    height: fit-content;
    align-items: center;
    justify-content: left;
  }

  .imageType {
    gap: 10px;
  }

  .imageType .title {
    align-items: center;
    text-align: center;
    justify-content: center;
  }

  .hover {
    transition: 
      250ms ease
    ;
  }
  p1 {
    white-space: pre-wrap;    
  }

  .thumbnailImage {
    border-radius: 10px;
    width: 100%;
  }


  .hover:hover {
    color: var(--hover-color);
  }

  .imagePlaceholder{
    font-size: 64px;
    justify-content: center;
    align-items: center;
    width: 100%;
    text-align: center;
  }

  .notificationArea {
    display: flex;
    box-sizing: border-box;
    position: fixed;
    width: 20%;
    min-width: 250px;
    height: fit-content;
    top: 0;
    left: 40%;
    flex-direction: column;
    z-index: 10;
    justify-content: center;
    align-items: center;
    padding: 20px;
    gap: 10px;
  }

  .viewport {
    display: flex;
    flex-direction: row;
    padding: 20px;
    position: relative;
    overflow: auto;
    width: 100000px;
    height: 100000px;
    box-sizing: border-box;
  }

  .menuButton {
    position: fixed;
    width: min(7vh, 7vw);
    height: min(7vh, 7vw);
    top: min(2.5vw, 2.5vh);
    right: min(2.5vw, 2.5vh);
    font-size: 64px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    place-items: center;
    text-align: center;
    padding: min(1vw, 1vh);
    line-height: 0px;
    min-width: 64px;
    min-height: 64px;
    border-radius: 100%;
    border: none;
    background-color: var(--note-color);
    transition: 
      color 500ms,
      transform 500ms
    ;
    z-index: 3;
    cursor: pointer;
  }

  .menuButton:hover {
    color: var(--hover-color);
  }

  .controlButton {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    color: var(--text-color);
    cursor: pointer;
    transition:
      color 250ms
    ;
  }

  .controlButton:hover {
    color: var(--hover-color);
  }

  .true {
    color: var(--main-color);
  }

  .controlBar {
    width: 100%;
    height: fit-content;
    display: flex;
    gap: 10px;
    box-sizing: border-box;
    padding-top: 10px;
  }

  .note {
    display: flex;
    scale: 1;
    box-sizing: border-box;
    width: fit-content;
    height: fit-content;
    flex-direction: column;
    background-color: var(--inactive-color);
    padding: 20px;
    border-radius: 20px;
    position: absolute;
    transition: 
      background-color 250ms,
      border-radius 250ms,
      scale 500ms
    ;
    backdrop-filter: blur(var(--blur-radius));
    min-width: 100px;
  }

  .note * {
    user-select: none;
  }

  .body {
    font-size: 20px;
    font-family: monospace;
    line-height: 30px;
    color: var(--text-color);
  }

  .title {
    font-size: 32px;
    font-family: monospace;
    font-weight: bold;
    color: var(--title-color);
    margin: 0;
  }

  textarea {
    field-sizing: content;
    resize: none;
    background: none;
    overflow: hidden;
    outline: none !important;
    border: none !important;
  }

  .viewport {
    background:
      linear-gradient(90deg, var(--bg-color) calc(var(--dot-space) - var(--dot-size)), transparent 1%) center / var(--dot-space) var(--dot-space),
      linear-gradient(var(--bg-color) calc(var(--dot-space) - var(--dot-size)), transparent 1%) center / var(--dot-space) var(--dot-space),
      var(--dot-color)
    ;
  }

</style>



