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

        this.languageSelector.on('change', () => this.update())
        
        this.gameData = new GameData('/assets/json/game-data.json')
        
        this.filters = {}

        let urlHash = location.hash.replace('#', '')

        $('.to-search').on('click', (e) => {
            e.preventDefault()
            location.hash = ''
            this.updateSearch()
        })

        this.searchBar.on('input', () => this.updateSearch())

        if (this.gameData.getPony(urlHash) != null) {
            console.log(this.gameData.getPony(urlHash))
            this.showPonyProfile(urlHash)
        }

        this.createSearchCards()

        let searchQuery = new URLSearchParams(location.search).get('q')
        if (searchQuery != null) {
            this.searchBar.val(decodeURI(searchQuery))
            
        }

        if (this.currentScreen == 'search') {
            this.updateSearch()
        }
    }

    get language() {
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
    }

    update() {
        this.gameData.language = this.language
        this.gameData.updatePonies()
        if (this.currentScreen == 'ponyProfile') {
            this.showPonyProfile(location.hash.replace('#', ''))
        }
        this.createSearchCards()
        if (this.currentScreen == 'search') {
            this.updateSearch()
        }
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

    createSearchCards() {
        this.searchResultsElement.empty()
        
        for (let ponyId of Object.keys(this.gameData.gameData.ponies)) {
            if ($(`#${ponyId}`).length == 0) {
                // console.log('does not exist', $(`#${ponyId}`).length )
                this.searchResultsElement.append(this.createPonyCard(ponyId))
            }
        }
    }

    updateSearch() {
        this.showSearch()

        const url = new URL(location.origin + location.pathname)
        const urlParams = new URLSearchParams();
        urlParams.set('q', encodeURIComponent(this.searchBar.val()))
        url.search = urlParams
        if (history && history.replaceState) {
            history.replaceState("", "", url.toString());
        } else {
            location.href = url.toString();
        }


        let searchResults = this.gameData.searchName(this.searchBar.val())
        // console.log(searchResults)

        this.searchResultsElement.children().each(function () {
            if (!searchResults.includes(this.id)) {
                $(this).css('display', 'none')
            } else {
                $(this).css('display', 'block')
            }
        })
    }

    showPonyProfile(ponyId) {
        this.currentScreen = 'ponyProfile'

        this.searchSection.css('display', 'none')
        this.ponyProfileSection.css('display', 'block')

        let pony = this.gameData.getPony(ponyId)
        // this.searchResultsElement.empty()


        this.ponyProfileSection.find('#pony-profile-name').text(pony.name[this.language])
        console.log(pony.image.full)
        this.ponyProfileSection.find('#pony-profile-image').attr('src', pony.image.full)
        this.ponyProfileSection.find('#pony-profile-description').text(pony.description[this.language])
    }
}

window.app = new App()
