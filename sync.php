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

if (isset($_GET['banco'])) $bancosel = $_GET['banco'];
if (isset($_GET['fecha'])) $fechasel = $_GET['fecha'];

$now = new DateTime();

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

$ch = curl_init();
$url = 'https://www1.ibercajadirecto.com/ibercaja/asp/Modulodirector.Asp?IdOperacion=53_1&Entidad=2085&Canal=IBE&Dispositivo=INTR&Cuenta=20858094160330166906&FechaInicioDia=08&FechaInicioMes=01&FechaInicioAno=2021&AbonoCargo=T&MSCSAuth=' . $authKey;
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

foreach ($dataTable->childNodes as $row) {
    
    if ($row->nodeName === "tr") {

        $mov = [];
        foreach ($row->childNodes as $cell) {
            if ($cell->nodeName !== "td") {
                continue;
            }
            array_push($mov, $cell->nodeValue);
        }
        $fope = DateTime::createFromFormat('d/m/y', $mov[1]);
        if (!$fope) {
            continue;
        }
        $date = $fope->format('Y-m-d');

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

        $con->query("INSERT INTO MOVIMIENTO (hash, fecha, cuenta, importe, descripcion) VALUES ('{$hash}', '{$date}', 1, {$amount}, '{$mov[0]}')");
        if ($con->affected_rows > 0) {
            sendPush((floatval($amount) < 0 ? 'Adeudo' : 'Abono') . ' de ' . number_format(abs(floatval($amount)), 2, ',', '.') . ' € - ' . $mov[0]);
        }
    }
}
?>
