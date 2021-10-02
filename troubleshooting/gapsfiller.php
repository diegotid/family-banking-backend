<?php

require_once 'conf/db.php';
require_once 'conf/auth.php';

foreach (IBERCAJA as $id => $account) {

    $count = 0;
    for ($i = 1; $i <= 3; $i++) {

        $formHTML = file_get_contents($id . '.2021Q'. $i . '.html');
        $formHTML = str_replace('<br>', '\n', $formHTML);

        $formDOM = new DOMDocument();
        $formDOM->loadHTML($formHTML, LIBXML_NOWARNING | LIBXML_NOERROR);

        $dataTable = $formDOM->getElementById('tablaMovimientos')->getElementsByTagName('tbody')->item(0);
        
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

                $hash = md5(implode('', array_slice($mov, 1, 5)));
                $hash = substr($hash, 12)
                        . implode('', explode('/', $mov[1]))
                        . implode('', explode('/', $mov[2]));

                $amount = substr($mov[4], 0, -1);
                $amount = str_replace(array('.', ','), array('', '.'), $amount);
                $sign = substr($mov[4], -1);
                if ($sign === "-") {
                    $amount *= -1;
                }
                $result = $con->query("INSERT INTO MOVIMIENTO (hash, fecha, cuenta, importe, descripcion) VALUES ('{$hash}', '{$date}', {$id}, {$amount}, '{$mov[0]}')");
                if ($con->affected_rows > 0) {

                    $count += 1;
                }
            }
        }
    }
    echo '
' . $account . ': ' . $count . '
';
}
?>
