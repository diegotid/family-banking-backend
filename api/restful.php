<?php
include '../conf/db.php';
require_once 'API.class.php';

class bancaAPI extends API {

  protected function login() {

    if ($this->method == 'PUT') {
      return array('status' => 200, 'token' => $this->token);
    }
  }

  protected function cuentas() {

    global $con;
    
    if ($this->method == 'GET') {
      
      if (!isset($this->token)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $total = 0;
      $lista = [];
      
      $result = $con->query("SELECT C.id cuenta, logo, C.nombre nombre, C.color color, descripcion, balance
                            FROM CUENTA C JOIN BANCO B ON C.banco = B.id
                            ORDER BY balance - 1000000 * IF(balance < 0, balance * 1, 0) DESC");
      while ($cuenta = $result->fetch_assoc()) {
        if (!isset($cuenta['nombre'])) {
          $cuenta['nombre'] = $cuenta['descripcion'];
        }
        unset($cuenta['descripcion']);
        if (isset($cuenta['balance'])) {
          $cuenta['balance'] = round(floatval($cuenta['balance']), 2);
          $total += $cuenta['balance'];
        }
        array_push($lista, $cuenta);
      }

      $cuentas = [];
      $cuentas['total'] = $total;
      $cuentas['lista'] = $lista;
      
      return array('status' => 200, 'cuentas' => $cuentas);

    } else if ($this->method == 'PUT') {

      if (!isset($this->token)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
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

      if (!isset($this->token)) {
        return array('error' => 401, 'message' => 'Unauthorized');
      }
  
      $movimientos = [];
      
      $offset = 0;
      if (isset($this->args[0])) $offset = $this->args[0];
      $filtros = json_decode(urldecode($this->request['q']));

      $query = "SELECT fecha, importe, M.descripcion descripcion, T.id id_categoria, T.nombre nombre_categoria, C.nombre nombre_cuenta, C.codigo codigo_cuenta, C.id id_cuenta, balance, logo banco, C.color color
                FROM MOVIMIENTO M
                JOIN CUENTA C ON M.cuenta = C.id
                JOIN BANCO B ON C.banco = B.id
                JOIN CATEGORIA T ON categoria = T.id
                WHERE TRUE";
      if (isset($filtros->cuentas)) {
        $query .= " AND C.id = " . $filtros->cuentas;
      }
      if (isset($filtros->categorias)) {
        $query .= " AND T.id = " . $filtros->categorias;
      }
      $query .= " ORDER BY fecha DESC LIMIT " . $offset . ", 20";

      $result = $con->query($query);
      while ($movimiento = $result->fetch_assoc()) {
        $movimiento['importe'] = round(floatval($movimiento['importe']), 2);
        $movimiento['categoria'] = array(
          'id' => intval($movimiento['id_categoria']),
          'nombre' => $movimiento['nombre_categoria']
        );
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
        unset($movimiento['id_categoria']);
        unset($movimiento['nombre_categoria']);
        unset($movimiento['codigo_cuenta']);
        unset($movimiento['nombre_cuenta']);
        unset($movimiento['id_cuenta']);
        array_push($movimientos, $movimiento);
      }

      $resultado = [];
      $resultado['lista'] = $movimientos;

      if ($offset == 0
      && isset($filtros->categorias)) {
        $query = "SELECT SUM(importe) total, MIN(fecha) desde, MAX(fecha) hasta
                  FROM MOVIMIENTO WHERE categoria = " . $filtros->categorias;
        if (isset($filtros->cuentas)) {
          $query .= " AND cuenta = " . $filtros->cuentas;
        }
        if (isset($filtros->fechas)) {
          $query .= "";
        } else {
          $query .= " AND fecha BETWEEN (CURRENT_DATE - INTERVAL 1 MONTH) AND CURRENT_DATE";
        }
        $result = $con->query($query);
        $resultado['resumen'] = $result->fetch_assoc();
      }

      return array('status' => 200, 'movimientos' => $resultado);
    }
  }
}

$API = new bancaAPI($_REQUEST['request']);
echo $API->processAPI();
?>
