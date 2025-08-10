<script>
  import { scale } from "svelte/transition";
  import { globalState, refresh_pocket } from "../global.svelte";
  import { onDestroy, onMount } from "svelte";
  // contains objects that have titles, bodies, colors, and x and y coords
  let notes = $state([]);
  let selected = $state(-1);
  let dragging = $state(false);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let snapSize = $state(1);

  $effect(() => {
    changeColor(globalState.mainColor);
    changeDot(globalState.dotColor);
    changeBackground(globalState.backgroundColor);
    changeHighlight(globalState.hoverColor);
  })

  $effect(() => {
    refresh_pocket(globalState.url)
  })

  const changeColor = (color) => {
    document.documentElement.style.setProperty('--main-color', "#" + color);
  }
  const changeDot = (color) => {
    document.documentElement.style.setProperty('--dot-color', "#" + color);
  }
  const changeBackground = (color) => {
    document.documentElement.style.setProperty('--bg-color', "#" + color);
  }
  const changeHighlight= (color) => {
    document.documentElement.style.setProperty('--hover-color', "#" + color);
  }

  const saveSettings = () => {
      const prefs = {
          mainColor: globalState.mainColor,
          dotColor: globalState.dotColor,
          backgroundColor: globalState.backgroundColor,
          noteWidth: globalState.noteWidth,
          imageWidth: globalState.imageWidth,
          url: globalState.url
      }
      localStorage.setItem("settings", JSON.stringify(prefs));
      addNotification("Settings saved!")
  }

  const loadSettings = async () => {
      const settings = JSON.parse(await localStorage.getItem("settings"));
      if(settings == null){
          return;
      }

      globalState.mainColor = settings.mainColor;
      globalState.dotColor = settings.dotColor
      globalState.backgroundColor = settings.backgroundColor;
      globalState.noteWidth = settings.noteWidth;
      globalState.imageWidth = settings.imageWidth;
      globalState.url = settings.url;
  }

  const clearSettings = () => {
    try {
      localStorage.removeItem("settings");
    } catch (E) {
      console.log(E);
    }
    addNotification("Settings cleared! Reload for changes to take effect")
  }

  let dragLogic = (e) => {
    if(dragging){
      notes[selected].x = e.pageX + offsetX;
      notes[selected].y = e.pageY + offsetY;
    }
  }

  let mouseUpLogic = async (e) => {
    if(e.button == 0){
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

      if(notes[selected].type != "settings"){
        const _record = await globalState.pocket.collection('notes').update(notes[selected].id, notes[selected]);
      }
    }

  }

  let mouseDownLogic = async (e) => {
    if(e.button == 0){
      const element = e.currentTarget;
      // @ts-ignore
      selected = parseInt(element.id);
      offsetX = notes[selected].x - e.pageX;
      offsetY = notes[selected].y -  e.pageY;
      dragging = true;
      document.addEventListener('mousemove', dragLogic);
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
          if (action == "create") {
            let thing = record;
            thing.editing = false;
            await notes.push(thing);
            let temp = await document.getElementById((notes.length - 1).toString());
            temp.addEventListener('mousedown', mouseDownLogic);
            temp.addEventListener('mouseup', mouseUpLogic);
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

  const isImage = (ext) => {
    for(let name of [
      "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif",
      "webp", "heif", "heic", "ico", "avif",
      "psd", "ai", "eps", "raw", "cr2", "nef"
    ]){
      if(name == ext){
        return true;
      }
    }
    return false;
  }

  const get_thumbnail = (index) => {
    let ext = notes[index].image.split('.').reverse()[0];
    if(isImage(ext.toLowerCase())){
      return globalState.pocket.files.getURL(notes[index], notes[index].image);
    } else {
      return "null";
    }
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
    if(notes[index].editing){
      let temp = await document.getElementById(index.toString());
      temp.removeEventListener('mousedown', mouseDownLogic);
      temp.removeEventListener('mouseup', mouseUpLogic);
    }
    if(notes[index].editing == false){
      try {
        let temp = await document.getElementById(index.toString());
        temp.addEventListener('mousedown', mouseDownLogic);
        temp.addEventListener('mouseup', mouseUpLogic);
        const _record = await globalState.pocket.collection('notes').update(notes[index].id, notes[index]);
      } catch (Err) {
        console.log("This should be fine")
      }
    }
  }

  const deleteNote = async (index) => {
    await globalState.pocket.collection('notes').delete(notes[index].id);
    notes.splice(index, 1);
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
      x: window.scrollX + window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2
    };

    const record = await globalState.pocket.collection('notes').create(data);

    let temp = document.getElementById((notes.length - 1).toString());
    temp.addEventListener('mousedown', mouseDownLogic);
    temp.addEventListener('mouseup', mouseUpLogic);

    edit(notes.length - 1);
    selected = notes.length - 1;
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
      x: window.scrollX + window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2
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
      color: white;      
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
      x: window.scrollX + window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2
    };

    const record = await globalState.pocket.collection('notes').create(data);

    let temp = document.getElementById((notes.length - 1).toString());
    temp.addEventListener('mousedown', mouseDownLogic);
    temp.addEventListener('mouseup', mouseUpLogic);

    edit(notes.length - 1);
    selected = notes.length - 1;

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
      x: window.scrollX + window.innerWidth / 2,
      y: window.scrollY + window.innerHeight / 2
    };

    const record = await globalState.pocket.collection('notes').create(data);

    let temp = document.getElementById((notes.length - 1).toString());
    temp.addEventListener('mousedown', mouseDownLogic);
    temp.addEventListener('mouseup', mouseUpLogic);

    edit(notes.length - 1);
    selected = notes.length - 1;
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
      low: lowest y coord,
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

  const sort = async () => {
    collisionBounds = [];
    maxY = 0;
    let noteDivs = document.getElementsByClassName('note');
    let totalWidth = 0;
    let totalHeight = 0;
    let sortList = [];
    for(let i of noteDivs){
      sortList.push({
        // @ts-ignore
        area: i.offsetWidth * i.offsetHeight,
        // @ts-ignore
        width: i.offsetWidth,
        // @ts-ignore
        height: i.offsetHeight,
        id: i.id
      });
      // @ts-ignore
      totalWidth += i.offsetWidth;
      // @ts-ignore
      totalHeight += i.offsetHeight;
    }
    let time = Math.round(1000 / sortList.length);
    sortList.sort((a, b) => {
      if(a.height < b.height){
        return 1;
      } else if (a.height > b.height){
        return -1;
      }
      if(a.width < b.width){
        return 1;
      } else if (a.width > b.width){
        return -1;
      }
      return 0;
    });
    let averageHeight = totalHeight / sortList.length;
    let ratio = totalHeight / totalWidth;
    let columns = Math.ceil(Math.sqrt(sortList.length))
    let rows = Math.floor(ratio * columns);
    let estimatedWallHeight = rows * averageHeight;
    console.log(estimatedWallHeight);
    let eclipsedHeight = 0;
    let gap = 10;
    let nextY = gap;
    let count = 0;
    // this places a wall of sorts along the left side of the screen
    for(let i of [...sortList]){
      eclipsedHeight += i.height;
      if(eclipsedHeight >= estimatedWallHeight && count >= 2){
        console.log(eclipsedHeight);
        maxY = nextY - gap;
        break;
      }
      let id = parseInt(i.id);
      notes[id].x = gap;
      notes[id].y = nextY;
      selected = id;
      collisionBounds.push({
        low: nextY - gap,
        high: nextY + i.height + gap,
        x: gap + i.width
      })
      nextY += gap + i.height;   
      sortList.splice(0, 1);
      count++;
      await sleep(time);
      if(count == rows){
        maxY = nextY - gap;
        break;
      }
    }

    // places remaining blocks based on collision bounds
    nextY = gap;
    let coord;
    let newBorders = [];
    for(let i of sortList){
      if(nextY + i.height > maxY){
        for(let i of newBorders){
          collisionBounds.push(i);
        }
        newBorders = [];
        nextY = gap;
      }
      coord = checkCollison(nextY, nextY + i.height);
      let response = checkCollison(coord.y, coord.y + i.height);
      if(response != undefined){
        coord = response;
      }


      let id = parseInt(i.id)
      notes[id].x = coord.x + gap;
      notes[id].y = coord.y;
      selected = id;
      
      newBorders.push({
        low: coord.y - gap,
        high: coord.y + i.height + gap,
        x: coord.x + gap + i.width
      })
      nextY = coord.y + i.height + gap;
      await sleep(time);
    }
    for(let i of notes){
      const _result = await globalState.pocket.collection('notes').update(i.id, i);
    }
  }

  const deleteSettings = () => {
    for(let index = notes.length - 1; index >= 0; index--){
      if(notes[index].type == "settings"){
        notes.splice(index, 1);
      }
    }
  }

</script>

<div class="viewport">

{#each notes as note (note.id)}
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
      <textarea
        bind:value={note.title}
        class="title"
        readonly
      >
      </textarea>
    {/if}
    
    {#if note.type == "note"}
      {#if note.editing}
        <textarea
          bind:value={note.content}
          class="body"
          placeholder="Content"
        ></textarea>
      {:else}
        <textarea
          bind:value={note.content}
          class="body"
          readonly
        ></textarea>
      {/if} 
    {:else if note.type == "image"}
      {#if note.editing}
        <input
          type="file"
          onchange={(event) => handleFileChange(event, notes.indexOf(note))}
          id="uploadTrigger"
          style="visibility: hidden; position: fixed;"
        >

      {/if}
      {#if note.image == ""}
        {#if note.uploading}
          <div class="imagePlaceholder icon" style="flex-direction: row;" >y</div>
        {:else}
          <label class="imagePlaceholder hover" style="flex-direction: row;"for="uploadTrigger"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
          >+</label>
        {/if}
      {:else}



          {#if get_thumbnail(notes.indexOf(note)) == "null"}
            <label for="uploadTrigger"
              class="imagePlaceholder icon"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
            >
            N
            </label>
            <textarea
              class="body"
              placeholder="Content"
              readonly
            >{note.image}</textarea>
          {:else}
            <label for="uploadTrigger"
              class="imagePlaceholder"
              ondrop={(e) => handleFileChange(e, notes.indexOf(note))}
              ondragover={(e) => e.preventDefault()}
            >
              <img src="{get_thumbnail(notes.indexOf(note))}" class="thumbnailImage" alt="thumbnail" draggable="false"/>
            </label>
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
                  placeholder="Name"
                >
                </textarea>
                <button class="icon inlineButton hover" onclick="{() => {
                  note.todo.items.splice(i, 1);
                  note.todo.values.splice(i, 1);
                }}">1</button>
                <button class="icon inlineButton hover" onclick={() => {
                  note.todo.values[i] = {
                    "items": [
                      ""
                    ],
                    "values": [
                      false
                    ]
                  }

                }}>*</button>
              {:else}
                <textarea 
                  class="body"
                  readonly
                  bind:value={note.todo.items[i]}
                >
                </textarea>
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
                  placeholder="Name"
                ></textarea>
                <button class="icon inlineButton hover" onclick="{() => {
                  note.todo.items.splice(i, 1);
                  note.todo.values.splice(i, 1);
                }}">1</button>
                <button class="icon inlineButton hover" onclick={async () => {
                  note.todo.values[i].items.push("");
                  note.todo.values[i].values.push(false);
                }}>*</button>
              {:else}
                <textarea
                  class="body"
                  readonly
                  bind:value={note.todo.items[i]}
                ></textarea>
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
                    placeholder="Name"
                  ></textarea>
                  <button class="icon inlineButton hover" onclick="{() => {
                    note.todo.values[i].items.splice(index, 1);
                    note.todo.values[i].values.splice(index, 1);
                    if(note.todo.values[i].items.length == 0){
                      note.todo.values[i] = false;
                    }
                  }}">1</button>
                {:else}
                  <textarea 
                    class="body"
                    readonly
                    bind:value={note.todo.values[i].items[index]}
                  ></textarea>
                {/if}
              </span>
            {/each}
          {/if}
        {/each}
        {#if note.editing}
          <button class="icon inlineButton hover" onclick={async () => {
            note.todo.items.push("");
            note.todo.values.push(false);
          }}>*</button>
        {/if}
    {:else if note.type == "settings"}
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
        <p1 class="title">Note Server</p1>
      </span>
        
      <span class="inline">
        
        <textarea
            class="body"
            bind:value={globalState.url}
        ></textarea>
      </span>

    {/if}

    <span class="controlBar">
      {#if note.type != "settings"}
      <button onclick={() => edit(notes.indexOf(note))} class="icon controlButton" style="{note.editing ? "color: var(--main-color);" : ""}">w</button>
      {/if}
      {#if note.type == "note" || note.type == "list"}
        <button onclick={() => copy(notes.indexOf(note))} class="icon controlButton">5</button>
      {:else if note.type == "image"}
        <button onclick={() => window.location.href=download(notes.indexOf(note))} class="icon controlButton">x</button>
      {/if}
      {#if note.type != "settings"}
      <button onclick={() => deleteNote(notes.indexOf(note))} class="icon controlButton">t</button>
      {:else}
        <button onclick={saveSettings} class="icon controlButton">N</button>
        <button onclick={clearSettings} class="icon controlButton">r</button>
        <button onclick={deleteSettings} class="icon controlButton">t</button>
      {/if}

    </span>
  </div>

{/each}

</div>

<button onclick={toggleMenu} class="menuButton icon" style='z-index: 5; {menuToggle ? "transform: rotate(180deg); color: var(--main-color);" : ""}'>;</button>
<button onclick={add} class="menuButton" style='{menuToggle ? "transform: translateY(80px);" : ""}'>+</button>
<button onclick={addImage} class="menuButton icon" style='{menuToggle ? "transform: translateY(160px);" : ""}'>p</button>
<button onclick={addImage} class="menuButton icon" style='{menuToggle ? "transform: translateY(240px);" : ""}'>N</button>
<button onclick={addTodo} class="menuButton icon" style='{menuToggle ? "transform: translateY(320px);" : ""}'>h</button>
<button onclick={settings} class="menuButton icon2" style='{menuToggle ? "transform: translateY(400px);" : ""}'>_</button>
<button onclick={sort} class="menuButton icon" style='{menuToggle ? "transform: translateY(480px);" : ""}'>r</button>


<div 
  id="notifArea" 
  class="notificationArea"
>

</div>


<style>

  .example {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.87);
    box-sizing: border-box;
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
    border: 3px solid white;
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
    width: 64px;
    height: 64px;
    top: 36px;
    left: calc(100vw - 100px);
    font-size: 64px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    place-items: center;
    text-align: center;

    line-height: 0px;
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
    width: fit-content;
    color: rgba(255, 255, 255, 0.87);
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

    min-width: 100px;
  }

  .note * {
    user-select: none;
  }

  .body {
    font-size: 20px;
    font-family: monospace;
    line-height: 30px;
    color: rgba(255, 255, 255, 0.87);
  }

  .title {
    font-size: 32px;
    font-family: monospace;
    font-weight: bold;
    color: white;
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

</style>



