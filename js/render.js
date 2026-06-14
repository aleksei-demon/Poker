/*
=====================================================================================
 RENDER.JS - отрисовка экранов
=====================================================================================
Порядок подключения: 
1. aprender.js (библиотека: h, factory, clear)
2. utils.js    (форматирование, работа со строками)
3. api.js      (async/fetch — связь с сервером)
4. logic.js    (массивы данных и математические формулы)
5. render.js   (чертежи компонентов и отрисовка экранов)

*/
// _____________________________________________________________________________________
// - - - - -И Н Т Е Р Ф Е Й С  - - - 
const myFields = [
    // Б А Н К   И   Б А Л А Н С
    {
        class: 'money',
        children: [
            { tag: 'span', innerText: 'БАНК ' },
            { tag: 'span#bank', innerText: ' 0 $ ' },
            { tag: 'span', innerText: ' | ' },
            { tag: 'span', innerText: 'БЮДЖЕТ ' },
            { tag: 'span#p-balance', innerText: ' 100 $' },
        ]
    },

    // Б О Т Ы   ( О Б Щ А Я   С Е К Ц И Я )
    {
        tag: 'section', class: 'bots-section',
        children: [
            // БОТ 1
            {
                id: 'bot-1',
                class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.white', innerText: 'Андрей ' },
                    { tag: 'span#bot-balance-1', innerText: '100$' },
                    { tag: 'div#cards-1.bot', children: [{ tag: 'span' }] },
                ]
            },
            // БОТ 2
            {
                id: 'bot-2', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.white', innerText: 'Витал ' },
                    { tag: 'span#bot-balance-2', innerText: '100$' },
                    { tag: 'div#cards-2.bot', children: [{ tag: 'span' }] },
                ]
            },
            // БОТ 3
            {
                id: 'bot-3', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span.white', innerText: '404 ' },
                    { tag: 'span#bot-balance-3', innerText: '100$' },
                    { tag: 'div#cards-3.bot', children: [{ tag: 'span' }] },
                ]
            },
        ]
    },

    // О Б Щ И Й   С Т О Л
    { tag: 'section', class: 'cards-table', children: [{ tag: 'div.#board' }] },

    // И Г Р О К
    { tag: 'section', class: 'player', children: [{ tag: 'div.dealer-chip', innerText: 'D' }, { tag: 'p.#cards-p' }] },

    // К Н О П К И
    {
        tag: 'section',
        class: 'button-panel',
        children: [
            { tag: 'button.btn-fold', onclick: () => makeAction('fold'), innerText: 'Пасс' },
            { tag: 'button.btn-check', onclick: () => makeAction('check'), innerText: 'Чек' },
            { tag: 'button.btn-call', onclick: () => makeAction('call'), innerText: 'Колл' },
            { tag: 'button.btn-raise', onclick: () => makeAction('raise'), innerText: 'Рейз' },
            { tag: 'button.btn-all-in', onclick: () => makeAction('all-in'), innerText: 'Ва-банк' },
            { tag: 'button.btn-hod', onclick: () => makeAction('hod'), innerText: 'Ход' },
        ]
    },
];

// 3. Запуск:
const container = h('div#app', {}, factory(myFields, nestedBlueprint));
document.body.appendChild(container);

// - - - - -И Н Т Е Р Ф Е Й С  - - - 
//===================================================================================================

//_______________________________________________________________
// - - - Р Е Н Д Е Р   К А Р Т  - - -

function renderCardsTo(cardsArray, target_id, isSecret = false) {
    const container = document.querySelector(target_id);
    if (!container) { console.error(`Элемент "${target_id}" не найден!`); return; }

    cardsArray.forEach(char => {
        const span = document.createElement('span');
        span.textContent = char; // DOM честно знает и помнит букву карты!

        // Выставляем базовый класс карты и цвет по регистру
        span.classList.add('card');
        const isRed = char === char.toUpperCase();
        span.dataset.color = isRed ? 'red' : 'black';

        // Вот она, простая и понятная логика смены классов:
        if (isSecret) {
            span.classList.add('card-back');
        } else {
            span.classList.add('card-front');
        }

        container.appendChild(span);
    });
}
const testerP = ['a', 'j',];
const tester = ['a', 'j', 'A', 'E', 'm'];
renderCardsTo(tester, '#board');
renderCardsTo(testerP, '#cards-p');
renderCardsTo(testerP, '#cards-2', true);
renderCardsTo(testerP, '#cards-1',);
renderCardsTo(testerP, '#cards-3',);
// - - - Р Е Н Д Е Р   К А Р Т  - - -
//==============================================================================



























































//__________________________________________________________________________________________________________
// - - - Ф А В И К О Н - - - 
function Favicon() {
    let iconContent = '';

    iconContent = `
            <path d="M 50 15 C 75 40, 90 60, 75 75 
            S 55 70, 50 70 
            S 25 70, 25 75 
            S 10 60, 25 40
            C 35 25, 45 15, 50 15
            M 42 70
            C 42 85, 42 90, 35 90
            M 58 70
            C 58 85, 58 90, 65 90" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="10" 
            stroke-linecap="round" 
            stroke-linejoin="round"/>`;

    const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <style>            svg { color: #1a1a1a; } 
            @media (prefers-color-scheme: dark) {svg { color: #f0f0f0; }}
        </style>
        ${iconContent}
    </svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
    }
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svgIcon);
}
document.addEventListener('DOMContentLoaded', () => { Favicon(); });



