async function getJson(file) {
  const response = await fetch(file);
  const json = await response.json();
  return json;
}

document.getElementById('')

function addPony(pony) {
    let ponies_list = document.getElementById('ponies-list')
    let pony_el = document.createElement('div')
    pony_el.classList.add('pony-name')
    pony_el.innerText = pony
    ponies_list.appendChild(pony_el)
}

async function game() {
    let language = document.getElementById('language').value
    let name_input = document.getElementById('name-input')
    let ponies_list = document.getElementById('ponies-list')
    ponies_list.replaceChildren()

    let all_pony_info = await getJson('ponies.json')
    let ponies = {}
    let used_ponies = []
    let alt_names = {}
    for (let pony of Object.values(all_pony_info)) {
        
        ponies[pony['name'][language].toLocaleLowerCase()] = pony['name'][language]
        if (typeof pony['alt_name'] != 'undefined' && pony['alt_name'].hasOwnProperty(language)) {
            for (let alt_name of pony['alt_name'][language]) {
                alt_names[alt_name.toLocaleLowerCase()] = pony['name'][language]
            }
            
        }
    }

    let progress_el = document.getElementById('progress')
    let total_ponies = Object.values(ponies).length
    progress_el.innerText = '0/'+total_ponies

    name_input.disabled = false
    const name_input_controller = new AbortController();
    name_input.addEventListener('input', (e) => {
        let name = name_input.value.toLocaleLowerCase()
        if (alt_names.hasOwnProperty(name)) {
            name = alt_names[name].toLocaleLowerCase()
        }

        if (!used_ponies.includes(name) && ponies.hasOwnProperty(name)) {
            used_ponies.push(name)
            addPony(ponies[name])
            progress_el.innerText = used_ponies.length+'/'+total_ponies
            name_input.value = ''
        }
    }, {'signal': name_input_controller.signal})

    let timer_el = document.getElementById('timer')
    timer_el.innerText = '0:00'
    let start_time = new Date().getTime()
    let timer_interval = setInterval(() => {
        let now = new Date().getTime()
        let time_passed = now - start_time

        let seconds = Math.floor((time_passed % (1000 * 60)) / 1000);
        let minutes = Math.floor((time_passed % (1000 * 60 * 60)) / (1000 * 60))
        timer_el.innerText = `${minutes}:${seconds.toString().length == 1 ? '0' : ''}${seconds}`
    }, 1000)

    let start_el = document.getElementById('start')

    function stop() {
        name_input_controller.abort()
        clearInterval(timer_interval)
        stop_button.disabled = true
        name_input.disabled = true
    }

    let stop_button = document.getElementById('stop')
    stop_button.disabled = false
    stop_button.onclick = stop

    start_el.onclick = function() {
        stop()
        game()
    }
}
