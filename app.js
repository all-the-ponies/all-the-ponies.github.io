import { Localization } from "/scripts/common.js"
import GameData from "/scripts/gameData.js"
import '/scripts/jquery-3.7.1.min.js'

import Index from "./index.js"
import Ponies from "./ponies/ponies.js"
import Quiz from "./quiz/quiz.js"

import { setURL } from "./scripts/common.js"

window.LOC = new Localization('/assets/json/localization.json')
window.gameData = new GameData('/assets/json/game-data.json')

document.addEventListener('click', (e) => {
    if (e.target.tagName == 'A') {
        const url = new URL(e.target.href)
        if (url.origin == location.origin) {
            e.preventDefault()
            setURL(e.target.href)
            console.log('same page', e.target.href)
            window.app.refreshPage()
        }
    }
})

window.addEventListener('popstate', (e) => {
    console.log(e)
    window.app.refreshPage()
})

class App {
    constructor() {
        this.languageSelector = document.getElementById('language')
        this.languageSelector.addEventListener('change', () => this.refreshAll(true))
        this.sidebarToggle = document.getElementById('sidebar-toggle')
        this.createLanguageSelector()

        this.content = document.getElementById('page-content')
        this.sidebarElement = document.getElementById('sidebar-links')

        this.currentPage = null

        this.refreshAll()
    }

    get language() {
        return this.languageSelector.value
    }

    createLanguageSelector() {
        let preferredLanguage = null
        const userLanguages = navigator.languages

        this.languageSelector.replaceChildren()
        for (let [key, data] of Object.entries(gameData.languages)) {
            let option = document.createElement('option')
            option.value = key
            option.innerText = data.name
            this.languageSelector.append(option)

            if (userLanguages.includes(data.code)) {
                if (preferredLanguage != null && userLanguages.indexOf(data.code) > userLanguages.indexOf(preferredLanguage.code)) {
                    option.selected = true
                    preferredLanguage = {
                        code: data.code
                    }
                }
            }
        }
    }

    translate(string) {
        if (this.language in string) {
            return string[this.language]
        }
        return string['english']
    }

    routes = {
        '/': new Index(),
        '/ponies/': new Ponies(),
        '/quiz/': new Quiz(),
    }

    get sidebar() {
        return [
            ['/ponies/', gameData.categories.ponies.name],
            '~',
            ['/quiz/', {'english': 'Pony quiz'}],
        ]
    }

    refreshAll(reload = false) {
        document.documentElement.lang = gameData.languages[this.language].code

        this.refreshSidebar()
        this.refreshPage(reload)
    }

    refreshPage(reload = false) {
        let url = new URL(location)

        let path = url.pathname
        if (path[path.length - 1] != '/') {
            url.pathname += '/'
            path = url.pathname

            setURL(url.toString(), true)
        }

        this.sidebarToggle.checked = false

        if (path in this.routes) {
            let route = this.routes[path]
            if (path == this.currentPage) {
                console.log('updating')
                route.update(reload)
            } else {
                route.load()
            }
            this.currentPage = path
        } else {
            this.content.innerHTML = '404 Error'
        }

    }

    refreshSidebar() {
        this.sidebarElement.replaceChildren()

        console.log(this.language)

        for (let item of this.sidebar) {
            if (item == '~') {
                let hr = document.createElement('hr')
                hr.classList.add('sidebar-separator')
                this.sidebarElement.append(hr)
            } else {
                let li = document.createElement('li')
                let link = document.createElement('a')
                li.append(link)

                link.href = item[0]
                console.log(item)
                link.innerText = this.translate(item[1])

                this.sidebarElement.append(li)
            }
        }
    }
}

window.app = new App()
