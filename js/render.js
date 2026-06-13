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
                    { tag: 'span', innerText: 'Андрей ' },
                    { tag: 'span#bot-balance-1', innerText: '100$' },
                    { tag: 'div#cards-1', class: 'cards-bot' },
                ]
            },
            // БОТ 2
            {
                id: 'bot-2', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span', innerText: 'Витал ' },
                    { tag: 'span#bot-balance-2', innerText: '100$' },
                    { tag: 'div#cards-2', class: 'cards-bot' },
                ]
            },
            // БОТ 3
            {
                id: 'bot-3', class: 'bot-place',
                children: [
                    { tag: 'div.dealer-chip', innerText: 'D' },
                    { tag: 'span', innerText: '404 ' },
                    { tag: 'span#bot-balance-3', innerText: '100$' },
                    { tag: 'div#cards-3', class: 'cards-bot' },
                ]
            },
        ]
    },

    // О Б Щ И Й   С Т О Л
    { tag: 'section#board', class: 'cards-table' },

    // И Г Р О К
    { tag: 'section#cards-p', class: 'player', children: [{ tag: 'div.dealer-chip', innerText: 'D' }] },

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
















/*



function renderCardsTo(cardsArray, target_id) {
    //  куда складывать карты
    const container = document.querySelector(target_id);

    if (!container) { console.error(`Элемент с селектором "${target_id}" не найден!`); return; }

    container.innerHTML = '';

    // Перебираем массив карт
    cardsArray.forEach(char => {
        // Создаем span для каждой карты
        const span = document.createElement('span');
        span.classList.add('card-front', 'card');
        span.textContent = char;

        // Автоматом определяем цвет по регистру буквы
        const isRed = char === char.toUpperCase();
        span.dataset.color = isRed ? 'red' : 'black';

        // Добавляем готовую карту в контейнер
        container.appendChild(span);
    });
}

renderCardsTo(KOLODA, '#pp');
//-----------------------------------------------------------------------------------








































/*
window.addEventListener('pageshow', (event) => {
    // Если страница загружена из кэша или просто открыта заново
    if (event.persisted || performance.navigation.type === 2) {
        // Принудительно рендерим главный экран (Числобог)
        switchScreen('ЧИСЛОБОГ');
    }
});

// Названия разделов (теперь это просто массив данных)



const nav_configs = [
    { label: '&nbsp;ЧИСЛОБОГ', value: 'ЧИСЛОБОГ' },
    { label: '&nbsp;закон Ома', value: 'закон Ома' },
    { label: '&nbsp;&nbsp;Т. В. З.', value: 'Т. В. З.' },
    { label: '&nbsp;&nbsp;К. Д. П.', value: 'К. Д. П.', selected: true },
    { label: '&nbsp;генератор', value: 'генератор' },
    { label: '&nbsp;Корпус А.С.', value: 'Корпус А.С.' },
];



function draw_init() {
    clear(''); // Полная зачистка
    document.body.classList.add('body_calc');
    const startScreen = nav_configs.find(item => item.selected)?.value || nav_configs[0].value;
    const options = nav_configs.map(item =>
        h('option.body_calc', {
            value: item.value,
            attr: {
                // Теперь это принудительно запишется в HTML как <option selected="selected">
                selected: (item.value === startScreen) ? 'selected' : null
            },
            innerHTML: item.label,
        })
    );
    const header = h('header#header', {}, [
        h('form#form2', { onsubmit: e => e.preventDefault() }, [
            h('select#nav.select', {
                onchange: (e) => { switchScreen(e.target.value); }
            }, options),
        ])
    ]);
    const main = h('main#app_content'); // Создаем базу для контента
    document.body.append(header, main); // Добавляем всё разом
    switchScreen(startScreen);
}




// Запуск приложения при загрузке страницы
window.onload = draw_init;

*/

/*
const calcFields = [
    { id: 'op1', hold: ' A', className: 'inputs user_fill', },
    { id: 'dey', tag: 'select', className: 'select', },
    { id: 'op2', hold: ' Б', className: 'inputs user_fill' },
    { id: 'otvet', hold: ' ответ', className: 'inputs result_fill', attr: { readonly: 'readonly' } }
];
const calc_configs = [
    { label: '&nbsp;&nbsp;+', value: '+', selected: true },
    { label: '&nbsp;&nbsp;-', value: '-' },
    { label: '&nbsp;&nbsp;*', value: '*' },
    { label: '&nbsp;&nbsp;/', value: '/' },
    { label: '^ &nbsp;&nbsp; А в степень Б', value: '^' },
    { label: '&#8730; &nbsp;&nbsp; степени Б из А', value: '&#8730;' },
    { label: '% &nbsp;&nbsp; остаток от А/Б ', value: '%' },
    { label: 'А! &nbsp;&nbsp; факториал', value: 'А!' },
    { label: 'sin &nbsp;&nbsp;А', value: 'sin' },
    { label: 'cos &nbsp;&nbsp;А', value: 'cos' },
    { label: 'log &nbsp;&nbsp; логарифм А по осн. Б', value: 'log' },
];
function draw_calc(target) {
    const targetEl = typeof target === 'string' ? document.querySelector(target) : target;

    // ЗАЩИТА: если таргет не найден, выходим, чтобы не плодить ошибки в консоли
    if (!targetEl) {
        console.warn('Target element not found:', target);
        return;
    }
    for (all of document.querySelectorAll('option')) { all.className = 'body_calc'; }

    targetEl.innerHTML = '';

    // Собираем опции
    const options = calc_configs.map(item =>
        h('option.body_calc', {
            value: item.value,
            selected: item.selected || false,
            innerHTML: item.label
        })
    );

    // Собираем форму одним деревом  
    const form = h('form#form', { onsubmit: (e) => e.preventDefault() }, [
        h('input#op1.inputs.user_fill', {
            placeholder: ' A',
            attr: { inputmode: 'decimal', autocomplete: 'off' },
            oninput: (e) => oneOpCalculation(e.target.id),
            ondblclick: (e) => event_dblclick(e.target.id),
        }),

        // ВАЖНО: Селект создается сразу с детьми!
        h('select#dey.select', { onchange: (e) => runCalculator(e.target.id) }, options),

        h('input#op2.inputs.user_fill', {
            placeholder: ' Б',
            attr: { inputmode: 'decimal', autocomplete: 'off' },
            oninput: (e) => oneOpCalculation(e.target.id),
            ondblclick: (e) => event_dblclick(e.target.id),
        }),
        h('input#otvet.inputs.result_fill', { placeholder: ' ответ', readOnly: true, attr: { autocomplete: 'off' }, onclick: (e) => put_to_RAM(e.target.id) }),

        h('div.btn-container', {}, [
            h('button#sbros.inputs', { innerText: 'С Б Р О С', onclick: () => switchScreen('ЧИСЛОБОГ') })
        ]),

        h('p.explanation', { innerHTML: 'Даблклик на поле ввода даст число π, следующий число е, а третий 1/2π <br><br><br> Клик на поле "Ответ" скопирует его в буфер обмена' })
    ]);

    targetEl.append(form);
}
*/

















//-------------------------------------------------------------------


// 3. И в самом низу — запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    //switchScreen('ЧИСЛОБОГ');
    Favicon();
});




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











