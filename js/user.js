
var midScreen = 2;

function setup() {
    var header = document.querySelector('#header');
    header.querySelector('#up').addEventListener('click', function() {
        scrollToTop();
        header.classList.remove('active');
    });
    document.querySelector('#filtros button:last-of-type').addEventListener('click', function() {
        dismissFilter();
    });
    document.querySelector('#leyenda button:last-of-type').addEventListener('click', function() {
        dismissFilter();
    });
    dismissFilter();

    var filtros = document.querySelector('#filtros');
    var confirmButton = filtros.querySelector('button:first-of-type');
    confirmButton.addEventListener('click', function() {
        loadTable(true);
        hideFilter();
    });

    var edicion = document.querySelector('#edit');
    edicion.querySelector('#save').addEventListener('click', guardarCuenta);
    edicion.querySelector('button:last-of-type').addEventListener('click', function(e) {
        showEdit(false);
    });

    var palette = document.querySelector('#palette');
    var currentColor = document.querySelector('#color');
    currentColor.addEventListener('click', function() {
        palette.classList.add('active');
    });
    var colors = document.querySelectorAll('#palette li');
    colors.forEach(function(color) {
        color.addEventListener('click', function(e) {
            var style = getComputedStyle(e.target);
            currentColor.style.backgroundColor = style.backgroundColor;
            palette.classList.remove('active');
        });
    });
}

function rgb2hex(rgb) {
    function hex(x) {    
        var hexDigits = new Array("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"); 
        return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
    }
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hideFilter() {
    document.querySelector('#filtros').classList.remove('showing');
    document.querySelector('#oscuro').classList.remove('showing');
    document.body.classList.remove('freeze');
    document.body.removeEventListener('touchmove', freeze, { passive: false });
}

function dismissFilter() {
    sessionStorage.removeItem('filtros');
    var filtros = document.querySelector('#filtros');
    filtros.querySelector('#criterios').innerHTML = '';
    filtros.querySelectorAll('button').forEach(function(boton) {
        if (boton.id != 'dismiss' && boton.id != 'save') {
            boton.remove();
        }
    });
    var posiciones = document.querySelectorAll('.posicion');
    posiciones.forEach(function(posicion) {
        posicion.innerHTML = '';
    });
    document.querySelector('#balance').classList.remove('oculto');
    document.querySelector('#leyenda').classList.remove('showing');
    hideFilter();
    loadTable(true);
}

function loadTable(init) {
    var fecha = document.querySelector('#fecha');
    var header = document.querySelector('#header');
    var loading = document.querySelector('#loading');
    var balance = document.querySelector('#balance');
    var leyenda = document.querySelector('#leyenda');
    var tabla = document.querySelector('#movimientos');
    var campos = ['fecha', 'cuenta', 'importe', 'descripcion', 'categoria'];

    var reload = (balance.querySelector('#cuentas').childElementCount > 1);
    var criterios = JSON.parse(sessionStorage.getItem('filtros'));

    if (criterios) {
        balance.classList.add('oculto');
        leyenda.classList.add('showing');
    }

    if (!reload && !criterios) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                var response = JSON.parse(request.responseText);
                response['cuentas'].forEach(function(item) {
                    var celda = document.createElement('div');
                    celda.classList.add('cuenta');
                    celda.setAttribute('color', item.color);
                    celda.id = 'c' + item.cuenta;
                    var img = document.createElement('img');
                    img.src = 'https://www.afterbanks.com/api/icons/' + item.logo + '.min.png';
                    celda.appendChild(img);
                    var nombre = document.createElement('div');
                    nombre.innerText = item.nombre;
                    nombre.style.backgroundColor = '#' + item.color;
                    celda.appendChild(nombre);
                    if (item.balance) {
                        var importe = document.createElement('div');
                        importe.innerText = item.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                        celda.appendChild(importe);
                        balance.querySelector('#cuentas').appendChild(celda);
                    } else {
                        balance.querySelector('#tarjetas').appendChild(celda);
                    }
                    celda.addEventListener('click', filtrarPorCuenta);
                });
            }
        };
        request.open('GET', 'api/cuentas/');
        request.send();
    }

    if (init && criterios) {
        var heading = leyenda.querySelector('.cuenta');
        if (heading) {
            var posiciones = document.querySelectorAll('.posicion');
            posiciones.forEach(function(posicion) {
                var pos = heading.cloneNode(true);
                pos.style.opacity = 0.15;
                posicion.innerHTML = '';
                posicion.appendChild(pos);
            });
        }
    }

    if (init) tabla.innerHTML = '';

    var requestm = new XMLHttpRequest();
    requestm.onreadystatechange = function() {
        if (requestm.readyState == 4 && requestm.status == 200) {
            var primero = true;
            var response = JSON.parse(requestm.responseText);
            response['movimientos'].forEach(function(item) {
                campos.forEach(function(campo) {
                    var celda = document.createElement('div');
                    celda.classList.add(campo);
                    celda.innerText = eval('item.' + campo);
                    if (campo == 'importe') {
                        celda.innerText = item.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                        if (item.importe > 0) {
                            celda.innerText = '+ ' + celda.innerText;
                            celda.classList.add('positive');
                        }
                        if (celda.innerText.indexOf('-') == 0) celda.innerText = celda.innerText.substring(1);
                    }
                    if (campo == 'cuenta') {
                        celda.id = 'c' + item.cuenta.id;
                        var nombre = document.createElement('p');
                        nombre.innerText = item.cuenta.nombre;
                        celda.innerText = '';
                        celda.setAttribute('color', item.cuenta.color);
                        celda.appendChild(nombre);
                        if (item.cuenta.balance) {
                            var balance = document.createElement('p');
                            balance.innerText = parseFloat(item.cuenta.balance).toLocaleString('es-ES', { minimumFractionDigits: 2 });
                            celda.appendChild(balance);
                        }
                        var logo = document.createElement('img');
                        logo.src = 'https://www.afterbanks.com/api/icons/' + item.banco + '.min.png'
                        celda.insertBefore(logo, celda.firstChild);
                        celda.addEventListener('click', filtrarPorCuenta);
                    }
                    if (campo == 'categoria') {
                        celda.id = 't' + item.categoria.id;
                        celda.innerText = item.categoria.nombre;
                    }
                    tabla.appendChild(celda);
                    if (campo == 'descripcion') {
                        if (primero) {
                            primero = false;
                            celda.classList.add('focused');
                            var cuando = new Date(celda.previousSibling.previousSibling.previousSibling.innerText);
                            fecha.innerText = formatDate(cuando, true);            
                        }
                    }
                })
            });
            loading.classList.remove('active');

            if (init) {
                scrollToTop();
            }
        }
    }
    requestm.open('GET', 'api/movimientos/' + (init ? '' : tabla.childNodes.length / 5) + '?q=' + encodeURIComponent(JSON.stringify(criterios)));
    requestm.send();
}

function scrollToTop() {
    document.removeEventListener('scroll', handleScroll);
    var start = 0;
    var balance = document.querySelector('#balance');
    if (balance && !balance.classList.contains('oculto')) {
        var cuenta = document.querySelector('#cabecera .cuenta');
        start = cuenta.getBoundingClientRect().top;
        start -= 4 * window.innerHeight / 100;
    }
    window.scroll({top: start, behaviour: 'smooth'})
    document.addEventListener('scroll', handleScroll);
}

function filtrarPorCuenta(e) {
    var cuenta = e.target;
    while (!cuenta.classList.contains('cuenta')) cuenta = cuenta.parentNode;
    var filtros = {'cuentas': cuenta.id.substring(1)};
    var sesion = sessionStorage.getItem('filtros');
    if (sesion) {
        filtros = JSON.parse(sesion);
        if (filtros.cuentas == cuenta.id.substring(1)) {
            return;
        }
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var filtros = document.querySelector('#filtros');
    var seleccion = cuenta.cloneNode(true);
    seleccion.style.opacity = 1;
    seleccion.setAttribute('color', cuenta.getAttribute('color'));
    filtros.querySelector('#criterios').appendChild(seleccion);
    var cancelButton = filtros.querySelector('button:last-of-type');
    var buttonEdit = document.createElement('button');
    buttonEdit.innerText = 'Cambiar nombre de la cuenta';
    buttonEdit.addEventListener('click', function(e) {
        showEdit(true);
    });
    filtros.insertBefore(buttonEdit, cancelButton);
    filtros.classList.add('showing');
    leyenda.classList.remove('showing');
    var criterio = cuenta.cloneNode(true);
    criterio.style.opacity = 1;
    criterio.setAttribute('color', cuenta.getAttribute('color'));
    leyenda.querySelector('#criterios').innerHTML = '';
    leyenda.querySelector('#criterios').appendChild(criterio);
    document.querySelector('#oscuro').classList.add('showing');
    document.body.classList.add('freeze');
    document.body.addEventListener('touchmove', freeze, { passive: false });
}

var freeze = function(e) {
    e.preventDefault();
}

function showEdit(show) {
    var filtros = document.querySelector('#filtros');
    var edicion = document.querySelector('#edit');
    var entrada = edicion.querySelector('#nombre');
    var color = edicion.querySelector('#color');
    if (show) {
        filtros.classList.add('hidden');
        edicion.classList.add('showing');
        entrada.placeholder = filtros.querySelector('.cuenta *:nth-child(2)').innerText;
        color.style.backgroundColor = filtros.querySelector('.cuenta').getAttribute('color');
        edicion.insertBefore(color, edicion.querySelector('button:first-of-type'));
    } else {
        filtros.classList.remove('hidden');
        edicion.classList.remove('showing');
        entrada.value = '';
        color.style.backgroundColor = 'none';
    }
}

function guardarCuenta() {
    var filtros = document.querySelector('#filtros');
    var edicion = document.querySelector('#edit');
    var entrada = edicion.querySelector('#nombre');
    var color = edicion.querySelector('#color');
    if (entrada.value.trim().length == 0) {
        entrada.value = entrada.placeholder;
    }
    var request = new XMLHttpRequest();
    var idCuenta = filtros.querySelector('.cuenta').id.substring(1);
    var style = getComputedStyle(color);
    var selectedColor = rgb2hex(style.backgroundColor).substring(1);
    request.open('PUT', 'api/cuentas/' + idCuenta + '?nombre=' + encodeURIComponent(entrada.value) + '&color=' + selectedColor);
    request.send();
    var nombres = document.querySelectorAll('.cuenta#c' + idCuenta + ' *:nth-child(2)');
    nombres.forEach(function(nombre) {
        console.log(nombre.innerHTML + ' <- ' + entrada.value);
        nombre.innerText = entrada.value;
    });
    var cuentas = document.querySelectorAll('.cuenta#c' + idCuenta);
    cuentas.forEach(function(cuenta) {
        cuenta.setAttribute('color', selectedColor);
    });
    showEdit(false);
}

function updateColor(picker) {
    var color = document.querySelector('#edit').querySelector('#color');
    color.value = picker.toHEXString();
}

function handleScroll() {

    var tabla = document.querySelector('#movimientos');
    var balance = document.querySelector('#balance');
    var loading = document.querySelector('#loading');
    var header = document.querySelector('#header');
    var fecha = document.querySelector('#fecha');

    if (!balance
    || balance.classList.contains('oculto')
    || balance.getBoundingClientRect().bottom < 0) {
        header.classList.add('active');
    } else {
        header.classList.remove('active');
    }

    if (tabla.lastChild
    && tabla.lastChild.getBoundingClientRect().bottom < window.innerHeight * 1.5) {
        if (!loading.classList.contains('active')) {
            loading.classList.add('active');
            loadTable(false);
        }
    }

    tabla.querySelectorAll('.descripcion').forEach(function(item) {
        if (item.getBoundingClientRect().top < window.innerHeight / (midScreen * 0.9)
        && item.getBoundingClientRect().top > window.innerHeight / (midScreen * 1.2)) {
            item.classList.add('focused');
            var cuando = new Date(item.previousSibling.previousSibling.previousSibling.innerText);
            fecha.innerText = formatDate(cuando, true);
            item.style.opacity =
            item.previousSibling.style.opacity =
            item.previousSibling.previousSibling.style.opacity = 1;
        } else {
            item.classList.remove('focused');
            item.style.opacity =
            item.nextSibling.style.opacity =
            item.previousSibling.style.opacity =
            item.previousSibling.previousSibling.style.opacity =
            item.getBoundingClientRect().top > window.innerHeight ? 0 :
            (item.getBoundingClientRect().top < (window.innerHeight / midScreen)
            || 2 * window.innerHeight / midScreen < item.getBoundingClientRect().top) ?
            item.getBoundingClientRect().top / (window.innerHeight / midScreen) :
            (2 * window.innerHeight / midScreen - item.getBoundingClientRect().top) / (window.innerHeight / midScreen);
        }
    })
}

function formatDate(date, onlyday) {
    var now = new Date();
    var ddd = new Date(date);
    ddd.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    var diff = Math.ceil(Math.abs(ddd.getTime() - now.getTime()) / (1000 * 3600 * 24));
    format = [];
    if (diff < 6) {
        if (diff > 1) {
            format['weekday'] = 'long';
        }
        if (onlyday != true) {
            format['hour'] = '2-digit';
            format['minute'] = '2-digit';
        }
    } else {
        format['day'] = 'numeric';
        format['month'] = 'long';
        if (diff > 180) format['year'] = 'numeric';
    }
    if (diff > 1) {
        var result = date.toLocaleDateString('es-ES', format);
    } else {
        var result = date.toLocaleTimeString('es-ES', format);        
    }
    if (onlyday === true) {
        if (diff == 0) result = 'hoy';
        if (diff == 1) result = 'ayer';
    } else {
        if (diff == 0) result = 'hoy a las ' + result;
        if (diff == 1) result = 'ayer a las ' + result;
    }
    return result;
}
