<?php
include '../conf/db.php';
require_once 'API.class.php';

class bancaAPI extends API {

  protected function cuentas() {

    global $con;
    
    if ($this->method == 'GET') {
      
      $cuentas = [];
      
      $result = $con->query("SELECT C.id cuenta, logo, C.nombre nombre, C.color color, descripcion, balance FROM CUENTA C JOIN BANCO B ON C.banco = B.id");
      while ($cuenta = $result->fetch_assoc()) {
        if (!isset($cuenta['nombre'])) {
          $cuenta['nombre'] = $cuenta['descripcion'];
        }
        unset($cuenta['descripcion']);
        if (isset($cuenta['balance'])) {
          $cuenta['balance'] = round(floatval($cuenta['balance']), 2);
        }
        array_push($cuentas, $cuenta);
      }
      
      return array('status' => 200, 'cuentas' => $cuentas);

    } else if ($this->method == 'PUT') {

      $id = $this->args[0];
      $color = $this->request['color'];
      $nombre = $this->request['nombre'];

      $con->query("UPDATE CUENTA SET nombre = '{$nombre}', color = '{$color}' WHERE id = {$id}");
      if ($con->affected_rows > 0) {
        return array('status' => 200, 'message' => 'Success');
      } else {
        return array('status' => 204, 'message' => 'No changes');
      }
    }
  }
  
  protected function movimientos() {
    
    global $con;

    if ($this->method == 'GET') {

      $movimientos = [];
      
      $offset = $this->args[0];
      if (!isset($offset)) $offset = 0;
      $filtros = json_decode(urldecode($this->request['q']));

      error_log('Filtros: ' . $filtros->cuentas);

      $query = "SELECT fecha, importe, M.descripcion descripcion, T.nombre categoria, C.nombre nombre_cuenta, C.codigo codigo_cuenta, C.id id_cuenta, balance, logo banco, C.color color
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                JOIN CATEGORIA T ON categoria = T.id";
      if (isset($filtros->cuentas)) {
        $query .= " WHERE C.id = " . $filtros->cuentas;
      }
      $query .= " ORDER BY fecha DESC LIMIT " . $offset . ", 20";

      error_log('Query: ' . $query);

      $result = $con->query($query);
      while ($movimiento = $result->fetch_assoc()) {
        $movimiento['importe'] = round(floatval($movimiento['importe']), 2);
        $movimiento['cuenta'] = array(
          'id' => intval($movimiento['id_cuenta']),
          'nombre' => $movimiento['nombre_cuenta'],
          'color' => $movimiento['color']
        );
        if ($movimiento['cuenta']['nombre'] == '') {
          $movimiento['cuenta']['nombre'] = $movimiento['codigo_cuenta'];
        }
        $movimiento['cuenta']['balance'] = $movimiento['balance'];
        unset($movimiento['color']);
        unset($movimiento['balance']);
        unset($movimiento['codigo_cuenta']);
        unset($movimiento['nombre_cuenta']);
        unset($movimiento['id_cuenta']);
        array_push($movimientos, $movimiento);
      }

      return array('status' => 200, 'movimientos' => $movimientos);
    }
  }
}

$API = new bancaAPI($_REQUEST['request']);
echo $API->processAPI();
?>
