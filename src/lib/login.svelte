<script>
    import { globalState, refresh_pocket, loadSettings, saveGlobal } from "../global.svelte";
    import { onMount } from "svelte";
    import { push } from 'svelte-spa-router';
    let email = $state("");
    let password = $state("");
    

    const focusElement = (id) => {
        let thing = document.getElementById(id);
        thing.focus();
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
            font-size: max(2vw, 24px);   
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

    let authing = $state(false);

    const testAuth = () => {
        if(globalState.pocket.authStore.isValid){
            saveGlobal();
            push("/main");
            return true;
        }
        return false;
    }

    const authenticate = async () => {
        if(testAuth()){
            return;
        }
        authing = true;
        try{
            const _result = await globalState.pocket.admins.authWithPassword(email, password);
        } catch (Err) {
            console.log(Err)
            addNotification("There was an error with the server... Try another URL or login")
            return;
        }
    }

    onMount(async () => {
        await loadSettings()
        await testAuth();
    });

    $effect(() => {
        refresh_pocket(globalState.url)
    })

    $effect(() => {
        globalState.themeName = "MyTheme";
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
</script>

<div 
  id="notifArea" 
  class="notificationArea"
>

</div>

<div class="container">

    <h1 style="color: var(--title-color);">Peg<i style="color: var(--main-color);">Board</i></h1>

    <div class="card">
        <input 
            bind:value={globalState.url}
            placeholder="Server..."
            onkeydown={(e) => e.key === "Enter" && focusElement("email")}
        >

        <input 
            bind:value={email}
            id="email"
            placeholder="Email..."
            onkeydown={(e) => e.key === "Enter" && focusElement("password")}
        >

        <input 
            id="password"
            onkeydown={(e) => e.key === "Enter" && authenticate()}
            bind:value={password} 
            placeholder="Password..."    
            type="password"
            autocomplete="off"
        >
        <span>
            <p1>Login</p1>
            <button onclick={authenticate}>

                <svg fill="currentColor" viewBox="0 0 1293 1293">
                <!-- Plus  -->
                <path d="M708,581.5V66.5c0-19-6-34-19-47S660,.5,642,.5s-34,6-47,19-20,29-20,47v515H66c-19,0-34,7-47,20S0,630.5,0,649.5s7,32,20,45,28,20,46,20h509v512c0,19,7,34,20,47s28,19,47,19,34-7,47-20,19-28,19-46v-512h518c19,0,35-6,48-19s19-28,19-46-6-35-19-48-29-20-48-20h-518Z"/>
                </svg>

            </button>

        </span>

    </div>
</div>

<style>



    .container {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        place-items: center;
        padding-top: 10vh;
        gap: 10px;
        background-color: var(--bg-color);
    }

    .notificationArea {
        display: flex;
        box-sizing: border-box;
        position: fixed;
        width: 40%;
        min-width: 250px;
        height: fit-content;
        top: 0;
        left: 30%;
        flex-direction: column;
        z-index: 10;
        justify-content: center;
        align-items: center;
        padding: 20px;
        gap: 10px;
    }

    button {
        width: min(90px, max(7vw, 60px));
        height: min(90px, max(7vw, 60px));
        min-width: min(90px, max(7vw, 60px));
        min-height: min(90px, max(7vw, 60px));
        border-radius: 100%;
        padding: 10px;
        background-color: var(--note-color);
        border: none;
        cursor: pointer;
        transition: color 250ms;
    }

    button:hover {
        color: var(--main-color);
    }

    span {
        width: 100%;
        height: fit-content;
        justify-content: center;
        display: flex;
        box-sizing: border-box;
        gap: 1.5vh;
    }

    .card {
        max-width: 1500px;
        width: 50vw;
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
        height: fit-content;
        padding-left: 60px;
        padding-right: 60px;
    }

    p1 {
        font-size: min(36px, max(3vw, 24px));
        box-sizing: border-box;
        display: flex;
        align-items: center;
    }

    input {
        font-size: min(36px, max(3vw, 24px));
        background-color: var(--note-color);
        border: none;
        width: 100%;
        outline: none;
        font-family: monospace;
        display: flex;
        padding: 10px;
        border-radius: max(2vh, 2vw);
        color: var(--title-color);
        box-sizing: border-box;
    }

    h1 {
        font-size: min(90px, max(7vw, 60px));
        line-height: min(90px, max(7vw, 60px));
        font-family: monospace;
    }


    h1 * {
        font-style: normal;
    }

</style>