<script>
    import { globalState, refresh_pocket, loadSettings } from "../global.svelte";
    import { onMount } from "svelte";
    import { replace } from 'svelte-spa-router';
    let email = $state("");
    let password = $state("");
    

    const focusElement = (id) => {
        let thing = document.getElementById(id);
        thing.focus();
    }

    let authing = $state(false);

    const testAuth = () => {
        if(globalState.pocket.authStore.isValid){
            replace("/main");
            return true;
        }
    }

    const authenticate = async () => {
        if(testAuth()){
            return;
        }
        authing = true;
        const result = await globalState.pocket.admins.authWithPassword(email, password);
        testAuth();
    }

    onMount(async () => {
        await loadSettings()
        // await testAuth();
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
        >

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
    }

    .card {
        width: 60vw;
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: fit-content;
    }

    input {
        font-size: max(3vw, 24px);
        background-color: var(--note-color);
        border: none;
        outline: none;
        font-family: monospace;
        display: flex;
        padding: 10px;
        border-radius: 15px;
        color: var(--title-color);
    }


    h1 {
        font-size: max(7vw, 60px);
        line-height: max(7vw, 60px);
        font-family: monospace;
    }

    h1 * {
        font-style: normal;
    }

</style>