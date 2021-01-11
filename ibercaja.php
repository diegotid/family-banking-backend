<?php

require_once 'conf/db.php';
require_once 'conf/auth.php';

function sendPush($message) {
    global $pushover_token;
	global $pushover_recipient;
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

$ch = curl_init();
$url = 'https://www1.ibercajadirecto.com/ibercaja/asp/Login.asp';
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
$formHTML = curl_exec($ch);
curl_close($ch);
$formDOM = new DOMDocument();
$formDOM->loadHTML($formHTML, LIBXML_NOWARNING | LIBXML_NOERROR);

$inputs = $formDOM->getElementsByTagName('input');

foreach ($inputs as $input) {
    if ($input->getAttribute('name') === "ID") {
        $formID = $input->getAttribute('value');
        break;
    }
}

$ch = curl_init();
$url = 'https://www1.ibercajadirecto.com/ibercaja/asp/Modulodirector.Asp?codidentific=9006671&f1=250499&maquina=-&IdOperacion=0001_0&Dispositivo=INTR&Canal=IBE&Idioma=ES&Entidad=2085&Entorno=ID&ValidacionPin=S&pagina=ID&EsExterno=0&ID=' . $formID;
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
$formHTML = curl_exec($ch);
curl_close($ch);

$authPos = strrpos($formHTML, "MSCSAuth");
$authKey = substr($formHTML, $authPos + 9, 250);
$authEnd = strpos($authKey, "&");
$authKey = substr($authKey, 0, $authEnd);

$now = new DateTime();

foreach (IBERCAJA as $id => $account) {

    $result = $con->query("SELECT MAX(fecha) ultimo FROM MOVIMIENTO WHERE cuenta = {$id}");
    $mov = $result->fetch_assoc();
    $from = $mov['ultimo'];
    if (!$from) $from = $now;
    $from = DateTime::createFromFormat('Y-m-d', $from);
    
    $ch = curl_init();
    $url = 'https://www1.ibercajadirecto.com/ibercaja/asp/Modulodirector.Asp?'
            . 'IdOperacion=53_1&Entidad=2085&Canal=IBE&Dispositivo=INTR&'
            . 'Cuenta=' . $account . '&'
            . 'FechaInicioDia=' . $from->format('d') . '&'
            . 'FechaInicioMes=' . $from->format('m') . '&'
            . 'FechaInicioAno=' . $from->format('Y') . '&'
            . 'AbonoCargo=T&MSCSAuth=' . $authKey;
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); 
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    $formHTML = curl_exec($ch);
    curl_close($ch);

    $formHTML = str_replace('<br>', '\n', $formHTML);
    $formDOM->loadHTML($formHTML, LIBXML_NOWARNING | LIBXML_NOERROR);

    $dataTable = $formDOM->getElementById('tablaMovimientos')->getElementsByTagName('table')->item(0);

    $total = 0;
    foreach ($dataTable->childNodes as $row) {
        
        if ($row->nodeName === "tr") {

            $mov = [];
            foreach ($row->childNodes as $cell) {
                if ($cell->nodeName !== "td") {
                    continue;
                }
                array_push($mov, $cell->nodeValue);
            }
            $fvalor = DateTime::createFromFormat('d/m/y', $mov[2]);
            if (!$fvalor) {
                continue;
            }
            $date = $fvalor->format('Y-m-d');
            $balance = str_replace(array('.', ','), array('', '.'), $mov[5]);

            $hash = md5(implode('', $mov));
            $hash = substr($hash, 12)
                    . implode('', explode('/', $mov[1]))
                    . implode('', explode('/', $mov[2]));

            $amount = substr($mov[4], 0, -1);
            $amount = str_replace(array('.', ','), array('', '.'), $amount);
            $sign = substr($mov[4], -1);
            if ($sign === "-") {
                $amount *= -1;
            }

            $con->query("INSERT INTO MOVIMIENTO (hash, fecha, cuenta, importe, descripcion) VALUES ('{$hash}', '{$date}', {$id}, {$amount}, '{$mov[0]}')");
            if ($con->affected_rows > 0) {
                $total++;
                sendPush((floatval($amount) < 0 ? 'Adeudo' : 'Abono') . ' de ' . number_format(abs(floatval($amount)), 2, ',', '.') . ' € - ' . $mov[0]);
            }
        }
    }
    $con->query("UPDATE CUENTA SET balance = {$balance} WHERE id = {$id}");
}
?>
