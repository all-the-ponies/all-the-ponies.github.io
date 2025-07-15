import GameData from "../scripts/gameData.js";
import '../scripts/jquery-3.7.1.min.js'

class App {
    constructor() {
        this.searchSection = $('#search-section')
        this.ponyProfileSection = $('#pony-profile')
        this.languageSelector = $('#language')
        this.searchBar = $('#search-bar')
        this.searchResultsElement = $('#search-results')

        this.currentScreen = 'search'
        
        this.gameData = new GameData('/assets/json/game-data.json')
        
        this.filters = {}

        let urlHash = location.hash.replace('#', '')

        $('.to-search').on('click', (e) => {
            e.preventDefault()
            location.hash = ''
            this.updateSearch()
        })

        if (this.gameData.getPony(urlHash) != null) {
            console.log(this.gameData.getPony(urlHash))
            this.showPonyProfile(urlHash)
        } else {
            this.updateSearch()
        }
        
    }

    get language() {
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
    }

    createPonyCard(ponyId) {
        let pony = this.gameData.getPony(ponyId)
        let card = $('<a>', {
            class: 'pony-card',
            id: ponyId,
            href: `#${ponyId}`,
        }).append(
            $('<div>', {
                class: 'pony-name',
                text: pony.name[this.language],
            }),
            $('<div>', {
                class: 'pony-card-body',
            }).append(
                $('<img>', {
                    class: 'pony-image',
                    src: pony.image.full,
                    loading: 'lazy',
                    alt: pony.name[this.language],
                })
            )
        ).on('click', () => this.showPonyProfile(pony.id))
        return card
    }

    showSearch() {
        this.currentScreen = 'search'
        this.searchSection.css('display', 'block')
        this.ponyProfileSection.css('display', 'none')
    }

    updateSearch() {
        this.showSearch()
        this.searchResultsElement.empty()
        let i = 0
        for (let ponyId of Object.keys(this.gameData.gameData.ponies)) {
            this.searchResultsElement.append(this.createPonyCard(ponyId))
            // i += 1
            // if (i > 10) {
            //     break
            // }
        }
    }

    showPonyProfile(ponyId) {
        this.currentScreen = 'ponyProfile'

        let pony = this.gameData.getPony(ponyId)
        // this.searchResultsElement.empty()
        this.searchSection.css('display', 'none')
        this.ponyProfileSection.css('display', 'block')


        this.ponyProfileSection.find('#pony-profile-name').text(pony.name[this.language])
        console.log(pony.image.full)
        this.ponyProfileSection.find('#pony-profile-image').attr('src', pony.image.full)
        this.ponyProfileSection.find('#pony-profile-description').text(pony.description[this.language])
    }
}

window.app = new App()
