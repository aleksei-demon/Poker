// =============================================================================
//  UTILS.JS — Сервисные функции
// =============================================================================

//-------------------------S h o w   M e s s a g e-------------------------------------

let messageTimeout;

function showMessage_(message = '', timeShow = 900, red = false) {
    let table = document.querySelector('.cards-table');
    if (!table) return;

    // Находим старое сообщение и мгновенно удаляем его
    let oldMessage = document.getElementById('p_message');
    if (oldMessage) {
        oldMessage.remove();
        // Больше никаких clearTimeout не нужно!
    }

    let p = document.createElement('p');
    p.classList.add('message');
    p.setAttribute('id', 'p_message');
    p.innerText = message;

    p.style.setProperty('--show-time', `${timeShow}ms`);
    if (red) p.classList.add('error');

    table.appendChild(p);

    // Браузер САМ скажет, когда анимация fadeMessage закончилась
    p.addEventListener('animationend', () => {
        if (p && p.parentNode === table) {
            p.remove(); // Полная и чистая утилизация
        }
    });
}


//-------------------------Show message-------------------------------------













