<?php

require_once 'conf/db.php';
require_once 'conf/auth.php';

if (isset($_GET['banco'])) $bancosel = $_GET['banco'];
if (isset($_GET['fecha'])) $fechasel = $_GET['fecha'];

if (!isset($bancosel) && !isset($fechasel)) {
    $result = $con->query("SELECT MAX(fecha) ultimo FROM MOVIMIENTO");
    $movimiento = $result->fetch_assoc();
    $from = $movimiento['ultimo'];
    if ($from) {
        $from = DateTime::createFromFormat('Y-m-d', $from);
        $from->sub(new DateInterval('P3D'));
    }
} else if (isset($fechasel) && $fechasel != 0) {
    $from = $fechasel;
}

$bancos = [];
$result = $con->query("SELECT * FROM BANCO");
while ($banco = $result->fetch_assoc()) {
    $bancos[$banco['id']] = $banco['nombre'];
}

$cuentas = [];
$result = $con->query("SELECT * FROM CUENTA");
while ($cuenta = $result->fetch_assoc()) {
    $cuentas[$cuenta['id']] = $cuenta['descripcion'];
}

$categorias = [];
$result = $con->query("SELECT * FROM CATEGORIA");
while ($categoria = $result->fetch_assoc()) {
    $categorias['' . $categoria['id']] = $categoria['nombre'];
}

$page = 1;
$total = 0;

while (true) {    
    $ch = curl_init();
    $url = 'www.afterbanks.com/apiapp/getTransactions/?advSelectedAccounts=' . (isset($bancosel) ? $bancosel : 0) . '&page=' . $page++;
    if ($from) $url .= '&advDateFrom=' . $from->format('Y-m-d');
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('O-AUTH-TOKEN:' . $token));
    $transfers = json_decode(curl_exec($ch));
    curl_close($ch);

    if (count($transfers) == 0) {
        break;
    } else {
        foreach ($transfers as $index => $transfer) {
            try {
                $cuenta = array_search($transfer->productDescription, $cuentas);
                if (!$cuenta) {
                    $banco = array_search($transfer->service, $bancos);
                    if (!$banco) {
                        $con->query("INSERT INTO BANCO (nombre, logo) VALUES ('{$transfer->service}', '{$transfer->logo}')");
                        $banco = $con->insert_id;
                        $bancos[$banco] = $transfer->service;
                    }
                    $con->query("INSERT INTO CUENTA (descripcion, banco) VALUES ('{$transfer->productDescription}', {$banco})");
                    $cuenta = $con->insert_id;
                    $cuentas[$cuenta] = $transfer->productDescription;
                }
                if (!isset($categorias[$transfer->idType])) {
                    $con->query("INSERT INTO CATEGORIA (id) VALUES ({$transfer->idType})");
                    $categorias[$transfer->idType] = '';
                }
                $con->query("INSERT INTO MOVIMIENTO (hash, fecha, cuenta, categoria, importe, descripcion) VALUES ('{$transfer->md5}', '{$transfer->date}', {$cuenta}, {$transfer->idType}, {$transfer->amount}, '{$transfer->description}')");
                if ($con->affected_rows > 0) {
                    $total += $con->affected_rows;
                }
            } catch (Exception $e) {
                // Intentamos con los siguientes
            }
        }
    }
}

echo $total . ' movimientos insertados
';

$ch = curl_init();
$url = 'www.afterbanks.com/apiapp/getBanks';
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('O-AUTH-TOKEN:' . $token));
$banks = json_decode(curl_exec($ch));
curl_close($ch);

foreach ($banks as $bank) {
    foreach ($bank->products as $product) {
        $con->query("UPDATE CUENTA SET codigo = '{$product->product}',
                                    balance = {$product->balance},
                                    color = CASE WHEN color IS NULL THEN '{$bank->color}' ELSE color END
                                    WHERE descripcion = '{$product->description}'");
    }
}

foreach ($categorias as $id => $nombre) {
    if (strlen($nombre) == 0) {
        actualizarCategorias();
        break;
    }
}

function actualizarCategorias() {
    global $con;
    $total = 0;
    $ch = curl_init();
    $url = 'www.afterbanks.com/apiapp/categories';
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    $categories = json_decode(curl_exec($ch));
    curl_close($ch);
    foreach ($categories as $id => $categorie) {
        $color = substr($categorie->color, 1);
        $con->query("UPDATE CATEGORIA SET nombre = '{$categorie->description}', color = '{$color}' WHERE id = {intval($id)}");
        if ($con->affected_rows > 0) {
            $total += $con->affected_rows;
        }
    }

    echo $total . ' categorias actualizadas
';
}
?>
