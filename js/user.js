
var midScreen = 2;

function auth() {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            var response = JSON.parse(request.responseText);
            window.localStorage.setItem('token', response.token);
            var login = document.querySelector('#login');
            login.classList.remove('hidden');
        }
    };
    request.open('PUT', '../api/login/'); // Llamado desde /login
    request.send();
}

function setup() {

    if (!window.localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    var header = document.querySelector('#header');
    header.querySelector('#up').addEventListener('click', function() {
        scrollToTop();
        header.classList.remove('active');
    });
    document.querySelector('#filtros button#dismiss').addEventListener('click', dismissFilter);
    document.querySelector('#leyenda button#dismiss').addEventListener('click', dismissFilter);
    document.querySelector('#leyenda button#filtrar').addEventListener('click', showFilter);
    dismissFilter();

    var filtros = document.querySelector('#filtros');
    var confirmButton = filtros.querySelector('button#save');
    confirmButton.addEventListener('click', function() {
        loadTable(true);
        hideFilter();
    });

    var edicion = document.querySelector('#edit');
    edicion.querySelector('#save').addEventListener('click', saveEdit);
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

function showFilter() {
    var filtros = document.querySelector('#filtros');
    filtros.querySelectorAll('button').forEach(function(boton) {
        if (boton.id != 'dismiss' && boton.id != 'save') {
            boton.remove();
        }
    });
    filtros.classList.add('showing');
    document.querySelector('#leyenda').classList.remove('showing');
    document.querySelector('#oscuro').classList.add('showing');
    document.body.classList.add('freeze');
    document.body.addEventListener('touchmove', freeze, { passive: false });
    filtros.querySelector('button#save').classList.add('hidden');
    var cancelButton = filtros.querySelector('button:last-of-type');
    var buttonCuenta = document.createElement('button');
    buttonCuenta.innerText = 'Filtrar por cuenta';
    buttonCuenta.id = 'cuenta';
    buttonCuenta.addEventListener('click', showCuentasFilter);
    filtros.insertBefore(buttonCuenta, cancelButton);
    var buttonCategoria = document.createElement('button');
    buttonCategoria.innerHTML = 'Filtrar por categor&iacute;a';
    buttonCategoria.id = 'categoria';
    buttonCategoria.addEventListener('click', showCategoriasFilter);
    filtros.insertBefore(buttonCategoria, cancelButton);
    var buttonFecha = document.createElement('button');
    buttonFecha.innerHTML = 'Filtrar por fechas';
    buttonFecha.id = 'fecha';
    buttonFecha.addEventListener('click', showFechasFilter);
    filtros.insertBefore(buttonFecha, cancelButton);
    var buttonImporte = document.createElement('button');
    buttonImporte.innerHTML = 'Filtrar por importe';
    buttonImporte.id = 'importe';
    buttonImporte.addEventListener('click', showImporteFilter);
    filtros.insertBefore(buttonImporte, cancelButton);
}

function showCuentasFilter() {
    var criterios = document.querySelector('#filtros #criterios');
    var cuentas = document.querySelectorAll('#cuentas div.cuenta');
    cuentas.forEach(function(cuenta) {
        var opcion = cuenta.cloneNode(true);
        opcion.addEventListener('click', filtrarPorCuenta);
        criterios.appendChild(opcion);
    });
    mostrarBotonesFiltro(false);
}

function showCategoriasFilter() {
    var filtros = JSON.parse(sessionStorage.getItem('filtros'));
    var criterios = document.querySelector('#filtros #criterios');
    var select = criterios.querySelector('select.categoria');
    if (select) select.remove();
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            var response = JSON.parse(request.responseText);
            response.categorias.lista.forEach(function(categoria) {
                if (criterios.getBoundingClientRect().top < window.innerHeight * 0.5
                || parseInt(categoria.numero) == 0) {
                    var select = criterios.querySelector('select.categoria');
                    if (!select) {
                        select = addCategoriasSelect();
                        criterios.appendChild(select);
                    }
                    var opcion = document.createElement('option');
                    opcion.value = categoria.id;
                    opcion.innerText = categoria.nombre;
                    if (categoria.numero) {
                        opcion.innerText += ' (' + categoria.numero + ')';
                        select.querySelector('optgroup:first-of-type').appendChild(opcion);
                    } else {
                        select.querySelector('optgroup:not(:first-of-type)').appendChild(opcion);
                    }
                } else {
                    var opcion = document.createElement('div');
                    opcion.className = 'categoria';
                    opcion.id = 't' + categoria.id;
                    opcion.innerHTML = categoria.nombre + '<span class=count>' + categoria.numero + '</span>';
                    criterios.appendChild(opcion);
                    opcion.addEventListener('click', filtrarPorCategoria);
                }
            });
            var select = criterios.querySelector('select.categoria');
            if (select) {
                var group = select.querySelector('optgroup');
                if (!group.hasChildNodes()) {
                    var clue = document.createElement('option');
                    clue.innerText = 'No hay movimientos';
                    clue.value = -1;
                    group.appendChild(clue);
                }
            }
            var tip = document.createElement('span');
            var primera = criterios.querySelector('div.categoria');
            var cuando = (filtros && filtros.fecha) ? 'en las fechas seleccionadas' : 'en el &uacute;ltimo mes';
            if (primera) {
                tip.innerHTML = 'de una de las siguientes categor&iacute;as con movimientos en ' + cuando;
            } else {
                tip.innerHTML = 'No hay movimientos ' + cuando + ', pero puedes seleccionar una categor&iacute;a en Otras... y despu&eacute;s seleccionar un rango de fechas';
                primera = criterios.querySelector('select');
            }
            criterios.insertBefore(tip, primera);
        }
    };
    request.open('GET', 'api/categorias?q=' + encodeURIComponent(JSON.stringify(filtros)));
    request.setRequestHeader('Authorization', localStorage.getItem('token'));
    request.send();
    mostrarBotonesFiltro(false);
}

function addCategoriasSelect() {
    var filtros = JSON.parse(sessionStorage.getItem('filtros'));
    var select = document.createElement('select');
    select.className = 'categoria';
    select.addEventListener('change', filtrarPorCategoria);
    var opcion = document.createElement('option');
    opcion.value = 0;
    opcion.innerText = 'Otras...';
    select.appendChild(opcion);
    var group = document.createElement('optgroup');
    var cuando = (filtros && filtros.fecha) ? 'las fechas seleccionadas' : 'el &uacute;ltimo mes';
    group.label = 'Con movimientos en ' + cuando;
    select.appendChild(group);
    group = document.createElement('optgroup');
    group.label = 'Sin movimientos en ' + cuando;
    select.appendChild(group);
    return select;
}

function showFechasFilter() {
    var criterios = document.querySelector('#filtros #criterios');
    var fechas = criterios.querySelector('.fechas');
    if (fechas) fechas.remove();
    fechas = document.createElement('div');
    fechas.classList.add('fechas');
    fechas.innerText = '.........';
    var hoy = new Date();
    var antes = new Date();
    antes.setMonth(antes.getMonth() - 1);
    fechas.appendChild(hojaCalendario(antes));
    fechas.appendChild(hojaCalendario(hoy));
    var categoria = criterios.querySelector('.categoria');
    if (categoria) {
        criterios.insertBefore(fechas, categoria);
    } else {
        criterios.appendChild(fechas);
    }
    mostrarBotonesFiltro(false);    
}

function showImporteFilter() {
    var criterios = document.querySelector('#filtros #criterios');
    var importe = criterios.querySelector('.importe');
    if (importe) importe.remove();
    importe = document.createElement('div');
    importe.classList.add('importe');
    var entre = document.createElement('input');
    entre.placeholder = 'Entre';
    entre.className = 'entre';
    entre.type = 'text';
    entre.addEventListener('change', cambiarImporte);
    importe.appendChild(entre);
    var entreTip = document.createElement('span');
    importe.insertBefore(entreTip, entre);
    var y = document.createElement('input');
    y.placeholder = '... y';
    y.className = 'y';
    y.type = 'text';
    y.addEventListener('change', cambiarImporte);
    importe.appendChild(y);
    var yTip = document.createElement('span');
    importe.insertBefore(yTip, y);
    var categoria = criterios.querySelector('.categoria');
    if (categoria) {
        criterios.insertBefore(importe, categoria);
    } else {
        criterios.appendChild(importe);
    }
    mostrarBotonesFiltro(false);
    entre.focus();
}

function hojaCalendario(fecha) {
    var hoja = document.createElement('div');
    hoja.classList.add('fecha');
    var mes = document.createElement('span');
    mes.innerText = fecha.toLocaleString('es-ES', { month: 'short'});
    hoja.appendChild(mes);
    var anyo = document.createElement('span');
    anyo.innerText = fecha.toLocaleString('es-ES', { year: 'numeric'});
    hoja.appendChild(anyo);
    var dia = document.createElement('span');
    if (fecha.toISOString().slice(0, 10) == new Date().toISOString().slice(0, 10)) {
        dia.innerText = 'hoy';
        dia.classList.add('hoy');
    } else {
        dia.innerText = fecha.toLocaleString('es-ES', { day: 'numeric'});
        dia.classList.remove('hoy');
    }
    hoja.appendChild(dia);
    var picker = document.createElement('input');
    picker.type = 'date';
    picker.value = fecha.toISOString().slice(0, 10);
    picker.max = new Date().toISOString().slice(0, 10);
    hoja.appendChild(picker);
    hoja.addEventListener('click', function(e) {
        picker.focus();
    });
    picker.addEventListener('change', cambiarFecha);
    return hoja;
}

function cambiarFecha(e) {
    var hoja = e.target.parentNode;
    var fecha = new Date(e.target.value);
    var desde = new Date(hoja.parentNode.querySelector('.fecha:first-of-type input').value);
    var hasta = new Date(hoja.parentNode.querySelector('.fecha:last-of-type input').value);
    var dia = hoja.querySelector('span:nth-of-type(3)');
    if (desde > hasta) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin');
        e.target.value = new Date().toISOString().slice(0, 10);
        return;
    } else if (fecha > new Date()) {
        alert('No te preocupes que aún no adivino movimientos futuros');
        e.target.value = new Date().toISOString().slice(0, 10);
        dia.innerText = 'hoy';
        dia.classList.add('hoy');
    } else if (fecha.toISOString().slice(0, 10) == new Date().toISOString().slice(0, 10)) {
        dia.innerText = 'hoy';
        dia.classList.add('hoy');
    } else {
        dia.innerText = fecha.toLocaleString('es-ES', { day: 'numeric'});
        dia.classList.remove('hoy');
    }
    hoja.querySelector('span:nth-of-type(1)').innerText = fecha.toLocaleString('es-ES', { month: 'short'});
    hoja.querySelector('span:nth-of-type(2)').innerText = fecha.toLocaleString('es-ES', { year: 'numeric'});
    filtrarPorFechas();
}

function cambiarImporte(e) {
    var importe = e.target;
    if (isNaN(importe.value)) {
        alert('Por favor, centrate!');
        importe.value = '';
        return;
    }
    filtrarPorImporte();
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
    filtros.querySelectorAll('button').forEach(function(boton) {
        if (boton.id != 'dismiss' && boton.id != 'save') {
            boton.remove();
        }
    });
    var criterios = document.querySelectorAll('#criterios');
    criterios.forEach(function(criterio) {
        criterio.innerHTML = '';
    })
    var posiciones = document.querySelectorAll('.posicion');
    posiciones.forEach(function(posicion) {
        posicion.innerHTML = '';
    });
    document.querySelector('#balance').classList.remove('oculto');
    document.querySelector('#leyenda').classList.remove('showing');
    document.querySelector('#leyenda').classList.remove('filtrando');
    hideFilter();
    loadTable(true);
}

function filtrarPorCategoria(e) {
    var categoria = e.target;
    if (categoria.nodeName == 'SELECT' && categoria.value < 0) {
        categoria.selectedIndex = 0;
        return;
    }
    var seleccionada = (categoria.nodeName == 'DIV') ? categoria.id.substring(1) : categoria.value;
    var filtros = sessionStorage.getItem('filtros');
    if (filtros) {
        filtros = JSON.parse(filtros);
        if (filtros.categoria && filtros.categoria == seleccionada) {
            return;
        } else {
            filtros.categoria = seleccionada;
        }
    } else {
        filtros = {'categoria': seleccionada};
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var criterios = document.querySelector('#filtros #criterios');
    var span = criterios.querySelector('span');
    if (span) span.remove();
    criterios.querySelectorAll('.categoria').forEach(function(criterio) {
        criterio.remove();
    });
    var seleccion = document.createElement('div');
    seleccion.id = 't' + seleccionada;
    seleccion.className = 'categoria seleccionada';
    if (categoria.nodeName == 'DIV') {
        seleccion.innerHTML = categoria.innerHTML;
        var span = seleccion.querySelector('span');
        if (span) span.remove();
    } else {
        var nombre = categoria.options[categoria.selectedIndex].innerText;
        seleccion.innerText = nombre;
        if (nombre.indexOf(' (') > 0) {
            seleccion.innerText = nombre.substring(0, nombre.lastIndexOf(' ('));
        }
    }
    criterios.appendChild(seleccion);
    e.target.remove();
    actualizarBotonesFiltro();
    var criterio = seleccion.cloneNode(true);
    criterio.style.opacity = 1;
    leyenda.querySelector('#criterios').appendChild(criterio);
}

function filtrarPorCuenta(e) {
    var cuenta = e.target;
    while (!cuenta.classList.contains('cuenta')) cuenta = cuenta.parentNode;
    var filtros = sessionStorage.getItem('filtros');
    if (filtros) {
        filtros = JSON.parse(filtros);
        if (filtros.cuenta && filtros.cuenta == cuenta.id.substring(1)) {
            return;
        } else {
            filtros.cuenta = cuenta.id.substring(1);
        }
    } else {
        filtros = {'cuenta': cuenta.id.substring(1)};
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var filtros = document.querySelector('#filtros');
    var seleccion = cuenta.cloneNode(true);
    seleccion.style.opacity = 1;
    seleccion.setAttribute('color', cuenta.getAttribute('color'));
    seleccion.classList.add('seleccionada');
    var criterios = filtros.querySelectorAll('#criterios .cuenta');
    criterios.forEach(function(criterio) {
        criterio.remove();
    });
    criterios = filtros.querySelector('#criterios');
    criterios.insertBefore(seleccion, criterios.firstChild);
    var criterio = cuenta.cloneNode(true);
    criterio.style.opacity = 1;
    criterio.setAttribute('color', cuenta.getAttribute('color'));
    var leyenda = document.querySelector('#leyenda');
    leyenda.querySelector('#criterios').appendChild(criterio);
    actualizarBotonesFiltro();
}

function filtrarPorFechas() {
    var fecha = {
        'desde': document.querySelector('#criterios .fechas div:nth-child(1) input[type=date]').value,
        'hasta': document.querySelector('#criterios .fechas div:nth-child(2) input[type=date]').value
    };
    var filtros = sessionStorage.getItem('filtros');
    if (filtros) {
        filtros = JSON.parse(filtros);
        filtros.fecha = fecha;
    } else {
        filtros = {'fecha': fecha};
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var criterio = document.querySelector('#criterios .fechas').cloneNode(true);
    var fechas = criterio.querySelectorAll('.fecha');
    fechas.forEach(function(fecha) {
        fecha.insertBefore(fecha.querySelector('span:nth-of-type(3)'), fecha.firstChild);
        if (fecha.firstChild.classList.contains('hoy')) {
            for (var i = 0; i < 2; i++) {
                fecha.querySelector('span:last-of-type').remove();
            }
        }
    });
    var ant = leyenda.querySelector('#criterios .fechas');
    if (ant) ant.remove();
    leyenda.querySelector('#criterios').appendChild(criterio);
    actualizarBotonesFiltro();
}

function filtrarPorImporte() {
    var importe = {};
    var entre = document.querySelector('#criterios .importe input:nth-of-type(1)').value;
    var entreTip = document.querySelector('#criterios .importe span:nth-of-type(1)');
    if (entre.length > 0) {
        importe.entre = entre;
        entreTip.innerHTML = 'm&aacute;s de ' + entre.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    }
    var y = document.querySelector('#criterios .importe input:nth-of-type(2)').value;
    var yTip = document.querySelector('#criterios .importe span:nth-of-type(2)');
    if (y.length > 0) {
        importe.y = y;
        yTip.innerHTML = 'menos de ' + y.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    }
    var filtros = sessionStorage.getItem('filtros');
    if (filtros) {
        filtros = JSON.parse(filtros);
        filtros.importe = importe;
    } else {
        filtros = {'importe': importe};
    }
    sessionStorage.setItem('filtros', JSON.stringify(filtros));
    var criterio = document.querySelector('#criterios .importe').cloneNode(true);
    var importes = criterio.querySelectorAll('input');
    importes.forEach(function(entrada) {
        entrada.readOnly = true;
        entrada.previousSibling.style.display = (entrada.value == 0) ? 'none' : 'inline';
    });
    var ant = leyenda.querySelector('#criterios .importe');
    if (ant) ant.remove();
    leyenda.querySelector('#criterios').appendChild(criterio);
    actualizarBotonesFiltro();
}

function mostrarBotonesFiltro(mostrar) {
    var botones = document.querySelectorAll('#filtros button:not(#dismiss)');
    botones.forEach(function(boton) {
        if (mostrar) {
            boton.classList.remove('hidden');
        } else {
            boton.classList.add('hidden');
        }
    });
    if (mostrar) {
        document.querySelector('#filtros button#dismiss').addEventListener('click', dismissFilter);
        document.querySelector('#filtros button#dismiss').removeEventListener('click', actualizarBotonesFiltro);
    } else {
        document.querySelector('#filtros button#dismiss').removeEventListener('click', dismissFilter);
        document.querySelector('#filtros button#dismiss').addEventListener('click', actualizarBotonesFiltro);
    }
}

function actualizarBotonesFiltro() {
    mostrarBotonesFiltro(true);
    var formulario = document.querySelector('#filtros');
    var filtros = JSON.parse(sessionStorage.getItem('filtros'));
    if (filtros) {
        var criterios = Object.keys(filtros);
        criterios.forEach(function(key, index) {
            var boton = formulario.querySelector('button#' + key);
            if (boton) boton.remove();
        });
        formulario.querySelector('button#save').classList.remove('hidden');
    } else {
        formulario.querySelector('button#save').classList.add('hidden');
    }
    if (criterios && criterios.length == 1
    && (criterios[0] == 'cuenta' || criterios[0] == 'categoria')) {
        var buttonEdit = document.createElement('button');
        buttonEdit.id = 'edit_button';
        buttonEdit.innerText = 'Cambiar nombre de la ' + criterios[0];
        buttonEdit.addEventListener('click', function(e) {
            showEdit(true);
        });
        var cancelButton = formulario.querySelector('button#dismiss');
        formulario.insertBefore(buttonEdit, cancelButton);
    } else {
        var buttonEdit = formulario.querySelector('button#edit_button');
        if (buttonEdit) buttonEdit.remove();
    }
    var criterios = document.querySelector('#filtros #criterios');
    if (!filtros || !filtros.cuenta) {
        var cuentas = criterios.querySelectorAll('.cuenta');
        cuentas.forEach(function(cuenta) {
            cuenta.remove();
        });
    }
    if (!filtros || !filtros.categoria) {
        var categoria = criterios.querySelector('.categoria');
        if (categoria) categoria.remove();
    }
    if (!filtros || !filtros.fecha) {
        var fechas = criterios.querySelector('.fechas');
        if (fechas) fechas.remove();
    }
    if (!filtros || !filtros.importe) {
        var importe = criterios.querySelector('.importe');
        if (importe) importe.remove();
    }
    formulario.classList.add('showing');
    var leyenda = document.querySelector('#leyenda');
    leyenda.classList.remove('showing');
    document.querySelector('#oscuro').classList.add('showing');
    document.body.classList.add('freeze');
    document.body.addEventListener('touchmove', freeze, { passive: false });
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
        leyenda.classList.add('filtrando');
    }

    if (!reload && !criterios) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
                var cuentas = balance.querySelector('#cuentas');
                var response = JSON.parse(request.responseText);
                cuentas.innerHTML = '';
                response.cuentas.lista.forEach(function(item) {
                    var celda = document.createElement('div');
                    celda.classList.add('cuenta');
                    celda.setAttribute('color', item.color);
                    celda.style.borderBottomColor = '#' + item.color;
                    celda.id = 'c' + item.cuenta;
                    var img = document.createElement('img');
                    img.src = 'https://www.afterbanks.com/api/icons/' + item.logo + '.min.png';
                    celda.appendChild(img);
                    var nombre = document.createElement('div');
                    nombre.innerText = item.nombre;
                    celda.appendChild(nombre);
                    if (item.balance != 0) {
                        var importe = document.createElement('div');
                        importe.innerText = item.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                        celda.appendChild(importe);
                    }
                    if (item.balance < 0) {
                        celda.classList.add('bankrupt');
                    }
                    celda.addEventListener('click', filtrarPorCuenta);
                    if (cuentas.childElementCount > 3) {
                        celda.classList.add('hidden');
                    }
                    cuentas.appendChild(celda);
                });
                balance.querySelector('.importe').innerText = response.cuentas.total.toLocaleString('es-ES', { minimumFractionDigits: 2 });
                balance.querySelector('#hoy').innerText = (new Date()).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            } else if (request.readyState == 4 && (request.status == 401 || request.status == 0)) {
                document.location = 'login.html';
            }
        };
        request.open('GET', 'api/cuentas/');
        request.setRequestHeader('Authorization', localStorage.getItem('token'));
        request.send();
    }

    if (init && criterios) {
        var heading = leyenda.querySelector('.cuenta');
        if (heading) {
            var posiciones = document.querySelectorAll('.posicion');
            posiciones.forEach(function(posicion) {
                var pos = heading.cloneNode(true);
                pos.style.opacity = 0.5;
                posicion.innerHTML = '';
                posicion.appendChild(pos);
            });
        }
    }

    var requestm = new XMLHttpRequest();
    requestm.onreadystatechange = function() {
        if (requestm.readyState == 4 && requestm.status == 200) {
            var primero = true;
            var response = JSON.parse(requestm.responseText);
            
            if (init && response.movimientos.lista.length == 0) {
                alert('No hay movimientos según los criterios seleccionados');
                sessionStorage.removeItem('filtros');
                dismissFilter();
                return;
            } else if (init) {
                tabla.innerHTML = '';
            }

            response.movimientos.lista.forEach(function(item) {
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
                        nombre.style.color = '#' + item.cuenta.color;
                        nombre.style.borderColor = '#' + item.cuenta.color;
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
                        if (!criterios || !criterios.cuenta) {
                            celda.addEventListener('click', filtrarPorCuenta);
                        }
                    }
                    if (campo == 'categoria') {
                        celda.id = 't' + item.categoria.id;
                        celda.innerText = item.categoria.nombre;
                        if (!criterios || !criterios.categoria) {
                            celda.addEventListener('click', filtrarPorCategoria);
                        }
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

            if (response.movimientos.resumen) {
                var saldo = document.createElement('div');
                saldo.classList.add('saldo');
                var importe = document.createElement('span');
                importe.classList.add('importe');
                var total = response.movimientos.resumen.total;
                if (!total || isNaN(total)) total = '0';
                importe.innerText = parseFloat(total).toLocaleString('es-ES', { minimumFractionDigits: 2 });
                if (response.movimientos.resumen.total > 0) {
                    importe.innerText = '+ ' + importe.innerText;
                    importe.classList.add('positive');
                }
                if (importe.innerText.indexOf('-') == 0) importe.innerText = importe.innerText.substring(1);
                saldo.appendChild(importe);
                saldo.appendChild(document.querySelector('#criterios .categoria').cloneNode(true));
                var entre = document.createElement('span');
                if (criterios.fecha) {
                    var desde = new Date(response.movimientos.resumen.desde);
                    var hasta = new Date(response.movimientos.resumen.hasta);
                    var diffm = Math.ceil(Math.abs(hasta.getTime() - desde.getTime()) / (1000 * 3600 * 24 * 365/12));
                    if (diffm > 1) {
                        entre.innerHTML = 'los &uacute;ltimos ' + diffm.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' meses';
                    } else {
                        entre.innerHTML = 'el &uacute;ltimo mes';
                    }
                } else {
                    entre.innerHTML = 'el &uacute;ltimo mes';
                }
                saldo.appendChild(entre);
                var posiciones = document.querySelectorAll('.posicion');
                posiciones.forEach(function(posicion) {
                    var cuenta = posicion.querySelector('.cuenta');
                    if (cuenta) {
                        saldo.classList.add('algomas');
                        saldo.insertBefore(cuenta, importe);
                    }
                    posicion.appendChild(saldo.cloneNode(true));
                });
            }

            if (init) {
                scrollToTop();
            }
        } else if (requestm.readyState == 4 && (requestm.status == 401 || requestm.status == 0)) {
            document.location = 'login.html';
        }
    }
    requestm.open('GET', 'api/movimientos/' + (init ? '' : tabla.childNodes.length / 5) + '?q=' + encodeURIComponent(JSON.stringify(criterios)));
    requestm.setRequestHeader('Authorization', localStorage.getItem('token'));
    requestm.send();
}

function scrollToTop() {
    document.removeEventListener('scroll', handleScroll);
    document.querySelector('#header').classList.remove('active');
    var start = 0;
    var balance = document.querySelector('#balance');
    if (balance && !balance.classList.contains('oculto')) {
        var cuenta = document.querySelector('#cabecera .cuenta:first-of-type');
        start = cuenta.getBoundingClientRect().top;
    }
    window.scroll({top: start, behaviour: 'smooth'})
    document.addEventListener('scroll', handleScroll);
}

var freeze = function(e) {
    e.preventDefault();
}

function showEdit(show) {
    var criterios = JSON.parse(sessionStorage.getItem('filtros'));
    var filtros = document.querySelector('#filtros');
    var edicion = document.querySelector('#edit');
    var entrada = edicion.querySelector('#nombre');
    var concepto = Object.keys(criterios)[0];
    var color = edicion.querySelector('#color');
    color.style.display = (concepto == 'cuenta') ? 'inline' : 'none';
    if (show) {
        edicion.querySelector('#concepto').innerText = concepto;
        filtros.classList.add('hidden');
        edicion.classList.add('showing');
        if (concepto == 'cuenta') {
            entrada.placeholder = filtros.querySelector('.' + concepto + ' *:nth-child(2)').innerText;
            color.style.backgroundColor = filtros.querySelector('.cuenta').getAttribute('color');
        } else {
            entrada.placeholder = filtros.querySelector('.' + concepto).innerText;
        }
        edicion.insertBefore(color, edicion.querySelector('button:first-of-type'));
    } else {
        filtros.classList.remove('hidden');
        edicion.classList.remove('showing');
        entrada.value = '';
        color.style.backgroundColor = 'none';
    }
}

function saveEdit() {
    var criterios = JSON.parse(sessionStorage.getItem('filtros'));
    var concepto = Object.keys(criterios)[0];
    var filtros = document.querySelector('#filtros');
    var edicion = document.querySelector('#edit');
    var entrada = edicion.querySelector('#nombre');
    if (entrada.value.trim().length == 0) {
        entrada.value = entrada.placeholder;
    }
    var request = new XMLHttpRequest();
    var id = filtros.querySelector('.' + concepto).id.substring(1);
    if (concepto == 'cuenta') {
        var color = edicion.querySelector('#color');
        var style = getComputedStyle(color);
        var selectedColor = rgb2hex(style.backgroundColor).substring(1);
        request.open('PUT', 'api/cuentas/' + id + '?nombre=' + encodeURIComponent(entrada.value) + '&color=' + selectedColor);
    } else if (concepto == 'categoria') {
        request.open('PUT', 'api/categorias/' + id + '?nombre=' + encodeURIComponent(entrada.value));
    }
    request.setRequestHeader('Authorization', localStorage.getItem('token'));
    request.send();
    var clave = '#t';
    if (concepto == 'cuenta') {
        clave = '#c';
    }
    var conceptos = document.querySelectorAll(clave + id);
    conceptos.forEach(function(item) {
        var nombre = item;
        if (concepto == 'cuenta') {
            nombre = item.querySelector('p,div:nth-child(2)');
            item.setAttribute('color', selectedColor);
            if (nombre.nodeName.toLowerCase() == 'div') {
                nombre.style.backgroundColor = '#' + selectedColor;
            } else {
                nombre.style.borderColor = '#' + selectedColor;
            }
        }
        nombre.innerText = entrada.value;
    });
    showEdit(false);
}

function updateColor(desde) {
    var color = document.querySelector('#edit').querySelector('#color');
    color.value = desde.toHEXString();
}

function handleScroll() {
    var tabla = document.querySelector('#movimientos');
    var balance = document.querySelector('#balance');
    var leyenda = document.querySelector('#leyenda');
    var loading = document.querySelector('#loading');
    var header = document.querySelector('#header');
    var fecha = document.querySelector('#fecha');

    if (document.body.scrollTop > 0
    && !document.querySelector('#filtros').classList.contains('showing')
    && (!balance || balance.classList.contains('oculto') || balance.getBoundingClientRect().bottom < 0)) {
        header.classList.add('active');
        leyenda.classList.add('showing');
    } else {
        header.classList.remove('active');
        leyenda.classList.remove('showing');
    }

    if (!document.querySelector('#filtros').classList.contains('showing')
    && tabla.lastChild && tabla.getBoundingClientRect().height > window.innerHeight * 1.5
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
