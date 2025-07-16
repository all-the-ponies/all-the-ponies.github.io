import GameData from './gameData.js'
import { loadJSON, normalize, fixName, LOC, toTitleCase, scrollIntoViewWithOffset } from './common.js'
import './jquery-3.7.1.min.js'

class AllThePonies {
    constructor() {
        this.gameBar = $('#game-bar')
        this.nameInput = $('#name-input')
        this.timerElement = $('#timer')
        this.progressElement = $('#progress')
        this.startButton = $('#start')
        this.stopButton = $('#stop')
        this.languageSelector = $('#language')
        this.ponyListElement = $('#ponies-list')
        this.optionsButton = $('#options')
        this.optionsDialog = $('#options-dialog')

        this.options = {
            ignoreSpaces: true,
            caseSensitive: false,
            ignoreAccents: true,
            ignorePunctuation: true,
            includeUnused: false,
        }

        this.optionInfo = {
            ignoreSpaces: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_SPACES',
            },
            caseSensitive: {
                type: 'switch',
                name: 'OPTIONS_CASE_SENSITIVE',
            },
            ignoreAccents: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_ACCENTS',
            },
            ignorePunctuation: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_PUNCTUATION',
            },
            includeUnused: {
                type: 'switch',
                name: 'OPTIONS_INCLUDE_UNUSED',
            }
        }

        this.tags = ['unused']

        this.gameData = new GameData('/assets/json/game-data.json')

        this.ponyInfo = {}
        this.startTime = 0

        
        this.update()
        this.bindEventListeners()
    }

    update() {
        this.gameData.language = this.language
        this.ponyInfo = this.gameData.generateFilteredList(this.options)
        // this.gameData.update() // We don't need to update because setting the language already updates
        this.updateProgress()
    }

    get language() {
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
    }

    transformName(name) {
        return this.gameData.transformName(name, this.options)
    }

    bindEventListeners() {
        this.languageSelector.on('change', () => this.update())

        this.startButton.on('click', () => this.start())
        this.stopButton.on('click', () => this.stop())
        this.nameInput.on('input', () => this.checkName())

        this.optionsButton.on('click', () => this.showOptionsDialog())

        this.timerHandler = () => this.updateTime()

        this.optionsDialog.find('[value="ok"]').on('click', () => this.submitOptionsDialog())
    }

    checkName() {
        this.nameInput.val(this.nameInput.val().replaceAll('\n', ''))

        // let pony = this.gameData.matchName(this.nameInput.val())

        let pony = null
        let name = this.gameData.transformName(this.nameInput.val(), this.options)
        if (name in this.ponyInfo.namesMap || name in this.ponyInfo.altNames) {
            let foundPony = name in this.ponyInfo.altNames ? this.ponyInfo.altNames[name] : this.ponyInfo.namesMap[name]
            pony = this.gameData.getPony(foundPony.id, foundPony.name)
        }

        if (pony == null) {
            return
        }

        if (!(this.guessedPonies.includes(pony.id))) {
            this.guessedPonies.push(pony.id)
            let nameElement = $('<div>', {
                class: 'pony-name',
            }).append(
                $('<img>', {
                    class: 'name-image',
                    src: pony.image.portrait,
                }),
                $('<span>', {
                    text: pony.usedName || pony.name[this.language],
                })
            )
            this.ponyListElement.append(nameElement)
            scrollIntoViewWithOffset(
                nameElement[0],
                this.gameBar.height() + Number(getComputedStyle(game.ponyListElement[0]).marginTop.replace('px', '')),
            )
            this.nameInput.val('')
            this.updateProgress()
        }
    }

    updateProgress() {
        this.progressElement.text(`${this.guessedPonies.length}/${this.ponyInfo.totalPonies}`)
    }

    start() {
        this.stop()
        this.guessedPonies = []
        this.ponyListElement.empty()
        this.startButton[0].disabled = true
        this.stopButton[0].disabled = false
        this.nameInput[0].disabled = false
        this.nameInput.val('')

        
        this.languageSelector[0].disabled = true
        this.timerElement.text('0:00')
        this.updateProgress()
        this.startTime = new Date().getTime()
        this._timerInterval = setInterval(this.timerHandler, 1000)

        this.ponyListElement.css(
            '--bottom-sticky',
            document.documentElement.clientHeight - this.gameBar.offset().top + 'px',
        )
        this.nameInput.trigger('focus')
        this.gameBar[0].scrollIntoView()
    }

    stop() {
        this.nameInput.value = ''
        this.startButton[0].disabled = false
        this.stopButton[0].disabled = true
        this.nameInput[0].disabled = true
        this.languageSelector[0].disabled = false
        clearInterval(this._timerInterval)
    }

    updateTime() {
        let now = new Date().getTime()
        let timeElapsed = now - this.startTime

        let seconds = Math.floor((timeElapsed % (1000 * 60)) / 1000);
        let minutes = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60))
        this.timerElement.text(`${minutes}:${seconds.toString().length == 1 ? '0' : ''}${seconds}`)
    }

    showOptionsDialog() {
        let formOptions = this.optionsDialog.find('.form-options')
        // formOptions.empty()
        let optionElements = {}
        for (let [option, optionInfo] of Object.entries(this.optionInfo)) {
            let optionElement = formOptions.find(`#option-${option}`)
            console.log(option, optionElement)
            if (!optionElement.length) {
                optionElement = $('<input>', {
                    type: 'checkbox',
                    name: option,
                    id: `option-${option}`,
                })
                $('<label>', {
                    class: 'form-option',
                    for: `option-${option}`,
                }).append(
                        optionElement,
                        $('<div>', {
                            class: 'switch',
                        }),
                        $('<span>', {
                            class: 'option-text',
                            text: LOC.translate(optionInfo.name),
                        })
                    ).appendTo(formOptions)
            }

            optionElements[option] = optionElement
        }

        for (let [option, optionElement] of Object.entries(optionElements)) {
            optionElement.prop('checked', this.options[option])
        }

        this.optionsDialog[0].showModal()
    }

    submitOptionsDialog() {
        let formOptions = this.optionsDialog.find('form')
        let formData = new FormData(formOptions[0])
        console.log(formOptions[0]
            , formData)

        for (let [option, optionInfo] of Object.entries(this.optionInfo)) {
            let optionElement = formOptions.find(`#option-${option}`)
            if (optionElement.length) {
                this.options[option] = optionElement.prop('checked')
            }
        }

        this.update()
    }
}

window.game = new AllThePonies()
