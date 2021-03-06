<?php

require_once 'conf/db.php';
require_once 'conf/auth.php';

function sendPush($message) {
    curl_setopt_array($ch = curl_init(), array(
        CURLOPT_URL => "https://api.pushover.net/1/messages.json",
        CURLOPT_POSTFIELDS => array(
            "token" => $pushover_token,
            "user" => $pushover_recipient,
            "message" => $message,
        ),
        CURLOPT_SAFE_UPLOAD => true,
        CURLOPT_RETURNTRANSFER => true,
    ));
    curl_exec($ch);
    curl_close($ch);
}

$now = new DateTime();

foreach (AFTERBANKS as $id => $account) {

    $result = $con->query("SELECT MAX(fecha) ultimo FROM MOVIMIENTO WHERE cuenta = {$id}");
    $movimiento = $result->fetch_assoc();
    $from = $movimiento['ultimo'];
    if ($from) {
        $from = DateTime::createFromFormat('Y-m-d', $from);
        $diff = $from->diff($now);
        $from->sub(new DateInterval('P3D'));
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
        $url = 'www.afterbanks.com/apiapp/getTransactions/?advSelectedAccounts=' . $account . '&page=' . $page++;
        if ($from) $url .= '&advDateFrom=' . $from->format('Y-m-d');
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('O-AUTH-TOKEN:' . $afterbanks_token));
        $transfers = json_decode(curl_exec($ch));
        curl_close($ch);
        
        if (!is_array($transfers)) {
            sendPush('Algo fue mal: ' . serialize($transfers) . ' llamando: ' . $url);
            break;
        }
        if (count($transfers) == 0) {
            break;
        } else {
            foreach ($transfers as $index => $transfer) {
                try {
                    if (!isset($categorias[$transfer->idType])) {
                        $con->query("INSERT INTO CATEGORIA (id) VALUES ({$transfer->idType})");
                        $categorias[$transfer->idType] = '';
                    }
                    $con->query("INSERT INTO MOVIMIENTO (hash, fecha, cuenta, categoria, importe, descripcion) VALUES ('{$transfer->md5}', '{$transfer->date}', {$id}, {$transfer->idType}, {$transfer->amount}, '{$transfer->description}')");
                    if ($con->affected_rows > 0) {
                        $total += $con->affected_rows;
                        $amount = number_format(abs(floatval($transfer->amount)), 2, ',', '.');
                        if (floatval($transfer->amount) < -1) {
                            sendPush('Adeudo de ' . $amount . ' ??? - ' . $transfer->description);
                        }
                        if (floatval($transfer->amount) > 1) {
                            sendPush('Abono de ' . $amount . ' ??? - ' . $transfer->description);
                        }
                    }
                } catch (Exception $e) {
                    // Intentamos con los siguientes
                }
            }
        }
    }

    // if ($total > 0) {
    //     sendPush($account . ': ' . $total . ' movimientos insertados (' . $now->format('Y-m-d H:i') . ')');
    // } else {
    //     sendPush($account . ': No se registran movimientos (' . $now->format('Y-m-d H:i') . ')');
    //     // if (isset($diff)) {
    //     //     $diff = intval($diff->format('%a'));
    //     //     if ($diff > 2) { // Los fines de semana no hay actualizaciones
    //     //         sendPush('No se registran movimientos en los ??ltimos ' . $diff . ' d??as');
    //     //     }
    //     // }
    // }
}

$ch = curl_init();
$url = 'www.afterbanks.com/apiapp/getBanks';
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('O-AUTH-TOKEN:' . $afterbanks_token));
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
