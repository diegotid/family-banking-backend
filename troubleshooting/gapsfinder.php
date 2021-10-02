<?php

$con = new mysqli("bbdd.diegorivera.com.es", "ddb120583", ";-%j6}BfLgez", "ddb120583");
$con->set_charset('utf8');

$result = $con->query("SELECT MAX(fecha) max FROM MOVIMIENTO WHERE cuenta < 3");
$starting = $result->fetch_assoc();
$day = new DateTime($starting['max']);
$year = new DateTime();
$year->sub(new DateInterval('P1Y'));

$search = $con->prepare("SELECT COUNT(*) FROM MOVIMIENTO WHERE fecha = ? AND cuenta < 3");
while ($day > $year) {

	$day_string = $day->format('Y-m-d');
	$search->bind_param("s", $day_string);
	$search->execute();
	$search->bind_result($count);
	$search->fetch();
	if ($count == 0) {
		print($day->format('Y-m-d') . '
');
	}
	$day->sub(new DateInterval('P1D'));
}
$search->close();

// print($starting->format('Y-m-d'));
?>